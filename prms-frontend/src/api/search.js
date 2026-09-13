import { apiClient } from './ApiClient';

export const searchApi = {
  /* Multi-property search via /search endpoint (backend: modules/search/routes_search.ts) */
  search(params) {
    return apiClient.get('/search', { params });
  },

  /* Fallback: when /search unavailable, use regular properties list with filters */
  listWithFilters(params) {
    return apiClient.get('/properties', { params });
  },

  /* Search suggestions - uses search endpoint with q param */
  suggestions(query) {
    return apiClient.get('/search', { params: { q: query, limit: 10 } });
  },
};
