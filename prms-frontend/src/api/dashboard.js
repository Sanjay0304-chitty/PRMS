import { apiClient } from './ApiClient';

/**
 * Lightweight dashboard module.
 * Pulls from the existing booking / maintenance / property modules
 * and returns a flat summary suitable for the landlord dashboard.
 */
export const dashboardApi = {
  /** Fetch landlord overview stats. */
  getLandlordStats() {
    /* We call list endpoints and compute counts client-side */
    return apiClient.get('/admin/dashboard');
  },

  list(params) {
    return apiClient.get('/bookings', { params });
  },
  myBookings() {
    return apiClient.get('/bookings/my-bookings');
  },
  getById(id) {
    return apiClient.get(`/bookings/${id}`);
  },
  create(data) {
    return apiClient.post('/bookings', data);
  },
  update(id, data) {
    return apiClient.put(`/bookings/${id}`, data);
  },
  cancel(id) {
    return apiClient.patch(`/bookings/${id}/cancel`);
  },
};
