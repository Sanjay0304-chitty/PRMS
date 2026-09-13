import { apiClient } from './ApiClient';

const client = apiClient;

export function uploadFile(file, description = '') {
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }

  return client.post('/users/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}

export function downloadFile(fileId) {
  return client.get(`/users/files/${fileId}/download`)
    .then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}

export function listFiles(page = 1, limit = 10, category = undefined) {
  const params = { page, limit };
  if (category) params.category = category;
  return client.get('/users/files', { params })
    .then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}

export function getUserMedia(fileType) {
  const params = fileType ? { fileType } : {};
  return client.get('/users/my-media', { params })
    .then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}

export function getFile(fileId) {
  return client.get(`/users/files/${fileId}`)
    .then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}

export function deleteFile(fileId) {
  return client.delete(`/users/files/${fileId}`)
    .then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}

export function deletePropertyImage(imageId) {
  return client.delete(`/users/my-media/images/${imageId}`)
    .then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}

export function getPublicUrl(fileId) {
  return client.get(`/users/files/${fileId}/public-url`)
    .then(res => res.data)
    .catch(err => {
      const msg = err.response?.data?.error?.message || err.message;
      return { success: false, error: { message: msg } };
    });
}
