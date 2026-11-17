/* Category API endpoints (T-02.4) */
import { apiClient } from '../api';

export const categoryApi = {
  assignable: async () => {
    try {
      const [sharedRes, personalRes] = await Promise.allSettled([
        categoryApi.shared(),
        categoryApi.personalList(),
      ]);
      const shared = sharedRes.status === 'fulfilled' ? (sharedRes.value?.data?.data ?? []) : [];
      const personal = personalRes.status === 'fulfilled' ? (personalRes.value?.data?.data ?? []) : [];
      const categories = [...shared, ...personal];
      const unique = [...new Map(categories.filter((c) => !c.isDisabled).map((c) => [c.id, c])).values()];
      return { data: { data: unique } };
    } catch {
      return { data: { data: [] } };
    }
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
