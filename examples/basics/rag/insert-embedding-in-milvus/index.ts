import { openai } from '@ai-sdk/openai';
import { MilvusVector } from '@mastra/milvus';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';

// Create a document from text
const doc = MDocument.fromText('Your text content...');

// Chunk the document
const chunks = await doc.chunk();

// Generate embeddings using OpenAI
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: chunks.map(chunk => chunk.text),
});

// Initialize Milvus vector store with connection details
const milvus = new MilvusVector(
  process.env.MILVUS_URL || 'http://localhost:19530',
  process.env.MILVUS_USERNAME,
  process.env.MILVUS_PASSWORD
);

// Create an index with the appropriate dimension
await milvus.createIndex({
  indexName: 'test_collection',
  dimension: 1536, // Dimension for text-embedding-3-small
});

// Store both metadata and vectors in Milvus
await milvus.upsert({
  indexName: 'test_collection',
  vectors: embeddings,
  metadata: chunks.map(chunk => ({ text: chunk.text })), // metadata
});

console.log(`Successfully stored ${chunks.length} chunks in Milvus.`);
