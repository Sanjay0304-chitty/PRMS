import { apiClient } from './ApiClient';

export const agreementApi = {
  generate(bookingId, terms) {
    return apiClient.post('/agreements', { bookingId, terms });
  },
  getById(id) {
    return apiClient.get(`/agreements/${id}`);
  },
  getByBooking(bookingId) {
    return apiClient.get(`/agreements/booking/${bookingId}`);
  },
  update(id, data) {
    return apiClient.put(`/agreements/${id}`, data);
  },
  tenantConsent(id, legalName) {
    return apiClient.post(`/agreements/${id}/consent`, { legalName });
  },
  verifyOtp(id, otp) {
    return apiClient.post(`/agreements/${id}/verify-otp`, { otp });
  },
  landlordSign(id, legalName) {
    return apiClient.post(`/agreements/${id}/landlord-sign`, { legalName });
  },
  uploadPhysical(id, formData) {
    return apiClient.post(`/agreements/${id}/physical-copy`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  verifyPhysical(id) {
    return apiClient.post(`/agreements/${id}/verify-physical`);
  },
  cancel(id) {
    return apiClient.patch(`/agreements/${id}/cancel`);
  },
  remind(id) {
    return apiClient.post(`/agreements/${id}/remind`);
  },
};
