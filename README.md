# 🐕 DogMap - The Searchable Map That's Fetch!

<div align="center">
  <img src="logo.png" alt="DogMap Logo" width="200" height="200">
</div>

> A lightning-fast, searchable map with cancellable async search powered by WebAssembly! Because every good boy deserves a map that can find things quickly. 🦮

## ⚠️ Experimental Status

**DogMap is currently experimental and is not ready to be off leash!** 🦮🔒

This project is in active development and may have breaking changes, bugs, or incomplete features. While it's fun to play with, please don't use it in production environments just yet. We're working hard to make it production-ready, but for now, it's best kept in the backyard for testing and experimentation.

### What This Means:
- 🚧 **Breaking Changes**: API may change without notice
- 🐛 **Potential Bugs**: Some features might not work as expected
- 📚 **Limited Documentation**: Some advanced features may not be fully documented
- 🔬 **Testing Phase**: Performance and stability are still being optimized

---

## 🎯 What is DogMap?

DogMap is a generic, searchable map implementation that combines the power of JavaScript Maps with blazing-fast fuzzy search capabilities. It's like having a super-smart dog that can instantly find any toy you ask for, even if you only remember part of its name!

### ✨ Key Features

- 🔍 **Fuzzy Search**: Find keys even with partial matches
- ⚡ **WebAssembly Powered**: Lightning-fast search using Rust/WASM
- 🚫 **Cancellable Searches**: Cancel long-running searches instantly
- 🧵 **Async Operations**: Non-blocking search operations
- 🎯 **TypeScript Support**: Full type safety with generics
- 🐕 **Generic Values**: Store any type of data (not just strings!)

## 🚀 Quick Start

```typescript
import DogMap from './dogMap';

// Create a new DogMap (it's like getting a new puppy!)
const dogMap = new DogMap<string>();

// Add some data (teaching your dog new tricks)
await dogMap.set("apple", "A red fruit");
await dogMap.set("banana", "A yellow fruit");
await dogMap.set("cherry", "A small red fruit");

// Search for fruits (your dog finds them instantly!)
const results = await dogMap.search("berry");
console.log(results); // ["A purple berry"]

// Get just the keys
const keys = await dogMap.keysFor("fruit");
console.log(keys); // ["apple", "banana", "cherry"]
```

## 🎮 Advanced Usage

### Cancellable Searches

```typescript
// Start a search
const searchPromise = dogMap.search("a");

// Cancel it if it takes too long (like calling your dog back!)
setTimeout(async () => {
  await dogMap.cancelSearch("a");
  console.log("Search cancelled!");
}, 1000);

try {
  const results = await searchPromise;
  console.log("Found:", results);
} catch (error) {
  console.log("Search was cancelled or failed");
}
```

### Working with Complex Data

```typescript
interface User {
  name: string;
  age: number;
  email: string;
}

const userMap = new DogMap<User>();

await userMap.set("john_doe", { name: "John Doe", age: 30, email: "john@example.com" });
await userMap.set("jane_smith", { name: "Jane Smith", age: 25, email: "jane@example.com" });

// Search by username
const users = await userMap.search("john");
console.log(users); // [{ name: "John Doe", age: 30, email: "john@example.com" }]
```

## 🛠️ API Reference

### Core Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `set(key, value)` | Add a key-value pair | `Promise<void>` |
| `get(key)` | Get a value by key | `T \| undefined` |
| `remove(key)` | Remove a key-value pair | `Promise<void>` |
| `search(query)` | Search for keys and return values | `Promise<T[]>` |
| `keysFor(query)` | Search for keys only | `Promise<string[]>` |
| `cancelSearch(searchId)` | Cancel an ongoing search | `Promise<void>` |

### Utility Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `has(key)` | Check if key exists | `boolean` |
| `size()` | Get number of items | `number` |
| `clear()` | Remove all items | `void` |
| `destroy()` | Clean up resources | `void` |
| `entries()` | Get all key-value pairs | `IterableIterator<[string, T]>` |
| `keys()` | Get all keys | `IterableIterator<string>` |
| `values()` | Get all values | `IterableIterator<T>` |

## 🏗️ Architecture

DogMap is built with a clever architecture that separates concerns:

```
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   DogMap<T>     │    │  SearchWorker     │    │  Web Worker     │
│                 │    │                   │    │                 │
│ • Map storage   │◄──►│ • Worker mgmt     │◄──►│ • WASM search   │
│ • Type safety   │    │ • Message handling│    │ • Fuzzy matching│
│ • API interface │    │ • Callback mgmt   │    │ • Protobuf      │
└─────────────────┘    └───────────────────┘    └─────────────────┘
```

### How It Works

1. **DogMap**: Provides a familiar Map-like interface with search capabilities
2. **SearchWorker**: Manages the web worker and handles message encoding/decoding
3. **Web Worker**: Runs the WASM search engine in a separate thread
4. **WASM Engine**: Performs lightning-fast fuzzy search using Rust

## 🧪 Running Examples

```bash
# Run the example
pnpm run example

# Or run the development server to see the search component
pnpm dev
```

## 🔧 Development

### Prerequisites

- Node.js 18+
- pnpm
- Rust (for WASM compilation)

### Setup

```bash
# Install dependencies
pnpm install
# Build the WASM search worker
pnpm build:wasm

# Run development server
pnpm dev
```

### Building

```bash
# Build for production
pnpm build

# Run tests
pnpm test

# Lint and fix
pnpm lint:fix
```

## 🎯 Use Cases

- **Search Interfaces**: Build fast search UIs with real-time results
- **Data Indexing**: Index large datasets for quick retrieval
- **Autocomplete**: Power autocomplete components with fuzzy matching
- **File Systems**: Search through file names and metadata
- **Databases**: Add search capabilities to in-memory data stores

## 🤝 Contributing

Found a bug? Want to add a feature? Contributions are welcome! 

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Rust](https://rust-lang.org/) and [WebAssembly](https://webassembly.org/)
- Powered by [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- Message serialization with [Protobuf](https://protobuf.dev/)
- Type safety with [TypeScript](https://www.typescriptlang.org/)

---

**Remember**: Like a good dog, DogMap is loyal, fast, and always ready to help you find what you're looking for! 🐕✨

