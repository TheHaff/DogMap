import { describe, expect, it } from 'vitest'

import DogMap from './dogMap'

// Mock Worker for testing - now thread-safe with isolated instances
class MockWorker {
  onerror: ((error: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  private instanceId: string
  private searchableStrings: string[] = []

  constructor() {
    // Create unique instance ID to prevent cross-test interference
    this.instanceId = Math.random().toString(36).substring(7)
  }

  postMessage(data: unknown) {
    // Mock implementation that handles different message types
    if (data && typeof data === 'object' && 'payload' in data && 'type' in data) {
      const message = data as { payload: Uint8Array; type: number }
      
      switch (message.type) {
        case 1: { // ADD_STRINGS
          // Extract strings from protobuf payload (simplified)
          const addStrings = this.extractStringsFromPayload(message.payload)
          this.searchableStrings.push(...addStrings)
          break
        }
        case 2: { // REMOVE_STRINGS
          // Extract strings from protobuf payload (simplified)
          const removeStrings = this.extractStringsFromPayload(message.payload)
          this.searchableStrings = this.searchableStrings.filter(
            s => !removeStrings.includes(s)
          )
          break
        }
        case 3: { // SEARCH
          // Extract query from protobuf payload (simplified)
          const query = this.extractQueryFromPayload(message.payload)
          const results = this.searchableStrings.filter(s => 
            s.toLowerCase().includes(query.toLowerCase())
          )
          
          // Simulate async response
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  payload: this.createSearchResultsPayload(results, query),
                  type: 5, // SEARCH_RESULTS
                }
              } as MessageEvent)
            }
          }, 10)
          break
        }
        case 11: { // CLEAR
          this.searchableStrings = []
          break
        }
      }
    }
  }

  terminate() {
    this.searchableStrings = []
  }

  // Helper methods to extract data from protobuf payloads (simplified)
  private createSearchResultsPayload(results: string[], searchId: string): Uint8Array {
    // Simplified protobuf encoding for SearchResults
    const encoder = new TextEncoder()
    const resultsBytes = results.map(r => encoder.encode(r))
    const searchIdBytes = encoder.encode(searchId)
    
    // Calculate total length
    let totalLength = 0
    resultsBytes.forEach(r => {
      totalLength += 1 + 1 + r.length // field tag + length + string
    })
    totalLength += 1 + 1 + searchIdBytes.length // search_id field
    
    const payload = new Uint8Array(totalLength)
    let offset = 0
    
    // Encode results
    resultsBytes.forEach(r => {
      payload[offset++] = 10 // field 1, wire type 2
      payload[offset++] = r.length
      payload.set(r, offset)
      offset += r.length
    })
    
    // Encode search_id
    payload[offset++] = 18 // field 2, wire type 2
    payload[offset++] = searchIdBytes.length
    payload.set(searchIdBytes, offset)
    
    return payload
  }

  private extractQueryFromPayload(payload: Uint8Array): string {
    // Simplified protobuf decoding for SearchRequest
    let i = 0
    while (i < payload.length) {
      if (payload[i] === 10) { // field 1, wire type 2 (length-delimited)
        i++
        const length = payload[i]
        i++
        return new TextDecoder().decode(payload.slice(i, i + length))
      } else {
        i++
      }
    }
    return ''
  }

  private extractStringsFromPayload(payload: Uint8Array): string[] {
    // Simplified protobuf decoding for StringList
    const strings: string[] = []
    let i = 0
    while (i < payload.length) {
      if (payload[i] === 10) { // field 1, wire type 2 (length-delimited)
        i++
        const length = payload[i]
        i++
        const string = new TextDecoder().decode(payload.slice(i, i + length))
        strings.push(string)
        i += length
      } else {
        i++
      }
    }
    return strings
  }
}

// Mock the global Worker constructor
global.Worker = MockWorker as unknown as typeof Worker

