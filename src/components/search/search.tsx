import { useDebounce } from '@uidotdev/usehooks'
import { atom, useAtom } from 'jotai'
import React from 'react'

import { fkr } from '../../../test/fkr'
import DogMap from '../../dogMap'

// Atoms
const queryAtom = atom('')
const resultsAtom = atom<string[]>([])
const isSearchingAtom = atom(false)

export const Search: React.FC = () => {
  const [query, setQuery] = useAtom(queryAtom)
  const [results, setResults] = useAtom(resultsAtom)
  const [isSearching, setIsSearching] = useAtom(isSearchingAtom)
  const debouncedQuery = useDebounce(query, 300)
  const dogMapRef = React.useRef<DogMap<string> | null>(null)

  // Initialize DogMap
  React.useEffect(() => {
    console.log('Initializing DogMap...')
    const dogMap = new DogMap<string>()
    dogMapRef.current = dogMap

    // Add initial data
    console.log('Adding initial data to DogMap...')
    console.log('Initial data:', fkr.slice(0, 5))
    
    // Add all strings to the DogMap using setMultiple for better performance
    const entries = fkr.map(key => ({ key, value: key }))
    dogMap.setMultiple(entries)
      .then(() => {
        console.log('All strings added to DogMap')
      })
      .catch(error => {
        console.error('Error adding strings to DogMap:', error)
      })

    return () => {
      console.log('Cleaning up DogMap...')
      dogMap.destroy()
    }
  }, [])

  // Update the search effect when debounced query changes
  React.useEffect(() => {
    const dogMap = dogMapRef.current
    if (debouncedQuery && dogMap) {
      console.log('Starting search with debounced query:', debouncedQuery)
      setIsSearching(true)

      // Use DogMap's search method
      dogMap
        .search(debouncedQuery)
        .then(searchResults => {
          console.log('Search results:', searchResults)
          setResults(searchResults)
          setIsSearching(false)
        })
        .catch(error => {
          console.error('Search error:', error)
          setIsSearching(false)
        })
    } else if (!debouncedQuery) {
      setResults([])
    }
  }, [debouncedQuery, setIsSearching, setResults])

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="relative mb-4">
        <input
          className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          type="text"
          value={query}
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            Searching...
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
        {results.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {results.map(result => (
              <li
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                key={result}
              >
                {result}
              </li>
            ))}
          </ul>
        ) : query && !isSearching ? (
          <div className="p-4 text-center text-gray-500">No results found</div>
        ) : null}
      </div>
    </div>
  )
}
