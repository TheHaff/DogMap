import { describe, expect, it } from 'vitest'

import DogMap from './dogMap'

describe('DogMap Integration Tests (Real Worker)', () => {
  // These tests use the real worker with WASM, so they need more time
  const TIMEOUT = 30000

  it('should add one item and search for it', async () => {
    console.log('Starting test: should add one item and search for it')
    const dogMap = new DogMap<string>()
    
    console.log('DogMap created, setting item...')
    await dogMap.set('apple', 'fruit')
    
    console.log('Item set, checking basic operations...')
    expect(dogMap.has('apple')).toBe(true)
    expect(dogMap.get('apple')).toBe('fruit')
    expect(dogMap.size()).toBe(1)
    
    console.log('Basic operations passed, testing search...')
    const results = await dogMap.search('app')
    console.log('Search results:', results)
    expect(results).toHaveLength(1)
    expect(results).toContain('fruit')
    
    console.log('Test completed successfully')
    dogMap.destroy()
  }, TIMEOUT)

  it('should add multiple items and search', async () => {
    console.log('Starting test: should add multiple items and search')
    const dogMap = new DogMap<string>()
    
    console.log('DogMap created, setting multiple items...')
    await dogMap.setMultiple([
      { key: 'apple', value: 'fruit' },
      { key: 'banana', value: 'fruit' },
      { key: 'carrot', value: 'vegetable' },
    ])
    
    console.log('Items set, checking basic operations...')
    expect(dogMap.size()).toBe(3)
    expect(dogMap.get('apple')).toBe('fruit')
    expect(dogMap.get('banana')).toBe('fruit')
    expect(dogMap.get('carrot')).toBe('vegetable')
    
    console.log('Basic operations passed, testing search...')
    const results = await dogMap.search('a')
    console.log('Search results:', results)
    expect(results.length).toBeGreaterThan(0)
    expect(results).toContain('fruit')
    expect(results).toContain('vegetable')
    
    console.log('Test completed successfully')
    dogMap.destroy()
  }, TIMEOUT)

  it('should delete one item', async () => {
    console.log('Starting test: should delete one item')
    const dogMap = new DogMap<string>()
    
    console.log('DogMap created, setting items...')
    await dogMap.setMultiple([
      { key: 'apple', value: 'fruit' },
      { key: 'banana', value: 'fruit' },
      { key: 'carrot', value: 'vegetable' },
    ])
    
    console.log('Items set, removing apple...')
    await dogMap.remove('apple')
    
    console.log('Item removed, checking state...')
    expect(dogMap.has('apple')).toBe(false)
    expect(dogMap.get('apple')).toBeUndefined()
    expect(dogMap.has('banana')).toBe(true)
    expect(dogMap.size()).toBe(2)
    
    console.log('State checked, testing search...')
    const results = await dogMap.search('app')
    console.log('Search results:', results)
    expect(results).not.toContain('fruit') // apple's value should be gone
    
    console.log('Test completed successfully')
    dogMap.destroy()
  }, TIMEOUT)

  it('should delete multiple items', async () => {
    const dogMap = new DogMap<string>()
    
    await dogMap.setMultiple([
      { key: 'apple', value: 'fruit' },
      { key: 'banana', value: 'fruit' },
      { key: 'carrot', value: 'vegetable' },
      { key: 'dog', value: 'animal' },
    ])
    
    await dogMap.removeMultiple(['apple', 'carrot'])
    
    expect(dogMap.has('apple')).toBe(false)
    expect(dogMap.has('carrot')).toBe(false)
    expect(dogMap.has('banana')).toBe(true)
    expect(dogMap.has('dog')).toBe(true)
    expect(dogMap.size()).toBe(2)
    
    dogMap.destroy()
  }, TIMEOUT)

  it('should clear all items', async () => {
    console.log('Starting test: should clear all items')
    const dogMap = new DogMap<string>()
    
    console.log('DogMap created, setting items...')
    await dogMap.setMultiple([
      { key: 'apple', value: 'fruit' },
      { key: 'banana', value: 'fruit' },
      { key: 'carrot', value: 'vegetable' },
    ])
    
    console.log('Items set, clearing...')
    await dogMap.clear()
    
    console.log('Cleared, checking state...')
    expect(dogMap.size()).toBe(0)
    expect(dogMap.has('apple')).toBe(false)
    expect(dogMap.has('banana')).toBe(false)
    expect(dogMap.has('carrot')).toBe(false)
    
    console.log('State checked, testing search...')
    const results = await dogMap.search('a')
    console.log('Search results:', results)
    expect(results).toHaveLength(0)
    
    console.log('Test completed successfully')
    dogMap.destroy()
  }, TIMEOUT)

  it('should handle search after clear and re-add', async () => {
    console.log('Starting test: should handle search after clear and re-add')
    const dogMap = new DogMap<string>()
    
    console.log('DogMap created, setting initial items...')
    await dogMap.setMultiple([
      { key: 'apple', value: 'fruit' },
      { key: 'banana', value: 'fruit' },
    ])
    
    // Search before clear
    console.log('Searching before clear...')
    let results = await dogMap.search('a')
    console.log('Search results before clear:', results)
    expect(results.length).toBeGreaterThan(0)
    
    // Clear all
    console.log('Clearing all items...')
    await dogMap.clear()
    
    // Search after clear
    console.log('Searching after clear...')
    results = await dogMap.search('a')
    console.log('Search results after clear:', results)
    expect(results).toHaveLength(0)
    
    // Re-add items
    console.log('Re-adding items...')
    await dogMap.setMultiple([
      { key: 'orange', value: 'fruit' },
      { key: 'grape', value: 'fruit' },
    ])
    
    // Search after re-add
    console.log('Searching after re-add...')
    results = await dogMap.search('o')
    console.log('Search results after re-add:', results)
    expect(results).toHaveLength(1)
    expect(results).toContain('fruit')
    
    console.log('Test completed successfully')
    dogMap.destroy()
  }, TIMEOUT)
}) 