import { apiClient } from './ApiClient';

const resolveId = (param) => (typeof param === 'object' && param !== null ? param.propertyId || param.id : param);

export const favoritesApi = {
  getMyFavorites() {
    return apiClient.get('/favorites');
  },
  list() {
    return apiClient.get('/favorites');
  },
  addFavorite(propertyId) {
    const id = resolveId(propertyId);
    return apiClient.post(`/favorites/${id}`);
  },
  removeFavorite(propertyId) {
    const id = resolveId(propertyId);
    return apiClient.delete(`/favorites/${id}`);
  },
  toggleFavorite(propertyId) {
    const id = resolveId(propertyId);
    return apiClient.post(`/favorites/${id}`);
  },
  checkFavorite: async (propertyId) => {
    try {
      const id = resolveId(propertyId);
      const res = await apiClient.get(`/favorites/${id}`);
      return res.data?.data?.favorited ?? res.data?.data ?? false;
    } catch {
      return false;
    }
  },
  isFavorited: async (propertyId) => {
    try {
      const id = resolveId(propertyId);
      const res = await apiClient.get(`/favorites/${id}`);
      return res.data?.data?.favorited ?? false;
    } catch {
      return false;
    }
  },
};