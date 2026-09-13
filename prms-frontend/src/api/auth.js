import { apiClient } from './ApiClient';

/*  Auth endpoints  */

export const authApi = {
  register({ email, password, full_name, phone, role, consents }) {
    return apiClient.post('/auth/register', {
      email,
      password,
      full_name,
      phone,
      role,
      consents,
    });
  },

  login: ({ email, password }) => apiClient.post('/auth/login', { email, password }),

  googleLogin(googleAuth) {
    return apiClient.post('/auth/google', {
      idToken: googleAuth.idToken,
      email: googleAuth.email,
      displayName: googleAuth.displayName,
    });
  },

  refresh({ refreshToken }) {
    return apiClient.post('/auth/refresh', { refreshToken });
  },

  logout() {
    return apiClient.post('/auth/logout');
  },

  getMe() {
    return apiClient.get('/auth/me');
  },

  updateMe(data) {
    return apiClient.put('/auth/me', data);
  },

  uploadProfileImage(file) {
    const formData = new FormData();
    formData.append('profileImage', file);
    return apiClient.post('/auth/me/avatar', formData);
  },

  changePassword({ currentPassword, newPassword }) {
    return apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  setPassword({ newPassword }) {
    return apiClient.post('/auth/set-password', { newPassword });
  },

  forgotPassword({ email }) {
    return apiClient.post('/auth/forgot-password', { email });
  },

  verifyOtp({ email, otp }) {
    return apiClient.post('/auth/verify-otp', { email, otp });
  },

  resetPassword({ email, otp, newPassword, confirmPassword }) {
    return apiClient.post('/auth/reset-password', {
      email,
      otp,
      newPassword,
      confirmPassword,
    });
  },
};
