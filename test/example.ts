import DogMap from '../src/dogMap'

async function example() {
  // Create a new DogMap instance
  const dogMap = new DogMap<string>()

  // Add some data
  await dogMap.set('apple', 'A red fruit')
  await dogMap.set('banana', 'A yellow fruit')
  await dogMap.set('cherry', 'A small red fruit')
  await dogMap.set('date', 'A sweet brown fruit')
  await dogMap.set('elderberry', 'A purple berry')
  await dogMap.set('fig', 'A soft purple fruit')
  await dogMap.set('grape', 'A small round fruit')
  await dogMap.set('honeydew', 'A green melon')

  console.log('Added', dogMap.size(), 'items to the map')

  // Search for fruits containing "berry"
  console.log("\nSearching for 'berry':")
  const berryResults = await dogMap.search('berry')
  console.log('Results:', berryResults)

  // Search for fruits starting with "a"
  console.log("\nSearching for 'a':")
  const aResults = await dogMap.search('a')
  console.log('Results:', aResults)

  // Get just the keys for a search
  console.log("\nGetting keys for 'fruit':")
  const fruitKeys = await dogMap.keysFor('fruit')
  console.log('Keys:', fruitKeys)

  // Demonstrate cancellable search
  console.log('\nDemonstrating cancellable search:')
  const searchPromise = dogMap.search('a')

  // Cancel the search after a short delay
  setTimeout(async () => {
    await dogMap.cancelSearch('a')
    console.log('Search cancelled')
  }, 100)

  try {
    const results = await searchPromise
    console.log('Search completed:', results)
  } catch (error) {
    console.log('Search was cancelled or failed:', error)
  }

  // Remove an item
  console.log("\nRemoving 'apple':")
  await dogMap.remove('apple')
  console.log('Map size after removal:', dogMap.size())

  // Search again to see the change
  console.log("\nSearching for 'a' after removal:")
  const updatedResults = await dogMap.search('a')
  console.log('Updated results:', updatedResults)

  // Clean up
  dogMap.destroy()
  console.log('\nDogMap destroyed')
}

// Run the example
example().catch(console.error)
