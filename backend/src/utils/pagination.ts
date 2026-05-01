export type PaginationQuery = {
  page?: string | string[];
  limit?: string | string[];
};

export function parsePagination(query: PaginationQuery): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);
  const rawLimit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
