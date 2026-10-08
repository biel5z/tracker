import { describe, expect, it } from 'vitest';
import { pageList } from './Pagination.tsx';

describe('pageList', () => {
  it('mostra todas quando são poucas', () => {
    expect(pageList(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('usa reticências no meio', () => {
    expect(pageList(10, 500)).toEqual([1, '…', 9, 10, 11, '…', 500]);
  });
  it('início e fim', () => {
    expect(pageList(1, 500)).toEqual([1, 2, 3, 4, '…', 500]);
    expect(pageList(500, 500)).toEqual([1, '…', 497, 498, 499, 500]);
  });
});
