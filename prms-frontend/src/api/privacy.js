import { apiClient } from './ApiClient';

export const privacyApi = {
  // Consent
  recordConsent(data) {
    return apiClient.post('/privacy/consent', data);
  },
  myConsents() {
    return apiClient.get('/privacy/consent/mine');
  },
  withdrawConsent(id) {
    return apiClient.patch(`/privacy/consent/${id}/withdraw`);
  },

  // My stored data
  myStoredData() {
    return apiClient.get('/privacy/me');
  },

  // Privacy requests
  submitRequest(data) {
    return apiClient.post('/privacy/requests', data);
  },
  myRequests() {
    return apiClient.get('/privacy/requests/mine');
  },
  allRequests(status) {
    return apiClient.get('/privacy/requests', { params: status ? { status } : undefined });
  },
  assignRequest(id) {
    return apiClient.patch(`/privacy/requests/${id}/assign`);
  },
  decideRequest(id, decision, decisionReason) {
    return apiClient.patch(`/privacy/requests/${id}/decide`, { decision, decisionReason });
  },
  completeRequest(id) {
    return apiClient.patch(`/privacy/requests/${id}/complete`);
  },

  // Retention (admin)
  getRetentionPolicies() {
    return apiClient.get('/privacy/retention');
  },
  updateRetentionPolicy(category, retentionDays) {
    return apiClient.put(`/privacy/retention/${category}`, { retentionDays });
  },
  simulateCleanup() {
    return apiClient.post('/privacy/retention/simulate');
  },

  // Breach register (admin)
  getIncidents() {
    return apiClient.get('/privacy/breaches');
  },
  createIncident(data) {
    return apiClient.post('/privacy/breaches', data);
  },
  updateIncident(id, data) {
    return apiClient.patch(`/privacy/breaches/${id}`, data);
  },
};
