import {
  type Message,
  MessageType,
  protobuf,
  protobufDecode,
  type SearchRequest,
  type SearchResults,
  type StringList,
} from './protobuf/types'

class DogMap<T = unknown> {
  private map: Map<string, T>
  private searchWorker: SearchWorker

  constructor() {
    this.map = new Map()
    this.searchWorker = new SearchWorker()
  }

  async cancelSearch(searchId: string): Promise<void> {
    await this.searchWorker.cancelSearch(searchId)
  }

  async clear(): Promise<void> {
    // 1. clear the map
    this.map.clear()
    
    // 2. clear the search worker
    await this.searchWorker.clear()
  }

  destroy(): void {
    this.searchWorker.destroy()
    this.map.clear()
  }

  entries(): IterableIterator<[string, T]> {
    return this.map.entries()
  }

  get(key: string): T | undefined {
    return this.map.get(key)
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  keys(): IterableIterator<string> {
    return this.map.keys()
  }

  async keysFor(query: string): Promise<string[]> {
    return await this.searchWorker.search(query)
  }

  async remove(key: string): Promise<void> {
    // 1. remove from map
    this.map.delete(key)

    // 2. remove key from search worker
    await this.searchWorker.removeStrings([key])
  }

  async removeMultiple(keys: string[]): Promise<void> {
    // 1. remove all keys from map
    for (const key of keys) {
      this.map.delete(key)
    }

    // 2. remove all keys from search worker in a single operation
    await this.searchWorker.removeStrings(keys)
  }

  async search(query: string): Promise<T[]> {
    // 1. get map keys from search worker
    const matchingKeys = await this.searchWorker.search(query)

    // 2. return map values
    return matchingKeys
      .map(key => this.map.get(key))
      .filter((value): value is T => value !== undefined)
  }

  async set(key: string, value: T): Promise<void> {
    // Check if key already exists
    const keyExists = this.map.has(key)
    
    // 1. add to map (this will overwrite if key exists)
    this.map.set(key, value)

    // 2. add key to search worker only if it's new
    if (!keyExists) {
      await this.searchWorker.addStrings([key])
    }
  }

  async setMultiple(entries: Array<{ key: string; value: T }>): Promise<void> {
    // 1. add all entries to map and collect new keys
    const newKeys: string[] = []
    for (const { key, value } of entries) {
      const keyExists = this.map.has(key)
      this.map.set(key, value)
      
      // Only add to search worker if key is new
      if (!keyExists) {
        newKeys.push(key)
      }
    }

    // 2. add only new keys to search worker in a single operation
    if (newKeys.length > 0) {
      await this.searchWorker.addStrings(newKeys)
    }
  }

  size(): number {
    return this.map.size
  }

  values(): IterableIterator<T> {
    return this.map.values()
  }
}

class SearchWorker {
  private errorCallbacks: Map<string, (error: string) => void> = new Map()
  private messageHandlers: Map<MessageType, ((payload: unknown) => void)[]> =
    new Map()
  private searchCallbacks: Map<string, (results: string[]) => void> = new Map()
  private worker: null | Worker = null

  constructor() {
    this.initWorker()
  }

  async addStrings(strings: string[]): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const stringList: StringList = { strings }
    const addStringsMessage: Message = {
      payload: protobuf.StringList(stringList),
      type: MessageType.ADD_STRINGS,
    }

    this.worker.postMessage(addStringsMessage)
  }

  async cancelSearch(searchId: string): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    // Clean up callbacks
    this.searchCallbacks.delete(searchId)
    this.errorCallbacks.delete(searchId)

    const cancelMessage: Message = {
      payload: new Uint8Array(0), // Empty payload for cancel
      type: MessageType.CANCEL_SEARCH,
    }

    this.worker.postMessage(cancelMessage)
  }

  async clear(): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const clearMessage: Message = {
      payload: new Uint8Array(0), // Empty payload for clear
      type: MessageType.CLEAR,
    }

    this.worker.postMessage(clearMessage)
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.searchCallbacks.clear()
    this.errorCallbacks.clear()
  }

  async removeStrings(strings: string[]): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const stringList: StringList = { strings }
    const removeStringsMessage: Message = {
      payload: protobuf.StringList(stringList),
      type: MessageType.REMOVE_STRINGS,
    }

    this.worker.postMessage(removeStringsMessage)
  }

  async search(query: string): Promise<string[]> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    return new Promise((resolve, reject) => {
      this.searchCallbacks.set(query, resolve)
      this.errorCallbacks.set(query, reject)

      const searchRequest: SearchRequest = {
        query,
        search_id: query,
      }

      const searchMessage: Message = {
        payload: protobuf.SearchRequest(searchRequest),
        type: MessageType.SEARCH,
      }

      this.worker!.postMessage(searchMessage)
    })
  }

  private handleWorkerMessage(e: MessageEvent) {
    const messageData = e.data

    if (
      messageData &&
      typeof messageData === 'object' &&
      'type' in messageData &&
      'payload' in messageData
    ) {
      const message: Message = messageData
      const { payload, type } = message

      switch (type) {
        case MessageType.ERROR: {
          const errorMessage = protobufDecode.ErrorMessage(payload)
          console.error('Worker reported error:', errorMessage.message)
          break
        }
        case MessageType.LOG: {
          const logMessage = protobufDecode.LogMessage(payload)
          console.log('Worker log:', logMessage.message)
          break
        }
        case MessageType.SEARCH_CANCELLED:
          // Search was cancelled, clean up callbacks
          break
        case MessageType.SEARCH_RESULTS: {
          const searchResults: SearchResults =
            protobufDecode.SearchResults(payload)
          const callback = this.searchCallbacks.get(searchResults.search_id)
          if (callback) {
            callback(searchResults.results)
            this.searchCallbacks.delete(searchResults.search_id)
          }
          break
        }
        case MessageType.STRINGS_ADDED: {
          const countResponse = protobufDecode.CountResponse(payload)
          console.log('Worker confirmed strings added:', countResponse.count)
          break
        }
      }
    } else if (messageData instanceof Uint8Array) {
      try {
        const message: Message = protobufDecode.Message(messageData)
        this.handleWorkerMessage({ data: message } as MessageEvent)
      } catch (error) {
        console.error('Failed to decode protobuf message:', error)
      }
    }
  }

  private async initWorker() {
    try {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      })

      this.worker.onmessage = (e: MessageEvent) => {
        this.handleWorkerMessage(e)
      }

      this.worker.onerror = (error: ErrorEvent) => {
        console.error('Worker error:', error)
      }
    } catch (error) {
      console.error('Failed to initialize worker:', error)
    }
  }
}

export default DogMap
