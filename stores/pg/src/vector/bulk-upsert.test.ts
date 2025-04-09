import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PgVector } from '.';

const connectionString = process.env.DB_URL || `postgresql://postgres:postgres@localhost:5435/mastra`;

describe('PgVector bulkUpsert', () => {
  let vectorDB: PgVector;
  const testIndexName = 'test_bulk_upsert';
  
  beforeAll(async () => {
    vectorDB = new PgVector(connectionString);
  });
  
  beforeEach(async () => {
    await vectorDB.createIndex({
      indexName: testIndexName,
      dimension: 4,
      metric: 'cosine',
    });
  });
  
  afterEach(async () => {
    await vectorDB.deleteIndex(testIndexName);
  });
  
  afterAll(async () => {
    await vectorDB.disconnect();
  });
  
  it('should bulk upsert vectors', async () => {
    const vectors = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
    ];
    
    const metadata = [
      { text: 'first' },
      { text: 'second' },
      { text: 'third' },
    ];
    
    const ids = await vectorDB.bulkUpsert(testIndexName, vectors, metadata);
    expect(ids).toHaveLength(3);
    
    const results = await vectorDB.query({
      indexName: testIndexName,
      queryVector: [1, 2, 3, 4],
      topK: 3,
    });
    
    expect(results).toHaveLength(3);
    expect(results[0].metadata.text).toBe('first');
  });
  
  it('should handle bulk upsert with custom IDs', async () => {
    const vectors = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ];
    
    const customIds = ['custom-id-1', 'custom-id-2'];
    
    const ids = await vectorDB.bulkUpsert(testIndexName, vectors, undefined, customIds);
    expect(ids).toEqual(customIds);
    
    const results = await vectorDB.query({
      indexName: testIndexName,
      queryVector: [1, 2, 3, 4],
      topK: 2,
    });
    
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('custom-id-1');
  });
  
  it('should perform better than individual upserts for large batches', async () => {
    const batchSize = 100;
    const vectors = Array.from({ length: batchSize }, () => 
      Array.from({ length: 4 }, () => Math.random() * 2 - 1)
    );
    
    const startIndividual = performance.now();
    for (const vector of vectors) {
      await vectorDB.upsert({
        indexName: testIndexName,
        vectors: [vector],
      });
    }
    const endIndividual = performance.now();
    const individualTime = endIndividual - startIndividual;
    
    await vectorDB.deleteIndex(testIndexName);
    await vectorDB.createIndex({
      indexName: testIndexName,
      dimension: 4,
      metric: 'cosine',
    });
    
    const startBulk = performance.now();
    await vectorDB.bulkUpsert(testIndexName, vectors);
    const endBulk = performance.now();
    const bulkTime = endBulk - startBulk;
    
    console.log(`Individual upserts: ${individualTime.toFixed(2)}ms`);
    console.log(`Bulk upsert: ${bulkTime.toFixed(2)}ms`);
    console.log(`Speedup: ${(individualTime / bulkTime).toFixed(2)}x`);
    
    expect(bulkTime).toBeLessThan(individualTime * 0.5);
  });
});
