import { apiClient } from './ApiClient';

export const bookingApi = {
  list(params) {
    return apiClient.get('/bookings', { params });
  },
  myBookings(params) {
    return apiClient.get('/bookings/my-bookings', { params });
  },
  assigned(params) {
    return apiClient.get('/bookings/assigned', { params });
  },
  landlordBookings(params) {
    return apiClient.get('/bookings/landlord', { params });
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
  confirm(id) {
    return apiClient.patch(`/bookings/${id}/confirm`);
  },
  reject(id) {
    return apiClient.patch(`/bookings/${id}/reject`);
  },
  cancel(id) {
    return apiClient.patch(`/bookings/${id}/cancel`);
  },
  remove(id) {
    return apiClient.delete(`/bookings/${id}`);
  },
  getBookingsByStatus(status) {
    return apiClient.get('/bookings', { params: { status } });
  },
  getBookingSummary() {
    return apiClient.get('/bookings/summary');
  },
  /**
   * Check for date overlap on a property.
   * Expects params: { propertyId, startDate, endDate }
   * Returns { hasOverlap: boolean, conflictingBookings: Booking[] }
   */
  checkOverlap(params) {
    return apiClient.get('/bookings/check-overlap', { params });
  },

  /* ── Application review (Part 4) ── */
  review(id, reviewer_notes) {
    return apiClient.patch(`/bookings/${id}/review`, { reviewer_notes });
  },
  requestInfo(id, reviewer_notes) {
    return apiClient.patch(`/bookings/${id}/request-info`, { reviewer_notes });
  },
  approve(id, data) {
    return apiClient.patch(`/bookings/${id}/approve`, data);
  },
  decline(id, reason) {
    return apiClient.patch(`/bookings/${id}/decline`, { reason });
  },
  withdraw(id) {
    return apiClient.patch(`/bookings/${id}/withdraw`);
  },

  /* ── Tenancy lifecycle (Part 8) ── */
  moveIn(id, data) {
    return apiClient.patch(`/bookings/${id}/move-in`, data);
  },
  submitNotice(id) {
    return apiClient.patch(`/bookings/${id}/notice`);
  },
  moveOut(id, data) {
    return apiClient.patch(`/bookings/${id}/move-out`, data);
  },
};