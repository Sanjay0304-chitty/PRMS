import { propertyApi } from '../api';
import { getApiBaseUrl } from './apiBaseUrl';

export function getImageUrl(url) {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

export async function loadFirstImageUrl(propertyId) {
  try {
    const res = await propertyApi.getById(propertyId);
    if (res?.data?.images?.[0]?.url) {
      return `${API_BASE}${res.data.images[0].url}`;
    }
  } catch { /* ignore */ }
  return '';
}
