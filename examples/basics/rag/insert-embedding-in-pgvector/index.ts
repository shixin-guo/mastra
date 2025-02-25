import { openai } from '@ai-sdk/openai';
import { PgVector } from '@mastra/pg';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';

const doc = MDocument.fromText('Your text content...');

const chunks = await doc.chunk();

const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: chunks.map(chunk => chunk.text),
});

const pgVector = new PgVector(process.env.POSTGRES_CONNECTION_STRING!);

await pgVector.createIndex('test_index', 1536);

await pgVector.upsert(
  'test_index',
  embeddings,
  chunks?.map((chunk: any) => ({ text: chunk.text })),
);
