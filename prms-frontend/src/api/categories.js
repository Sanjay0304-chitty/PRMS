/* Category API endpoints (T-02.4) */
import { apiClient } from '../api';

export const categoryApi = {
  assignable: async () => {
    const [shared, personal] = await Promise.all([categoryApi.shared(), categoryApi.personalList()]);
    const categories = [...(shared.data?.data ?? []), ...(personal.data?.data ?? [])];
    return { data: { data: [...new Map(categories.filter(category => !category.isDisabled).map(category => [category.id, category])).values()] } };
  },
  list: (params) => apiClient.get('/categories', { params }),
  shared: () => apiClient.get('/categories/shared'),
  getById: (id) => apiClient.get(`/categories/${id}`),
  create: (data) => apiClient.post('/categories', data),
  update: (id, data) => apiClient.put(`/categories/${id}`, data),
  remove: (id) => apiClient.delete(`/categories/${id}`),
  toggle: (id) => apiClient.patch(`/categories/${id}/toggle`),
  seedDefaults: () => apiClient.post('/categories/seed'),
  personalList: () => apiClient.get('/categories/personal'),
  createPersonal: (data) => apiClient.post('/categories/personal', data),
  updatePersonal: (id, data) => apiClient.put(`/categories/personal/${id}`, data),
  removePersonal: (id) => apiClient.delete(`/categories/personal/${id}`),
  togglePersonal: (id) => apiClient.patch(`/categories/personal/${id}/toggle`),
};
