console.log('=== WORKER FILE LOADING ===')

import {
  type Message,
  MessageType,
  protobuf,
  protobufDecode,
} from './protobuf/types'
import init, { SearchWorker } from './wasm/search_worker.js'

let worker: null | SearchWorker = null
const messageQueue: MessageEvent[] = []

// Create a MessageChannel to handle WASM messages
const messageChannel = new MessageChannel()

// Helper function to encode a number as protobuf varint
function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = []
  let num = value

  while (num >= 0x80) {
    bytes.push((num & 0x7f) | 0x80)
    num >>>= 7
  }
  bytes.push(num & 0x7f)

  return new Uint8Array(bytes)
}

function handleIncomingMessage(data: {
  payload: Uint8Array
  type: MessageType
}): void {
  const message: Message = { payload: data.payload, type: data.type }

  try {
    const encodedMessage = protobuf.Message(message)
    console.log(
      'Typia encoded first 10 bytes:',
      Array.from(encodedMessage.slice(0, 10))
    )

    // Check if Typia encoded correctly (should start with 8 for field 1 varint)
    if (encodedMessage[0] !== 8) {
      console.warn(
        'Typia encoded field 1 as length-delimited instead of varint, using manual encoding'
      )
      const manualEncoded = manualProtobufEncode(message)
      console.log(
        'Manual encoded first 10 bytes:',
        Array.from(manualEncoded.slice(0, 10))
      )
      worker!.handle_message(manualEncoded)
    } else {
      worker!.handle_message(encodedMessage)
    }
  } catch (error) {
    console.error('Typia encoding failed, using manual encoding:', error)
    const manualEncoded = manualProtobufEncode(message)
    worker!.handle_message(manualEncoded)
  }
}

function handleWorkerMessage(event: MessageEvent): void {
  console.log(
    'Worker received message:',
    event.data,
    'type:',
    typeof event.data
  )

  // Check if this is a message from the main thread (has type and payload properties)
  // or from the WASM (is a Uint8Array)
  if (
    event.data &&
    typeof event.data === 'object' &&
    'type' in event.data &&
    'payload' in event.data
  ) {
    // This is a message from the main thread to send to WASM
    console.log('Processing message from main thread to WASM')
    try {
      handleIncomingMessage(event.data)
    } catch (error) {
      console.error('Worker error in onmessage:', error)
      const errorMessage = protobuf.ErrorMessage({
        message: 'Error: ' + (error as Error).message,
      })
      const errorMsg: Message = {
        payload: errorMessage,
        type: MessageType.ERROR,
      }
      const encodedError = protobuf.Message(errorMsg)
      self.postMessage(encodedError, { transfer: [encodedError.buffer] })
    }
  } else if (event.data instanceof Uint8Array) {
    // This is a message from the WASM to forward to main thread
    console.log('Processing message from WASM to main thread')
    console.log(
      'WASM message first 10 bytes:',
      Array.from(event.data.slice(0, 10))
    )

    // Try to decode with Typia first to see what's wrong
    try {
      const decodedMessage = protobufDecode.Message(event.data)
      console.log('✅ Typia decode successful:', decodedMessage)

      // Forward the decoded message to the main thread
      self.postMessage(decodedMessage)
    } catch (error) {
      console.error('❌ Typia decode failed:', error)
      console.log('WASM message structure analysis:')
      console.log('First byte (field 1 tag):', event.data[0])
      console.log('Second byte (field 1 value):', event.data[1])
      console.log('Third byte (field 2 tag):', event.data[2])

      // If Typia decode fails, forward the raw bytes as fallback
      self.postMessage(event.data, { transfer: [event.data.buffer] })
    }
  } else {
    console.log('Unknown message format:', event.data)
  }
}

async function initWorker(): Promise<void> {
  try {
    await init()
    worker = new SearchWorker()

    // Set up the message handler for both directions
    self.onmessage = handleWorkerMessage

    // Set up MessageChannel port to handle WASM messages
    messageChannel.port1.onmessage = event => {
      console.log('MessageChannel received WASM message:', event.data)
      if (event.data instanceof Uint8Array) {
        // This is a message from the WASM
        console.log('Processing WASM message via MessageChannel')
        console.log(
          'WASM message first 10 bytes:',
          Array.from(event.data.slice(0, 10))
        )

        // Try to decode with Typia first to see what's wrong
        try {
          const decodedMessage = protobufDecode.Message(event.data)
          console.log('✅ Typia decode successful:', decodedMessage)

          // Forward the decoded message to the main thread
          self.postMessage(decodedMessage)
        } catch (error) {
          console.error('❌ Typia decode failed:', error)
          console.log('WASM message structure analysis:')
          console.log('First byte (field 1 tag):', event.data[0])
          console.log('Second byte (field 1 value):', event.data[1])
          console.log('Third byte (field 2 tag):', event.data[2])

          // If Typia decode fails, forward the raw bytes as fallback
          self.postMessage(event.data, { transfer: [event.data.buffer] })
        }
      }
    }

    // Process any queued messages
    while (messageQueue.length > 0) {
      const event = messageQueue.shift()!
      try {
        handleIncomingMessage(event.data)
      } catch (error) {
        console.error('Error processing queued message:', error)
        const errorMessage = protobuf.ErrorMessage({
          message:
            'Error processing queued message: ' + (error as Error).message,
        })
        const errorMsg: Message = {
          payload: errorMessage,
          type: MessageType.ERROR,
        }
        const encodedError = protobuf.Message(errorMsg)
        self.postMessage(encodedError, { transfer: [encodedError.buffer] })
      }
    }
  } catch (error) {
    console.error('Failed to initialize worker:', error)
    const errorMessage = protobuf.ErrorMessage({
      message: 'Failed to initialize: ' + (error as Error).message,
    })
    const errorMsg: Message = { payload: errorMessage, type: MessageType.ERROR }
    const encodedError = protobuf.Message(errorMsg)
    self.postMessage(encodedError, { transfer: [encodedError.buffer] })
  }
}

// Manual protobuf encoder as fallback
function manualProtobufEncode(message: Message): Uint8Array {
  // Field 1: type (varint)
  const typeVarint = encodeVarint(message.type)
  const field1Tag = 8 // field 1, wire type 0 (varint)

  // Field 2: payload (length-delimited)
  const payloadLength = encodeVarint(message.payload.length)
  const field2Tag = 18 // field 2, wire type 2 (length-delimited)

  // Combine all parts
  const totalLength =
    1 + typeVarint.length + 1 + payloadLength.length + message.payload.length
  const encoded = new Uint8Array(totalLength)

  let offset = 0
  encoded[offset++] = field1Tag
  encoded.set(typeVarint, offset)
  offset += typeVarint.length
  encoded[offset++] = field2Tag
  encoded.set(payloadLength, offset)
  offset += payloadLength.length
  encoded.set(message.payload, offset)

  return encoded
}

// Queue messages until WASM is initialized
self.onmessage = (event: MessageEvent) => {
  if (!worker) {
    messageQueue.push(event)
  } else {
    handleWorkerMessage(event)
  }
}

initWorker()
