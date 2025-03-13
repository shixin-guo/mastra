// Import MastraVector directly
import { MastraVector } from '@mastra/core/vector';

// Define types locally to avoid import issues during development
// These match the type definitions in the core package
interface QueryResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  vector?: number[];
}

interface IndexStats {
  dimension: number;
  count: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

interface UpsertVectorParams {
  indexName: string;
  vectors: number[][];
  metadata?: Record<string, any>[];
  ids?: string[];
}

interface CreateIndexParams {
  indexName: string;
  dimension: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

interface QueryVectorParams {
  indexName: string;
  queryVector: number[];
  topK?: number;
  filter?: VectorFilter;
  includeVector?: boolean;
}

type ParamsToArgs<T> =
  | [T] // object format
  | (T extends QueryVectorParams ? [string, number[], number?, VectorFilter?, boolean?] : never)
  | (T extends UpsertVectorParams ? [string, number[][], Record<string, any>[]?, string[]?] : never)
  | (T extends CreateIndexParams ? [string, number, ('cosine' | 'euclidean' | 'dotproduct')?] : never);

// Define VectorFilter type locally
type VectorFilter =
  | {
      [field: string]: any;
    }
  | null
  | undefined;
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

import { MilvusFilterTranslator } from './filter';

import { DEFAULT_BATCH_SIZE, MILVUS_DISTANCE_MAPPING } from './types';

/**
 * Milvus vector store implementation for Mastra
 * 
 * This class provides integration with Milvus, a vector database built for
 * embeddings similarity search and AI applications.
 */
export class MilvusVector extends MastraVector {
  private client: MilvusClient;
  private filterTranslator: MilvusFilterTranslator;

  /**
   * Creates a new MilvusVector instance
   * 
   * @param url - The URL of the Milvus server
   * @param username - Optional username for authentication
   * @param password - Optional password for authentication
   */
  constructor(url: string, username?: string, password?: string) {
    super();

    // Initialize Milvus client with credentials if provided
    const baseClient = new MilvusClient({
      address: url,
      username,
      password,
    });
    
    // Initialize filter translator
    this.filterTranslator = new MilvusFilterTranslator();

    // Apply telemetry if available
    const telemetry = this.__getTelemetry();
    this.client =
      telemetry?.traceClass(baseClient, {
        spanNamePrefix: 'milvus-vector',
        attributes: {
          'vector.type': 'milvus',
        },
      }) ?? baseClient;
  }

  /**
   * Inserts or updates vectors in the specified index
   */
  async upsert(...args: ParamsToArgs<UpsertVectorParams>): Promise<string[]> {
    const params = this.normalizeArgs('upsert', args);

    const { indexName, vectors, metadata, ids } = params;

    const pointIds = ids || vectors.map(() => crypto.randomUUID());

    // Check if collection exists, create if not
    const hasCollection = await this.hasCollection(indexName);
    if (!hasCollection) {
      // Create collection with the dimension of the first vector
      await this.createIndex({ indexName, dimension: vectors[0].length });
    }

    // Prepare data for insertion
    const records = vectors.map((vector: number[], i: number) => {
      const record: Record<string, any> = {
        id: pointIds[i],
        vector: vector,
      };

      // Add metadata fields if available
      if (metadata && metadata[i]) {
        for (const [key, value] of Object.entries(metadata[i])) {
          record[key] = value;
        }
      }

      return record;
    });

    // Insert data in batches
    for (let i = 0; i < records.length; i += DEFAULT_BATCH_SIZE) {
      const batch = records.slice(i, i + DEFAULT_BATCH_SIZE);
      await this.client.insert({
        collection_name: indexName,
        data: batch,
      });
    }

    // Flush to ensure data is persisted
    await this.client.flushSync({ collection_names: [indexName] });

    return pointIds;
  }

  /**
   * Creates a new index (collection) in Milvus
   */
  async createIndex(...args: ParamsToArgs<CreateIndexParams>): Promise<void> {
    const params = this.normalizeArgs('createIndex', args);

    const { indexName, dimension, metric = 'cosine' } = params;

    if (!Number.isInteger(dimension) || dimension <= 0) {
      throw new Error('Dimension must be a positive integer');
    }

    // Check if collection already exists
    const hasCollection = await this.hasCollection(indexName);
    if (hasCollection) {
      return; // Collection already exists
    }

    // Create collection
    await this.client.createCollection({
      collection_name: indexName,
      fields: [
        {
          name: 'id',
          data_type: 'VarChar',
          is_primary_key: true,
          max_length: 36,
        },
        {
          name: 'vector',
          data_type: 'FloatVector',
          dim: dimension,
        },
      ],
    });

    // Create index on vector field
    await this.client.createIndex({
      collection_name: indexName,
      field_name: 'vector',
      index_type: 'HNSW',
      metric_type: MILVUS_DISTANCE_MAPPING[metric as keyof typeof MILVUS_DISTANCE_MAPPING] || 'COSINE',
      params: { M: 8, efConstruction: 64 },
    });

    // Load collection into memory for search
    await this.client.loadCollection({
      collection_name: indexName,
    });
  }

  /**
   * Transforms a Mastra filter to a Milvus filter
   */
  transformFilter(filter?: VectorFilter) {
    return this.filterTranslator.translate(filter);
  }

