import { describe, it, expect, beforeEach } from 'vitest';
import { MilvusFilterTranslator } from './filter';

describe('MilvusFilterTranslator', () => {
  let translator: MilvusFilterTranslator;

  beforeEach(() => {
    translator = new MilvusFilterTranslator();
  });

  describe('basic operations', () => {
    it('handles empty filters', () => {
      expect(translator.translate({})).toEqual(undefined);
      expect(translator.translate(null)).toEqual(undefined);
      expect(translator.translate(undefined)).toEqual(undefined);
    });

    it('retains implicit equality', () => {
      const filter = { field: 'value' };
      expect(translator.translate(filter)).toEqual({ field: 'value' });
    });

    it('handles multiple fields', () => {
      const filter = {
        field1: 'value1',
        field2: 'value2',
      };
      expect(translator.translate(filter)).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });
  });

  describe('logical operators', () => {
    it('handles $and operator', () => {
      const filter = {
        $and: [
          { field1: 'value1' },
          { field2: 'value2' }
        ]
      };
      expect(translator.translate(filter)).toEqual({
        $and: [
          { field1: 'value1' },
          { field2: 'value2' }
        ]
      });
    });

    it('handles $or operator', () => {
      const filter = {
        $or: [
          { field1: 'value1' },
          { field2: 'value2' }
        ]
      };
      expect(translator.translate(filter)).toEqual({
        $or: [
          { field1: 'value1' },
          { field2: 'value2' }
        ]
      });
    });

    it('throws error for unsupported logical operators', () => {
      const filter = {
        $nor: [
          { field1: 'value1' },
          { field2: 'value2' }
        ]
      };
      expect(() => translator.translate(filter)).toThrow('Unsupported logical operator');
    });
  });

  describe('comparison operators', () => {
    it('handles $eq operator', () => {
      const filter = { field: { $eq: 'value' } };
      expect(translator.translate(filter)).toEqual({ field: { $eq: 'value' } });
    });

    it('handles $ne operator', () => {
      const filter = { field: { $ne: 'value' } };
      expect(translator.translate(filter)).toEqual({ field: { $ne: { $ne: 'value' } } });
    });

    it('handles $gt operator', () => {
      const filter = { field: { $gt: 10 } };
      expect(translator.translate(filter)).toEqual({ field: { $gt: { $gt: 10 } } });
    });

    it('handles $gte operator', () => {
      const filter = { field: { $gte: 10 } };
      expect(translator.translate(filter)).toEqual({ field: { $gte: { $gte: 10 } } });
    });

    it('handles $lt operator', () => {
      const filter = { field: { $lt: 10 } };
      expect(translator.translate(filter)).toEqual({ field: { $lt: { $lt: 10 } } });
    });

    it('handles $lte operator', () => {
      const filter = { field: { $lte: 10 } };
      expect(translator.translate(filter)).toEqual({ field: { $lte: { $lte: 10 } } });
    });
  });

  describe('array operators', () => {
    it('handles $in operator', () => {
      const filter = { field: { $in: ['value1', 'value2'] } };
      expect(translator.translate(filter)).toEqual({ field: { $in: { $in: ['value1', 'value2'] } } });
    });

    it('handles $nin operator', () => {
      const filter = { field: { $nin: ['value1', 'value2'] } };
      expect(translator.translate(filter)).toEqual({ field: { $nin: { $nin: ['value1', 'value2'] } } });
    });

    it('handles $all operator', () => {
      const filter = { field: { $all: ['value1', 'value2'] } };
      expect(translator.translate(filter)).toEqual({ field: { $all: { $all: ['value1', 'value2'] } } });
    });

    it('throws error for non-array values in array operators', () => {
      const filter = { field: { $in: 'not-an-array' } };
      expect(() => translator.translate(filter)).toThrow('requires an array value');
    });
  });

  describe('complex filters', () => {
    it('handles nested operators', () => {
      const filter = {
        field1: { $gt: 10, $lt: 20 },
        field2: 'value'
      };
      expect(translator.translate(filter)).toEqual({
        field1: { $gt: { $gt: 10 }, $lt: { $lt: 20 } },
        field2: 'value'
      });
    });

    it('handles nested logical operators', () => {
      const filter = {
        $and: [
          { field1: 'value1' },
          {
            $or: [
              { field2: { $gt: 10 } },
              { field3: { $in: ['value3', 'value4'] } }
            ]
          }
        ]
      };
      expect(translator.translate(filter)).toEqual({
        $and: [
          { field1: 'value1' },
          {
            $or: [
              { field2: { $gt: { $gt: 10 } } },
              { field3: { $in: { $in: ['value3', 'value4'] } } }
            ]
          }
        ]
      });
    });
  });
});
