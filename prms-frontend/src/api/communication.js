import { apiClient } from './ApiClient';

/* Existing messaging endpoints */
export const communicationApi = {
  /* Messages */
  list(params) {
    return apiClient.get('/communication', { params });
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

  /* Notifications -- routes live under /admin */
  getNotifications(params) {
    return apiClient.get('/admin/notifications', { params });
  },
  markRead(id) {
    return apiClient.patch(`/admin/notifications/${id}/read`);
  },
  markNotificationRead: (id) => apiClient.patch(`/admin/notifications/${id}/read`),
  markAllRead() {
    return apiClient.patch('/admin/notifications/read-all');
  },
  markAllNotificationsRead: () => apiClient.patch('/admin/notifications/read-all'),
  deleteNotification(id) {
    return apiClient.delete(`/admin/notifications/${id}`);
  },
};