describe('DogMap', () => {
  // Remove shared dogMap instance - each test will create its own

  describe('Basic Map Operations', () => {
    it('should initialize with empty map', async () => {
      const dogMap = new DogMap<string>()
      
      expect(dogMap.size()).toBe(0)
      expect(dogMap.has('test')).toBe(false)
      expect(dogMap.get('test')).toBeUndefined()
      
      dogMap.destroy()
    })

    it('should set and get a single value', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('key1', 'value1')

      expect(dogMap.has('key1')).toBe(true)
      expect(dogMap.get('key1')).toBe('value1')
      expect(dogMap.size()).toBe(1)
      
      dogMap.destroy()
    })

    it('should overwrite existing key', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('key1', 'value1')
      await dogMap.set('key1', 'value2')

      expect(dogMap.get('key1')).toBe('value2')
      expect(dogMap.size()).toBe(1)
      
      dogMap.destroy()
    })

    it('should set multiple values', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ])

      expect(dogMap.size()).toBe(3)
      expect(dogMap.get('key1')).toBe('value1')
      expect(dogMap.get('key2')).toBe('value2')
      expect(dogMap.get('key3')).toBe('value3')
      
      dogMap.destroy()
    })

    it('should handle duplicate keys in setMultiple', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('key1', 'value1')

      await dogMap.setMultiple([
        { key: 'key1', value: 'updated' },
        { key: 'key2', value: 'value2' },
      ])

      expect(dogMap.size()).toBe(2)
      expect(dogMap.get('key1')).toBe('updated')
      expect(dogMap.get('key2')).toBe('value2')
      
      dogMap.destroy()
    })

    it('should remove a single key', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('key1', 'value1')
      await dogMap.set('key2', 'value2')

      await dogMap.remove('key1')

      expect(dogMap.has('key1')).toBe(false)
      expect(dogMap.get('key1')).toBeUndefined()
      expect(dogMap.has('key2')).toBe(true)
      expect(dogMap.size()).toBe(1)
      
      dogMap.destroy()
    })

    it('should remove multiple keys', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ])

      await dogMap.removeMultiple(['key1', 'key3'])

      expect(dogMap.has('key1')).toBe(false)
      expect(dogMap.has('key2')).toBe(true)
      expect(dogMap.has('key3')).toBe(false)
      expect(dogMap.size()).toBe(1)
      
      dogMap.destroy()
    })

    it('should clear all entries', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ])

      await dogMap.clear()

      expect(dogMap.size()).toBe(0)
      expect(dogMap.has('key1')).toBe(false)
      expect(dogMap.has('key2')).toBe(false)
      
      dogMap.destroy()
    })
  })

  describe('Iteration Methods', () => {
    it('should iterate over entries', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ])

      const entries = Array.from(dogMap.entries())
      expect(entries).toHaveLength(3)
      expect(entries).toContainEqual(['key1', 'value1'])
      expect(entries).toContainEqual(['key2', 'value2'])
      expect(entries).toContainEqual(['key3', 'value3'])
      
      dogMap.destroy()
    })

    it('should iterate over keys', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ])

      const keys = Array.from(dogMap.keys())
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
      
      dogMap.destroy()
    })

    it('should iterate over values', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ])

      const values = Array.from(dogMap.values())
      expect(values).toHaveLength(3)
      expect(values).toContain('value1')
      expect(values).toContain('value2')
      expect(values).toContain('value3')
      
      dogMap.destroy()
    })
  })

  describe('Search Operations', () => {
    it('should search for keys and return values', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'apple', value: 'fruit' },
        { key: 'banana', value: 'fruit' },
        { key: 'carrot', value: 'vegetable' },
        { key: 'dog', value: 'animal' },
        { key: 'cat', value: 'animal' },
      ])

      const results = await dogMap.search('app')
      expect(results).toHaveLength(1)
      expect(results).toContain('fruit')

      const results2 = await dogMap.search('ban')
      expect(results2).toHaveLength(1)
      expect(results2).toContain('fruit')
      
      dogMap.destroy()
    })

    it('should search for partial matches', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'apple', value: 'fruit' },
        { key: 'banana', value: 'fruit' },
        { key: 'carrot', value: 'vegetable' },
        { key: 'dog', value: 'animal' },
        { key: 'cat', value: 'animal' },
      ])

      const results = await dogMap.search('a')

      expect(results.length).toBeGreaterThan(0)
      expect(results).toContain('fruit')
      expect(results).toContain('animal')
      
      dogMap.destroy()
    })

    it('should return empty array for no matches', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'apple', value: 'fruit' },
        { key: 'banana', value: 'fruit' },
        { key: 'carrot', value: 'vegetable' },
        { key: 'dog', value: 'animal' },
        { key: 'cat', value: 'animal' },
      ])

      const results = await dogMap.search('xyz')

      expect(results).toHaveLength(0)
      
      dogMap.destroy()
    })

    it('should search for keys directly', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.setMultiple([
        { key: 'apple', value: 'fruit' },
        { key: 'banana', value: 'fruit' },
        { key: 'carrot', value: 'vegetable' },
        { key: 'dog', value: 'animal' },
        { key: 'cat', value: 'animal' },
      ])

      const keys = await dogMap.keysFor('a')

      expect(keys.length).toBeGreaterThan(0)
      expect(keys).toContain('apple')
      expect(keys).toContain('banana')
      expect(keys).toContain('carrot')
      
      dogMap.destroy()
    })
  })

  describe('Error Handling', () => {
    it('should handle removing non-existent key gracefully', async () => {
      const dogMap = new DogMap<string>()
      
      await expect(dogMap.remove('non-existent')).resolves.not.toThrow()
      expect(dogMap.size()).toBe(0)
      
      dogMap.destroy()
    })

    it('should handle removing multiple non-existent keys', async () => {
      const dogMap = new DogMap<string>()
      
      await expect(
        dogMap.removeMultiple(['key1', 'key2'])
      ).resolves.not.toThrow()
      expect(dogMap.size()).toBe(0)
      
      dogMap.destroy()
    })

    it('should handle mixed existing and non-existing keys in removeMultiple', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('key1', 'value1')

      await dogMap.removeMultiple(['key1', 'non-existent'])

      expect(dogMap.has('key1')).toBe(false)
      expect(dogMap.size()).toBe(0)
      
      dogMap.destroy()
    })
  })

  describe('Type Safety', () => {
    it('should work with different value types', async () => {
      const numberMap = new DogMap<number>()

      await numberMap.set('one', 1)
      await numberMap.set('two', 2)

      expect(numberMap.get('one')).toBe(1)
      expect(numberMap.get('two')).toBe(2)

      numberMap.destroy()
    })

    it('should work with object values', async () => {
      const objectMap = new DogMap<{ age: number; name: string }>()

      await objectMap.set('person1', { age: 30, name: 'Alice' })
      await objectMap.set('person2', { age: 25, name: 'Bob' })

      expect(objectMap.get('person1')).toEqual({ age: 30, name: 'Alice' })
      expect(objectMap.get('person2')).toEqual({ age: 25, name: 'Bob' })

      objectMap.destroy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string keys', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('', 'empty key value')

      expect(dogMap.has('')).toBe(true)
      expect(dogMap.get('')).toBe('empty key value')
      
      dogMap.destroy()
    })

    it('should handle empty string values', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('key1', '')

      expect(dogMap.get('key1')).toBe('')
      
      dogMap.destroy()
    })

    it('should handle special characters in keys', async () => {
      const dogMap = new DogMap<string>()
      
      const specialKey = 'key-with-special-chars!@#$%^&*()'
      await dogMap.set(specialKey, 'special value')

      expect(dogMap.get(specialKey)).toBe('special value')
      
      dogMap.destroy()
    })

    it('should handle unicode characters', async () => {
      const dogMap = new DogMap<string>()
      
      const unicodeKey = 'café-ñáño'
      const unicodeValue = 'café-ñáño-value'

      await dogMap.set(unicodeKey, unicodeValue)

      expect(dogMap.get(unicodeKey)).toBe(unicodeValue)
      
      dogMap.destroy()
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large number of entries', async () => {
      const dogMap = new DogMap<string>()
      
      const entries = Array.from({ length: 1000 }, (_, i) => ({
        key: `key${i}`,
        value: `value${i}`,
      }))

      await dogMap.setMultiple(entries)

      expect(dogMap.size()).toBe(1000)
      expect(dogMap.get('key500')).toBe('value500')
      
      dogMap.destroy()
    })

    it('should properly clean up resources on destroy', async () => {
      const dogMap = new DogMap<string>()
      
      await dogMap.set('key1', 'value1')

      dogMap.destroy()

      // After destroy, the map should be cleared
      expect(dogMap.size()).toBe(0)
    })
  })
})
