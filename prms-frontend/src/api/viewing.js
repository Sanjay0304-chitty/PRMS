import { apiClient } from './ApiClient';

export const viewingApi = {
  request(data) {
    return apiClient.post('/viewings', data);
  },
  mine() {
    return apiClient.get('/viewings/mine');
  },
  landlord() {
    return apiClient.get('/viewings/landlord');
  },
  assigned() {
    return apiClient.get('/viewings/assigned');
  },
  all() {
    return apiClient.get('/viewings/all');
  },
  reschedule(id, data) {
    return apiClient.patch(`/viewings/${id}/reschedule`, data);
  },
  cancel(id) {
    return apiClient.patch(`/viewings/${id}/cancel`);
  },
  accept(id) {
    return apiClient.patch(`/viewings/${id}/accept`);
  },
  proposeAlternate(id, proposedTime) {
    return apiClient.patch(`/viewings/${id}/propose`, { proposedTime });
  },
  confirmAttendance(id) {
    return apiClient.patch(`/viewings/${id}/confirm`);
  },
  markCompleted(id) {
    return apiClient.patch(`/viewings/${id}/complete`);
  },
  markNoShow(id) {
    return apiClient.patch(`/viewings/${id}/no-show`);
  },
};
