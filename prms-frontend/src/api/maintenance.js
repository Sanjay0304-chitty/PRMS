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
  assignToAgent(ticketId, agentId) {
    return apiClient.put(`/maintenance/${ticketId}`, { assignedTo: agentId });
  },
};