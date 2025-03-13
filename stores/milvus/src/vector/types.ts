/**
 * Milvus-specific types for the vector store implementation
 */

/**
 * Configuration options for the Milvus vector store
 */
export interface MilvusVectorConfig {
  /**
   * The URL of the Milvus server
   */
  url: string;
  
  /**
   * Optional username for authentication
   */
  username?: string;
  
  /**
   * Optional password for authentication
   */
  password?: string;
  
  /**
   * Batch size for vector operations (default: 256)
   */
  batchSize?: number;
}

/**
 * Mapping of Mastra distance metrics to Milvus metric types
 */
export const MILVUS_DISTANCE_MAPPING = {
  cosine: 'COSINE',
  euclidean: 'L2',
  dotproduct: 'IP',
} as const;

/**
 * Default batch size for vector operations
 */
export const DEFAULT_BATCH_SIZE = 256;
