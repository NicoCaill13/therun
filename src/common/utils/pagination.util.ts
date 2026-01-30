import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination.constants';

/**
 * Pagination input parameters from query DTOs
 */
export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

/**
 * Normalized pagination parameters for database queries
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

/**
 * Pagination metadata for response DTOs
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Normalizes pagination input and returns consistent parameters.
 * Ensures page >= 1 and pageSize within bounds.
 */
export function normalizePagination(input: PaginationInput): PaginationParams {
  let page = input.page ?? DEFAULT_PAGE;
  let pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;

  if (page < 1) {
    page = DEFAULT_PAGE;
  }

  if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    pageSize = DEFAULT_PAGE_SIZE;
  }

  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

/**
 * Computes pagination metadata from total count.
 */
export function computePaginationMeta(totalCount: number, params: PaginationParams): PaginationMeta {
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / params.pageSize);

  return {
    page: params.page,
    pageSize: params.pageSize,
    totalCount,
    totalPages,
  };
}

/**
 * Helper to build a paginated response object.
 * Combines items with pagination metadata.
 */
export function buildPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  params: PaginationParams,
): { items: T[] } & PaginationMeta {
  const meta = computePaginationMeta(totalCount, params);

  return {
    items,
    ...meta,
  };
}
