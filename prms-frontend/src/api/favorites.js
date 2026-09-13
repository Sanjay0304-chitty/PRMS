import { apiClient } from './ApiClient';

export const favoritesApi = {
  getMyFavorites() {
    return apiClient.get('/favorites');
  },
  toggleFavorite({ propertyId }) {
    return apiClient.post(`/favorites/${propertyId}`);
  },
  removeFavorite({ propertyId }) {
    return apiClient.delete(`/favorites/${propertyId}`);
  },
  isFavorited: async ({ propertyId }) => {
    try {
      const res = await apiClient.get(`/favorites/${propertyId}`);
      return res.data?.data?.favorited ?? false;
    } catch {
      return false;
    }
  },
};