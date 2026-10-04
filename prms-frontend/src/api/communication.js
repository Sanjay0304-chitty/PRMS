import { apiClient } from './ApiClient';

/* Existing messaging endpoints */
export const communicationApi = {
  /* Messages */
  list(params) {
    return apiClient.get('/communication', { params });
  },
  contacts() {
    return apiClient.get('/communication/contacts');
  },
  send(data) {
    return apiClient.post('/communication/send', data);
  },
  getMessages(conversationId) {
    return apiClient.get(`/communication/conversation/${conversationId}`);
  },
  markMessageRead(id) {
    return apiClient.patch(`/communication/${id}/mark-read`);
  },
  editMessage(id, content) {
    return apiClient.patch(`/communication/${id}`, { content });
  },
  unsendMessage(id) {
    return apiClient.delete(`/communication/${id}`);
  },

  /* Notifications */
  getNotifications(params) {
    return apiClient.get('/notifications', { params });
  },
  markRead(id) {
    return apiClient.patch(`/notifications/${id}/read`);
  },
  markNotificationRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead() {
    return apiClient.patch('/notifications/read-all');
  },
  markAllNotificationsRead: () => apiClient.patch('/notifications/read-all'),
  deleteNotification(id) {
    return apiClient.delete(`/notifications/${id}`);
  },
};
