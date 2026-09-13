import { apiClient } from './ApiClient';

export const userApi = {
  list(params) {
    return apiClient.get('/users', { params });
  },
  getById(id) {
    return apiClient.get(`/users/${id}`);
  },
  create(data) {
    return apiClient.post('/users', data);
  },
  update(id, data) {
    return apiClient.put(`/users/${id}`, data);
  },
  remove(id) {
    return apiClient.delete(`/users/${id}`);
  },
  activate(id) {
    return apiClient.post(`/users/${id}/activate`);
  },
  suspend(id) {
    return apiClient.post(`/users/${id}/suspend`);
  },
  changeRole(id, data) {
    return apiClient.post(`/users/${id}/change-role`, data);
  },
};