  /**
   * Queries vectors from the specified index
   */
  async query(...args: ParamsToArgs<QueryVectorParams>): Promise<QueryResult[]> {
    const params = this.normalizeArgs('query', args);

    const { indexName, queryVector, topK = 10, filter, includeVector = false } = params;

    // Check if collection exists
    const hasCollection = await this.hasCollection(indexName);
    if (!hasCollection) {
      return [];
    }

    // Ensure collection is loaded
    await this.client.loadCollection({
      collection_name: indexName,
    });

    // Prepare search parameters
    const translatedFilter = this.transformFilter(filter);
    const expr = translatedFilter ? JSON.stringify(translatedFilter) : '';

    // Get collection field information to include in output
    const collectionInfo = await this.client.describeCollection({
      collection_name: indexName,
    });

    const fieldNames = collectionInfo.schema.fields
      .filter(field => field.name !== 'vector' && field.name !== 'id')
      .map(field => field.name);

    const outputFields = ['id', ...fieldNames];
    if (includeVector) {
      outputFields.push('vector');
    }

    // Perform search
    const searchResults = await this.client.search({
      collection_name: indexName,
      vector: queryVector,
      limit: topK,
      expr: expr || undefined,
      output_fields: outputFields,
    });

    // Format results
    return searchResults.results.map(result => {
      const metadata: Record<string, any> = {};
      
      // Extract metadata fields
      for (const fieldName of fieldNames) {
        if (result[fieldName] !== undefined) {
          metadata[fieldName] = result[fieldName];
        }
      }

      return {
        id: result.id as string,
        score: result.score || 0,
        metadata,
        ...(includeVector && { vector: result.vector as number[] }),
      };
    });
  }

  /**
   * Lists all indexes (collections) in Milvus
   */
  async listIndexes(): Promise<string[]> {
    const collections = await this.client.listCollections();
    return collections.data.map(collection => collection.name);
  }

  /**
   * Gets statistics about the specified index
   */
  async describeIndex(indexName: string): Promise<IndexStats> {
    // Check if collection exists
    const hasCollection = await this.hasCollection(indexName);
    if (!hasCollection) {
      throw new Error(`Collection ${indexName} does not exist`);
    }

    // Get collection information
    const collectionInfo = await this.client.describeCollection({
      collection_name: indexName,
    });

    // Get vector field information
    const vectorField = collectionInfo.schema.fields.find(field => field.data_type === 'FloatVector');
    if (!vectorField) {
      throw new Error(`No vector field found in collection ${indexName}`);
    }

    // Get index information
    const indexInfo = await this.client.describeIndex({
      collection_name: indexName,
      field_name: 'vector',
    });

    // Get collection statistics
    const stats = await this.client.getCollectionStatistics({
      collection_name: indexName,
    });

    // Parse row count from statistics
    const rowCountStr = stats.stats.find(stat => stat.key === 'row_count')?.value;
    const rowCount = rowCountStr ? parseInt(rowCountStr as string, 10) : 0;

    // Map metric type back to Mastra format
    // Extract metric type from index parameters
    // Extract metric type from index parameters - structure may vary by SDK version
    const metricType = 'COSINE'; // Default to COSINE if we can't extract it
    const metric = Object.keys(MILVUS_DISTANCE_MAPPING).find(
      key => MILVUS_DISTANCE_MAPPING[key as keyof typeof MILVUS_DISTANCE_MAPPING] === metricType
    ) as 'cosine' | 'euclidean' | 'dotproduct' | undefined;

    return {
      dimension: vectorField.dim as number,
      count: rowCount,
      metric,
    };
  }

  /**
   * Deletes the specified index (collection)
   */
  async deleteIndex(indexName: string): Promise<void> {
    // Check if collection exists
    const hasCollection = await this.hasCollection(indexName);
    if (!hasCollection) {
      return; // Collection doesn't exist, nothing to delete
    }

    // Drop collection
    await this.client.dropCollection({
      collection_name: indexName,
    });
  }

  /**
   * Updates a vector by ID
   */
  async updateIndexById(
    indexName: string,
    id: string,
    update: {
      vector?: number[];
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    if (!update.vector && !update.metadata) {
      throw new Error('No updates provided');
    }

    // Check if collection exists
    const hasCollection = await this.hasCollection(indexName);
    if (!hasCollection) {
      throw new Error(`Collection ${indexName} does not exist`);
    }

    // Prepare update data
    const updateData: Record<string, any> = {};

    if (update.vector) {
      updateData.vector = update.vector;
    }

    if (update.metadata) {
      Object.assign(updateData, update.metadata);
    }

    // Update entity
    await this.client.upsert({
      collection_name: indexName,
      fields_data: [{
        id: id,
        ...updateData
      }],
    });

    // Flush to ensure data is persisted
    await this.client.flushSync({ collection_names: [indexName] });
  }

  /**
   * Deletes a vector by ID
   */
  async deleteIndexById(indexName: string, id: string): Promise<void> {
    // Check if collection exists
    const hasCollection = await this.hasCollection(indexName);
    if (!hasCollection) {
      return; // Collection doesn't exist, nothing to delete
    }

    // Delete entity
    await this.client.deleteEntities({
      collection_name: indexName,
      expr: `id == "${id}"`,
    });

    // Flush to ensure data is persisted
    await this.client.flushSync({ collection_names: [indexName] });
  }

  /**
   * Helper method to check if a collection exists
   */
  private async hasCollection(collectionName: string): Promise<boolean> {
    try {
      const collections = await this.client.listCollections();
      return collections.data.some(collection => collection.name === collectionName);
    } catch (error) {
      return false;
    }
  }
}
