// Import BaseFilterTranslator directly
// Note: We're using a direct import to avoid TypeScript errors during development
// At runtime, this should resolve correctly through the package imports
import { BaseFilterTranslator } from '@mastra/core/vector/filter';

// Define VectorFilter type locally to avoid import issues
// This matches the type definition in the core package
type VectorFilter =
  | {
      [field: string]: any;
    }
  | null
  | undefined;

/**
 * Translates Mastra vector filters to Milvus filter expressions
 * 
 * Milvus supports a subset of MongoDB-like query operators for filtering.
 */
export class MilvusFilterTranslator extends BaseFilterTranslator {
  /**
   * Translates a Mastra vector filter to a Milvus filter expression
   */
  translate(filter?: VectorFilter): Record<string, any> | undefined {
    if (!filter || Object.keys(filter).length === 0) return undefined;
    
    // Process and return the translated filter
    return this.processFilter(filter);
  }

  /**
   * Processes a filter node and converts it to Milvus format
   */
  private processFilter(filter: VectorFilter | any): Record<string, any> | undefined {
    if (!filter || Object.keys(filter).length === 0) {
      return undefined;
    }

    // Handle primitive values (direct equality)
    if (typeof filter !== 'object' || filter === null) {
      return filter;
    }

    const result: Record<string, any> = {};

    // Process each key in the filter
    for (const [key, value] of Object.entries(filter)) {
      if (['$and', '$or', '$not', '$nor'].includes(key)) {
        result[key] = this.processLogicalOperator(key, value);
      } else if (key.startsWith('$')) {
        result[key] = this.processFieldOperator(key, value);
      } else {
        // Regular field
        result[key] = this.processFieldValue(value);
      }
    }

    return result;
  }

  private processLogicalOperator(operator: string, value: any): any {
    if (operator === '$and' || operator === '$or') {
      if (!Array.isArray(value)) {
        throw new Error(`${operator} operator requires an array value`);
      }
      return value.map(item => this.processFilter(item));
    }

    if (operator === '$not') {
      return this.processFilter(value);
    }

    throw new Error(`Unsupported logical operator: ${operator}`);
  }

  private processFieldOperator(operator: string, value: any): any {
    // Basic operators
    if (['$eq', '$ne'].includes(operator)) {
      return this.processBasicOperator(operator, value);
    }

    // Numeric operators
    if (['$gt', '$gte', '$lt', '$lte'].includes(operator)) {
      return this.processNumericOperator(operator, value);
    }

    // Array operators
    if (['$in', '$nin', '$all'].includes(operator)) {
      return this.processArrayOperator(operator, value);
    }

    throw new Error(`Unsupported field operator: ${operator}`);
  }

  private processBasicOperator(operator: string, value: any): any {
    const normalizedValue = this.normalizeValue(value);
    
    switch (operator) {
      case '$eq':
        return normalizedValue;
      case '$ne':
        return { $ne: normalizedValue };
      default:
        throw new Error(`Unsupported basic operator: ${operator}`);
    }
  }
  
  private normalizeValue(value: any): any {
    if (value === null) return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return value;
  }

  private processNumericOperator(operator: string, value: any): any {
    const normalizedValue = this.normalizeValue(value);
    
    switch (operator) {
      case '$gt':
        return { $gt: normalizedValue };
      case '$gte':
        return { $gte: normalizedValue };
      case '$lt':
        return { $lt: normalizedValue };
      case '$lte':
        return { $lte: normalizedValue };
      default:
        throw new Error(`Unsupported numeric operator: ${operator}`);
    }
  }

  private processArrayOperator(operator: string, value: any): any {
    if (!Array.isArray(value)) {
      throw new Error(`${operator} operator requires an array value`);
    }
    
    const normalizedValues = value.map(v => this.normalizeValue(v));
    
    switch (operator) {
      case '$in':
        return { $in: normalizedValues };
      case '$nin':
        return { $nin: normalizedValues };
      case '$all':
        return { $all: normalizedValues };
      default:
        throw new Error(`Unsupported array operator: ${operator}`);
    }
  }

  private processFieldValue(value: any): any {
    // If the value is an object with operators
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const hasOperators = Object.keys(value).some(key => key.startsWith('$'));
      
      if (hasOperators) {
        const result: Record<string, any> = {};
        
        for (const [opKey, opValue] of Object.entries(value)) {
          if (opKey.startsWith('$')) {
            const processedValue = this.processFieldOperator(opKey, opValue);
            result[opKey] = processedValue;
          } else {
            result[opKey] = this.processFieldValue(opValue);
          }
        }
        
        return result;
      }
    }
    
    // For primitive values or objects without operators
    return this.normalizeValue(value);
  }
}
