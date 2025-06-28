/* eslint-disable */
import typia, { tags } from 'typia'

// Message types - using const assertion instead of enum
export const MessageType = {
  UNKNOWN: 0,
  ADD_STRINGS: 1,
  REMOVE_STRINGS: 2,
  SEARCH: 3,
  CANCEL_SEARCH: 4,
  SEARCH_RESULTS: 5,
  SEARCH_CANCELLED: 6,
  STRINGS_ADDED: 7,
  STRINGS_REMOVED: 8,
  ERROR: 9,
  LOG: 10,
  CLEAR: 11,
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]

// Main message wrapper - field order must match protobuf exactly
export interface Message {
  /** @protobuf { type: "int32", id: 1 } */
  type: number & tags.Type<'int32'> // MessageType value
  /** @protobuf { type: "bytes", id: 2 } */
  payload: Uint8Array // bytes
}

// Search request
export interface SearchRequest {
  /** @protobuf { type: "string", id: 1 } */
  query: string
  /** @protobuf { type: "string", id: 2 } */
  search_id: string
}

// Search results
export interface SearchResults {
  /** @protobuf { type: "string", id: 1, repeated: true } */
  results: string[]
  /** @protobuf { type: "string", id: 2 } */
  search_id: string
}

// String list (for ADD_STRINGS and REMOVE_STRINGS)
export interface StringList {
  /** @protobuf { type: "string", id: 1, repeated: true } */
  strings: string[]
}

// Error message
export interface ErrorMessage {
  /** @protobuf { type: "string", id: 1 } */
  message: string
}

// Log message
export interface LogMessage {
  /** @protobuf { type: "string", id: 1 } */
  message: string
}

// Simple response (for operations that just return a count)
export interface CountResponse {
  /** @protobuf { type: "uint32", id: 1 } */
  count: number & tags.Type<'uint32'>
}

// Typia protobuf schemas with explicit configuration
export const protobuf = {
  CountResponse: typia.protobuf.createEncode<CountResponse>(),
  ErrorMessage: typia.protobuf.createEncode<ErrorMessage>(),
  LogMessage: typia.protobuf.createEncode<LogMessage>(),
  Message: typia.protobuf.createEncode<Message>(),
  SearchRequest: typia.protobuf.createEncode<SearchRequest>(),
  SearchResults: typia.protobuf.createEncode<SearchResults>(),
  StringList: typia.protobuf.createEncode<StringList>(),
}

// Typia protobuf decoders
export const protobufDecode = {
  CountResponse: typia.protobuf.createDecode<CountResponse>(),
  ErrorMessage: typia.protobuf.createDecode<ErrorMessage>(),
  LogMessage: typia.protobuf.createDecode<LogMessage>(),
  Message: typia.protobuf.createDecode<Message>(),
  SearchRequest: typia.protobuf.createDecode<SearchRequest>(),
  SearchResults: typia.protobuf.createDecode<SearchResults>(),
  StringList: typia.protobuf.createDecode<StringList>(),
}
