use wasm_bindgen::prelude::*;
use web_sys::{DedicatedWorkerGlobalScope, console};
use wasm_bindgen::JsCast;
use wasm_bindgen::closure::Closure;
use prost::Message as ProstMessage;

// Include the generated protobuf code
include!(concat!(env!("OUT_DIR"), "/search.rs"));

#[wasm_bindgen]
pub struct SearchWorker {
    searchable_strings: Vec<String>,
    current_search_timeout: Option<i32>,
}

#[wasm_bindgen]
impl SearchWorker {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console::log_1(&"SearchWorker initialized".into());
        SearchWorker {
            searchable_strings: Vec::new(),
            current_search_timeout: None,
        }
    }

    #[wasm_bindgen]
    pub fn handle_message(&mut self, message_data: &[u8]) {
        console::log_1(&format!("WASM received message data of length: {}", message_data.len()).into());
        console::log_1(&format!("WASM message data first 10 bytes: {:?}", &message_data[..std::cmp::min(10, message_data.len())]).into());
        
        // Decode the protobuf message
        let message = match Message::decode(message_data) {
            Ok(msg) => {
                console::log_1(&format!("WASM successfully decoded message of type: {:?}", msg.r#type()).into());
                msg
            },
            Err(e) => {
                console::error_1(&format!("Failed to decode message: {}", e).into());
                console::error_1(&format!("Message data length: {}", message_data.len()).into());
                console::error_1(&format!("First 20 bytes: {:?}", &message_data[..std::cmp::min(20, message_data.len())]).into());
                return;
            }
        };

        match message.r#type() {
            MessageType::AddStrings => {
                let string_list = match StringList::decode(message.payload.as_slice()) {
                    Ok(list) => list,
                    Err(e) => {
                        console::error_1(&format!("Failed to decode StringList: {}", e).into());
                        return;
                    }
                };
                
                console::log_1(&format!("Adding {} strings to searchable list", string_list.strings.len()).into());
                if !string_list.strings.is_empty() {
                    console::log_1(&format!("First few strings: {:?}", &string_list.strings[..std::cmp::min(5, string_list.strings.len())]).into());
                }
                self.searchable_strings.extend(string_list.strings);
                console::log_1(&format!("Total searchable strings: {}", self.searchable_strings.len()).into());
                
                let count_response = CountResponse {
                    count: self.searchable_strings.len() as u32,
                };
                self.post_protobuf_message(MessageType::StringsAdded, &count_response);
            }
            MessageType::RemoveStrings => {
                let string_list = match StringList::decode(message.payload.as_slice()) {
                    Ok(list) => list,
                    Err(e) => {
                        console::error_1(&format!("Failed to decode StringList: {}", e).into());
                        return;
                    }
                };
                
                self.searchable_strings.retain(|s| !string_list.strings.contains(s));
                let count_response = CountResponse {
                    count: self.searchable_strings.len() as u32,
                };
                self.post_protobuf_message(MessageType::StringsRemoved, &count_response);
            }
            MessageType::Search => {
                if let Some(timeout) = self.current_search_timeout {
                    let worker_scope: DedicatedWorkerGlobalScope = js_sys::global().unchecked_into();
                    worker_scope.clear_timeout_with_handle(timeout);
                }
                
                let search_request = match SearchRequest::decode(message.payload.as_slice()) {
                    Ok(req) => req,
                    Err(e) => {
                        console::error_1(&format!("Failed to decode SearchRequest: {}", e).into());
                        return;
                    }
                };
                
                let query = search_request.query.to_lowercase();
                let search_id = if search_request.search_id.is_empty() {
                    query.clone()
                } else {
                    search_request.search_id
                };
                
                console::log_1(&format!("Searching for '{}' in {} strings", query, self.searchable_strings.len()).into());
                let worker = self.clone();
                let closure = Closure::once_into_js(Box::new(move || {
                    console::log_1(&format!("Starting search with query: '{}'", query).into());
                    console::log_1(&format!("Number of searchable strings: {}", worker.searchable_strings.len()).into());
                    
                    let results: Vec<String> = worker.searchable_strings
                        .iter()
                        .filter(|s| {
                            let contains = s.to_lowercase().contains(&query);
                            if contains {
                                console::log_1(&format!("Found match: '{}' contains '{}'", s, query).into());
                            }
                            contains
                        })
                        .cloned()
                        .collect();
                    
                    console::log_1(&format!("Found {} results for '{}'", results.len(), query).into());
                    let search_results = SearchResults {
                        results,
                        search_id: search_id.clone(),
                    };
                    worker.post_protobuf_message(MessageType::SearchResults, &search_results);
                }) as Box<dyn FnOnce()>);
                
                let worker_scope: DedicatedWorkerGlobalScope = js_sys::global().unchecked_into();
                match worker_scope.set_timeout_with_callback_and_timeout_and_arguments_0(
                    closure.as_ref().unchecked_ref(),
                    100,
                ) {
                    Ok(timeout_id) => {
                        self.current_search_timeout = Some(timeout_id);
                    }
                    Err(e) => {
                        console::error_1(&format!("Failed to set timeout: {:?}", e).into());
                        let error_msg = ErrorMessage {
                            message: format!("Failed to set timeout: {:?}", e),
                        };
                        self.post_protobuf_message(MessageType::Error, &error_msg);
                    }
                }
            }
            MessageType::CancelSearch => {
                if let Some(timeout) = self.current_search_timeout {
                    let worker_scope: DedicatedWorkerGlobalScope = js_sys::global().unchecked_into();
                    worker_scope.clear_timeout_with_handle(timeout);
                    self.current_search_timeout = None;
                    self.post_protobuf_message(MessageType::SearchCancelled, &());
                }
            }
            MessageType::Clear => {
                console::log_1(&"Clearing all searchable strings".into());
                self.searchable_strings.clear();
                let count_response = CountResponse {
                    count: 0,
                };
                self.post_protobuf_message(MessageType::StringsRemoved, &count_response);
            }
            _ => {
                console::log_1(&format!("Unknown message type: {:?}", message.r#type()).into());
            }
        }
    }

    fn post_protobuf_message<T: ProstMessage>(&self, message_type: MessageType, payload: &T) {
        console::log_1(&format!("WASM sending message of type: {:?} (value: {})", message_type, message_type as i32).into());
        
        // Encode the payload
        let encoded_payload = T::encode_to_vec(payload);
        
        // Create the message wrapper
        let message = Message {
            r#type: message_type as i32,
            payload: encoded_payload,
        };
        
        // Encode the full message
        let encoded_message = Message::encode_to_vec(&message);
        
        console::log_1(&format!("WASM encoded message length: {}", encoded_message.len()).into());
        console::log_1(&format!("WASM encoded message first 10 bytes: {:?}", &encoded_message[..std::cmp::min(10, encoded_message.len())]).into());
        console::log_1(&format!("WASM encoded message all bytes: {:?}", encoded_message).into());
        
        // Create a new Uint8Array with copied data instead of a view
        // This ensures the memory persists until JavaScript reads it
        let uint8_array = js_sys::Uint8Array::new_with_length(encoded_message.len() as u32);
        uint8_array.copy_from(&encoded_message);
        
        // Try to post to the worker scope using self
        console::log_1(&"WASM about to post message using self".into());
        
        // Use a JavaScript function to post the message
        let js_post_message = js_sys::Function::new_no_args("return self.postMessage(arguments[0]);");
        match js_post_message.call1(&js_sys::global(), &uint8_array) {
            Ok(_) => console::log_1(&"WASM successfully posted message using self".into()),
            Err(e) => {
                console::error_1(&format!("WASM failed to post message using self: {:?}", e).into());
                // Fallback to global scope
                let worker_scope: DedicatedWorkerGlobalScope = js_sys::global().unchecked_into();
                match worker_scope.post_message(&uint8_array) {
                    Ok(_) => console::log_1(&"WASM successfully posted message to global scope".into()),
                    Err(e2) => console::error_1(&format!("WASM failed to post message to global scope: {:?}", e2).into()),
                }
            }
        }
    }
}

impl Clone for SearchWorker {
    fn clone(&self) -> Self {
        SearchWorker {
            searchable_strings: self.searchable_strings.clone(),
            current_search_timeout: None,
        }
    }
}

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}

