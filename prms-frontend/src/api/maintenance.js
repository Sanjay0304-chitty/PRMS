import { apiClient } from './ApiClient';

export const maintenanceApi = {
  list(params) {
    return apiClient.get('/maintenance', { params });
  },
  myTickets(params) {
    return apiClient.get('/maintenance/my-tickets', { params });
  },
  assigned(params) {
    return apiClient.get('/maintenance/assigned', { params });
  },
  getById(id) {
    return apiClient.get(`/maintenance/${id}`);
  },
  createTicket(data) {
    return apiClient.post('/maintenance', data);
  },
  getTicketsByStatus(status) {
    return apiClient.get('/maintenance', { params: { status } });
  },
  updateStatus(id, status) {
    return apiClient.put(`/maintenance/${id}`, { status });
  },
  update(id, data) {
    return apiClient.put(`/maintenance/${id}`, data);
  },
  resolve(id, inspectionNotes) {
    return apiClient.patch(`/maintenance/${id}/resolve`, { inspectionNotes });
  },
  addPhotos(id, files) {
    const form = new FormData();
    Array.from(files || []).forEach((file) => form.append('photos', file));
    return apiClient.post(`/maintenance/${id}/photos`, form);
  },
  assignToAgent(ticketId, agentId) {
    return apiClient.put(`/maintenance/${ticketId}`, { assignedTo: agentId });
  },
};
