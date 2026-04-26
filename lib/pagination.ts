export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

export const parsePositiveInteger = (value: string | null | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const resolvePaginationParams = (
  searchParams: URLSearchParams,
  options?: { defaultLimit?: number; maxLimit?: number }
): PaginationParams => {
  const maxLimit = options?.maxLimit ?? 100;
  const defaultLimit = Math.min(options?.defaultLimit ?? DEFAULT_LIMIT, maxLimit);
  const page = parsePositiveInteger(searchParams.get("page"), DEFAULT_PAGE);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = Math.min(rawLimit, maxLimit);

  return { page, limit };
};
