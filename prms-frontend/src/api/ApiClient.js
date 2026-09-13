import axios from 'axios';
import {getApiBaseUrl} from '../config/apiBaseUrl';

const BASE_URL = getApiBaseUrl();

/* ------------------------------------------------------------------ */
/* Core Axios instance                                                */
/* ------------------------------------------------------------------ */

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ------------------------------------------------------------------ */
/* Request interceptor                                                */
/* ------------------------------------------------------------------ */

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');

    if (
      token &&
      token !== 'undefined' &&
      token !== 'null'
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Strip Content-Type for FormData so Axios sets the correct multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------------------------------------------------------ */
/* Refresh state                                                      */
/* ------------------------------------------------------------------ */

let isRefreshing = false;
let failedQueue = [];
let isLoggingOut = false;

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

/* ------------------------------------------------------------------ */
/* Refresh helper                                                     */
/* ------------------------------------------------------------------ */

async function refreshToken() {
  const refreshTokenValue = sessionStorage.getItem('refreshToken');

  if (
    !refreshTokenValue ||
    refreshTokenValue === 'undefined' ||
    refreshTokenValue === 'null'
  ) {
    throw new Error('Missing refresh token');
  }

  const response = await axios.post(
    `${BASE_URL}/auth/refresh`,
    {
      refreshToken: refreshTokenValue,
    }
  );

  return response.data;
}

/* ------------------------------------------------------------------ */
/* Response interceptor                                               */
/* ------------------------------------------------------------------ */

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/login'
    ) {
      if (
        window.__prmsHydrating === true &&
        originalRequest.url === '/auth/me'
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve,
            reject,
          });
        })
          .then((token) => {
            originalRequest.headers.Authorization =
              `Bearer ${token}`;

            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const data = await refreshToken();

        const tokens =
          data?.data?.tokens ||
          data?.tokens ||
          {};

        const newAccessToken =
          tokens.accessToken;

        if (!newAccessToken) {
          throw new Error(
            'Refresh response missing access token'
          );
        }

        sessionStorage.setItem(
          'accessToken',
          newAccessToken
        );

        if (tokens.refreshToken) {
          sessionStorage.setItem(
            'refreshToken',
            tokens.refreshToken
          );
        }

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        logoutUser();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------ */
/* Logout helper                                                      */
/* ------------------------------------------------------------------ */

function logoutUser() {
  if (isLoggingOut) return;

  isLoggingOut = true;

  sessionStorage.clear();
  
  setTimeout(() => {
    isLoggingOut = false;
  }, 1000);
}

/* ------------------------------------------------------------------ */
/* Error helper                                                       */
/* ------------------------------------------------------------------ */

function getApiError(error) {
  if (!error.response) {
    return error.message || 'Network error';
  }

  const body = error.response.data;

  return (
    body?.message ||
    body?.error?.message ||
    body?.error ||
    'Server error'
  );
}

export {
  apiClient,
  BASE_URL,
  logoutUser,
  getApiError,
};