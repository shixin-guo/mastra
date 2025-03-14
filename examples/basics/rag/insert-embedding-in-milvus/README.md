# Insert Embeddings in Milvus

This example demonstrates how to:
1. Create a document from text
2. Chunk the document
3. Generate embeddings using OpenAI
4. Store the embeddings in Milvus

## Prerequisites

- Milvus server running (locally or remote)
- OpenAI API key

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   cp .env.example .env
   ```

2. Edit `.env` with your OpenAI API key and Milvus connection details

## Running the example

```bash
pnpm start
```
