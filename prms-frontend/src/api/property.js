import { apiClient } from './ApiClient';

export const propertyApi = {
  /* Public */
  list(params) {
    return apiClient.get('/properties', { params });
  },
  getById(id) {
    return apiClient.get(`/properties/${id}`);
  },

  /* Authenticated */
  myProperties() {
    return apiClient.get('/properties/my-properties');
  },
  create(data) {
    return apiClient.post('/properties', data);
  },
  update(id, data) {
    return apiClient.put(`/properties/${id}`, data);
  },
  deactivate(id) {
    return apiClient.delete(`/properties/${id}`);
  },

  /* Images */
  addImage(propertyId, formData) {
    return apiClient.post(`/properties/${propertyId}/images`, formData, {
      headers: { 'Content-Type': undefined },
    });
  },
  deleteImage(imageId) {
    return apiClient.delete(`/properties/images/${imageId}`);
  },

  /* Videos */
  addVideo(propertyId, formData) {
    return apiClient.post(`/properties/${propertyId}/videos`, formData, {
      headers: { 'Content-Type': undefined },
    });
  },
  deleteVideo(propertyId, url) {
    return apiClient.delete(`/properties/${propertyId}/videos`, {
      params: { url: encodeURIComponent(url) },
    });
  },

  /* Documents */
  addDocument(propertyId, formData) {
    return apiClient.post(`/properties/${propertyId}/documents`, formData, {
      headers: { 'Content-Type': undefined },
    });
  },
  deleteDocument(propertyId, url) {
    return apiClient.delete(`/properties/${propertyId}/documents`, {
      params: { url: encodeURIComponent(url) },
    });
  },

  // Generic uploadFile endpoint (kept for progress callbacks)
  uploadFile(formData, onUploadProgress) {
    return apiClient.post('/upload/file', formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress,
    });
  },
};