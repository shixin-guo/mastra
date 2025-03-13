# Mastra Milvus Vector Store

This package provides integration with [Milvus](https://milvus.io/), a vector database built for embeddings similarity search and AI applications.

## Installation

```bash
pnpm add @mastra/milvus
```

## Usage

```typescript
import { Mastra } from '@mastra/core';
import { MilvusVector } from '@mastra/milvus';

// Initialize Mastra
const mastra = new Mastra();

// Create a Milvus vector store with environment variables
const milvusVector = new MilvusVector(
  process.env.MILVUS_URL,
  process.env.MILVUS_USERNAME,
  process.env.MILVUS_PASSWORD
);

// Register the vector store with Mastra
mastra.registerVector('milvus', milvusVector);

// Create an index
await mastra.vector.createIndex('my-index', 1536);

// Upsert vectors
const ids = await mastra.vector.upsert('my-index', [
  [0.1, 0.2, 0.3, ...], // vector 1
  [0.4, 0.5, 0.6, ...], // vector 2
], [
  { text: 'Document 1' }, // metadata for vector 1
  { text: 'Document 2' }, // metadata for vector 2
]);

// Query vectors
const results = await mastra.vector.query('my-index', [0.1, 0.2, 0.3, ...], 10, {
  text: { $eq: 'Document 1' }
});
```

## Features

- Create and manage vector collections in Milvus
- Upsert vectors with metadata
- Query vectors with filtering
- Delete vectors and collections
- Update vectors by ID

## Configuration

The `MilvusVector` constructor accepts the following parameters:

- `url`: The URL of the Milvus server (required)
- `username`: Optional username for authentication
- `password`: Optional password for authentication

## Filter Support

The Milvus vector store supports the following filter operators:

- Logical operators: `$and`, `$or`, `$not`
- Comparison operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`
- Array operators: `$in`, `$nin`, `$all`
- Element operators: `$exists`

Example filter:

```typescript
const filter = {
  $and: [
    { category: { $eq: 'books' } },
    { price: { $lt: 20 } }
  ]
};

const results = await mastra.vector.query('my-index', queryVector, 10, filter);
```
