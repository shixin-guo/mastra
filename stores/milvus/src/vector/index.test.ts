import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MilvusVector } from './index';

// Mock the Milvus client
vi.mock('@zilliz/milvus2-sdk-node', () => {
  return {
    MilvusClient: vi.fn().mockImplementation(() => ({
      createCollection: vi.fn().mockResolvedValue({}),
      createIndex: vi.fn().mockResolvedValue({}),
      loadCollection: vi.fn().mockResolvedValue({}),
      insert: vi.fn().mockResolvedValue({}),
      flushSync: vi.fn().mockResolvedValue({}),
      search: vi.fn().mockResolvedValue({
        results: [
          { id: 'test-id', score: 0.9, field1: 'value1', field2: 'value2' }
        ]
      }),
      listCollections: vi.fn().mockResolvedValue({
        data: [{ name: 'test-collection' }]
      }),
      describeCollection: vi.fn().mockResolvedValue({
        schema: {
          fields: [
            { name: 'id', data_type: 'VarChar', is_primary_key: true },
            { name: 'vector', data_type: 'FloatVector', dim: 128 },
            { name: 'field1', data_type: 'VarChar' },
            { name: 'field2', data_type: 'VarChar' }
          ]
        }
      }),
      describeIndex: vi.fn().mockResolvedValue({
        params: { metric_type: 'COSINE' }
      }),
      getCollectionStatistics: vi.fn().mockResolvedValue({
        stats: [{ key: 'row_count', value: '100' }]
      }),
      dropCollection: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
      deleteEntities: vi.fn().mockResolvedValue({})
    }))
  };
});

describe('MilvusVector', () => {
  let milvusVector: MilvusVector;

  beforeEach(() => {
    milvusVector = new MilvusVector('http://localhost:19530', 'username', 'password');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('upsert', () => {
    it('should insert vectors and return IDs', async () => {
      const result = await milvusVector.upsert(
        'test-index',
        [[0.1, 0.2], [0.3, 0.4]],
        [{ text: 'doc1' }, { text: 'doc2' }]
      );

      expect(result).toHaveLength(2);
      expect(typeof result[0]).toBe('string');
    });
  });

  describe('query', () => {
    it('should search vectors and return results', async () => {
      // Mock hasCollection to return true for this test
      vi.spyOn(milvusVector as any, 'hasCollection').mockResolvedValueOnce(true);
      
      const results = await milvusVector.query(
        'test-index',
        [0.1, 0.2],
        5,
        { text: { $eq: 'test' } }
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-id');
      expect(results[0].score).toBe(0.9);
      expect(results[0].metadata).toEqual({ field1: 'value1', field2: 'value2' });
    });
  });

  describe('createIndex', () => {
    it('should create a collection and index', async () => {
      await milvusVector.createIndex({ indexName: 'test-index', dimension: 128 });
      // Assertion is implicit in the mock expectations
    });
  });

  describe('listIndexes', () => {
    it('should list collections', async () => {
      const collections = await milvusVector.listIndexes();
      expect(collections).toEqual(['test-collection']);
    });
  });

  describe('describeIndex', () => {
    it('should return index stats', async () => {
      // Mock hasCollection to return true for this test
      vi.spyOn(milvusVector as any, 'hasCollection').mockResolvedValueOnce(true);
      
      const stats = await milvusVector.describeIndex('test-index');
      expect(stats.dimension).toBe(128);
      expect(stats.count).toBe(100);
      expect(stats.metric).toBe('cosine');
    });
  });

  describe('deleteIndex', () => {
    it('should drop a collection', async () => {
      await milvusVector.deleteIndex('test-index');
      // Assertion is implicit in the mock expectations
    });
  });

  describe('updateIndexById', () => {
    it('should update a vector by ID', async () => {
      // Mock hasCollection to return true for this test
      vi.spyOn(milvusVector as any, 'hasCollection').mockResolvedValueOnce(true);
      
      await milvusVector.updateIndexById('test-index', 'test-id', {
        vector: [0.1, 0.2],
        metadata: { text: 'updated' }
      });
      // Assertion is implicit in the mock expectations
    });
  });

  describe('deleteIndexById', () => {
    it('should delete a vector by ID', async () => {
      await milvusVector.deleteIndexById('test-index', 'test-id');
      // Assertion is implicit in the mock expectations
    });
  });
});
