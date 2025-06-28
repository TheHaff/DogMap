import './App.css'

import { ErrorBoundary } from 'react-error-boundary'

import { Search } from './components/search/search'

function App() {
  return (
    <ErrorBoundary
      fallbackRender={props => {
        console.error(props)
        const { error } = props
        return <div>Error: {error.errors.map(e => e.message).join(', ')}</div>
      }}
      onError={console.error}
    >
      <Search />
    </ErrorBoundary>
  )
}

export default App
