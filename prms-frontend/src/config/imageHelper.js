import { propertyApi } from '../api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || window.location.origin || 'http://localhost:3500';

export function getImageUrl(url) {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
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
