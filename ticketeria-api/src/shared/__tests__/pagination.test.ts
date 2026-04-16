import { describe, it, expect } from 'vitest';
import { cursorPaginationSchema, buildCursorPagination, formatPaginatedResponse } from '../pagination';
import { v4 as uuidv4 } from 'uuid';

describe('Pagination Module', () => {
  describe('cursorPaginationSchema', () => {
    it('should validate correct pagination params', () => {
      const validData = {
        cursor: uuidv4(),
        limit: 20,
        direction: 'forward' as const,
      };

      const result = cursorPaginationSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should use default limit when not provided', () => {
      const data = { cursor: uuidv4() };
      const result = cursorPaginationSchema.parse(data);

      expect(result.limit).toBe(20);
    });

    it('should use default direction when not provided', () => {
      const data = { cursor: uuidv4() };
      const result = cursorPaginationSchema.parse(data);

      expect(result.direction).toBe('forward');
    });

    it('should allow empty object for pagination (all defaults)', () => {
      const result = cursorPaginationSchema.parse({});

      expect(result.cursor).toBeUndefined();
      expect(result.limit).toBe(20);
      expect(result.direction).toBe('forward');
    });

    it('should coerce limit to number', () => {
      const result = cursorPaginationSchema.parse({ limit: '50' });

      expect(result.limit).toBe(50);
      expect(typeof result.limit).toBe('number');
    });

    it('should reject invalid limit (less than 1)', () => {
      expect(() => cursorPaginationSchema.parse({ limit: 0 })).toThrow();
      expect(() => cursorPaginationSchema.parse({ limit: -10 })).toThrow();
    });

    it('should reject invalid limit (more than 100)', () => {
      expect(() => cursorPaginationSchema.parse({ limit: 101 })).toThrow();
    });

    it('should reject invalid cursor (not a UUID)', () => {
      expect(() => cursorPaginationSchema.parse({ cursor: 'not-a-uuid' })).toThrow();
    });

    it('should reject invalid direction', () => {
      expect(() => cursorPaginationSchema.parse({ direction: 'invalid' })).toThrow();
    });
  });

  describe('buildCursorPagination', () => {
    it('should build pagination without cursor (forward)', () => {
      const result = buildCursorPagination({
        limit: 20,
        direction: 'forward',
      });

      expect(result.take).toBe(21); // limit + 1
      expect(result.skip).toBeUndefined();
      expect(result.cursor).toBeUndefined();
      expect(result.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should build pagination with cursor (forward)', () => {
      const cursor = uuidv4();
      const result = buildCursorPagination({
        cursor,
        limit: 20,
        direction: 'forward',
      });

      expect(result.take).toBe(21);
      expect(result.skip).toBe(1);
      expect(result.cursor).toEqual({ id: cursor });
      expect(result.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should build pagination with cursor (backward)', () => {
      const cursor = uuidv4();
      const result = buildCursorPagination({
        cursor,
        limit: 20,
        direction: 'backward',
      });

      expect(result.take).toBe(21);
      expect(result.skip).toBe(1);
      expect(result.cursor).toEqual({ id: cursor });
      expect(result.orderBy).toEqual({ createdAt: 'asc' });
    });

    it('should handle different limits', () => {
      const result10 = buildCursorPagination({ limit: 10, direction: 'forward' });
      const result50 = buildCursorPagination({ limit: 50, direction: 'forward' });

      expect(result10.take).toBe(11);
      expect(result50.take).toBe(51);
    });
  });

  describe('formatPaginatedResponse', () => {
    it('should format response without more items', () => {
      const items = [
        { id: uuidv4() },
        { id: uuidv4() },
        { id: uuidv4() },
      ];

      const result = formatPaginatedResponse(items, 20);

      expect(result.data).toEqual(items);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
      expect(result.pagination.prevCursor).toBe(items[0].id);
    });

    it('should identify hasMore when items exceed limit', () => {
      const items = Array.from({ length: 21 }, () => ({ id: uuidv4() }));

      const result = formatPaginatedResponse(items, 20);

      expect(result.data.length).toBe(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBe(result.data[19].id);
    });

    it('should set correct cursors', () => {
      const id1 = uuidv4();
      const id2 = uuidv4();
      const id3 = uuidv4();
      const items = [{ id: id1 }, { id: id2 }, { id: id3 }];

      const result = formatPaginatedResponse(items, 20);

      expect(result.pagination.prevCursor).toBe(id1);
      expect(result.pagination.nextCursor).toBe(id3);
    });

    it('should handle empty items', () => {
      const result = formatPaginatedResponse([], 20);

      expect(result.data).toEqual([]);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
      expect(result.pagination.prevCursor).toBeNull();
    });

    it('should handle single item', () => {
      const id = uuidv4();
      const items = [{ id }];

      const result = formatPaginatedResponse(items, 20);

      expect(result.data).toEqual(items);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.prevCursor).toBe(id);
      expect(result.pagination.nextCursor).toBeNull();
    });

    it('should include total when provided', () => {
      const items = [{ id: uuidv4() }];
      const result = formatPaginatedResponse(items, 20, 100);

      expect(result.pagination.total).toBe(100);
    });

    it('should not include total when not provided', () => {
      const items = [{ id: uuidv4() }];
      const result = formatPaginatedResponse(items, 20);

      expect(result.pagination.total).toBeUndefined();
    });

    it('should correctly slice items when hasMore', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `id-${i}` }));

      const result = formatPaginatedResponse(items, 20);

      expect(result.data.length).toBe(20);
      expect(result.data[0].id).toBe('id-0');
      expect(result.data[19].id).toBe('id-19');
    });
  });
});
