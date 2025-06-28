// Immediate logging to verify script execution
self.postMessage({ payload: 'Worker script loaded', type: 'LOG' })

let worker = null

async function initWorker() {
  try {
    self.postMessage({ payload: 'Starting WASM initialization', type: 'LOG' })

    // Try to load the WASM module
    const wasmModule = await import('./pkg/search_worker.js')
    self.postMessage({ payload: 'WASM module imported', type: 'LOG' })

    // Initialize the WASM module
    await wasmModule.default()
    self.postMessage({ payload: 'WASM initialized', type: 'LOG' })

    // Create the worker instance
    worker = new wasmModule.SearchWorker()
    self.postMessage({ payload: 'SearchWorker created', type: 'LOG' })

    self.onmessage = event => {
      self.postMessage({
        payload: `Received message: ${JSON.stringify(event.data)}`,
        type: 'LOG',
      })
      try {
        worker.handle_message(event)
      } catch (error) {
        self.postMessage({
          payload: `Error handling message: ${error.message}`,
          type: 'ERROR',
        })
      }
    }

    self.postMessage({ payload: 'Worker initialization complete', type: 'LOG' })
  } catch (error) {
    self.postMessage({
      payload: `Failed to initialize: ${error.message}\nStack: ${error.stack}`,
      type: 'ERROR',
    })
  }
}

initWorker()
