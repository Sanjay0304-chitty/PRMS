import { apiClient } from './ApiClient';
import { getApiBaseUrl } from '../config/apiBaseUrl';

export const customizerApi = {
  async getConfig() {
    return apiClient.get('/customizer/config').then(r => r.data);
  },

  async updateConfig(payload) {
    return apiClient.put('/customizer/config', payload).then(r => r.data);
  },

  async uploadLogo(formData) {
    return apiClient.post('/customizer/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  async removeLogo() {
    return apiClient.delete('/customizer/logo').then(r => r.data);
  },

  getPreviewUrl(theme = 'light') {
    const base = getApiBaseUrl();
    return `${base}/customizer/preview?theme=${theme}`;
  },
};
