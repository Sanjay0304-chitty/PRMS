import { propertyApi } from '../api';
import { getFullUrl } from './apiBaseUrl';

export function getImageUrl(url) {
  return getFullUrl(url);
}

export async function loadFirstImageUrl(propertyId) {
  try {
    const res = await propertyApi.getById(propertyId);
    if (res?.data?.images?.[0]?.url) {
      return getFullUrl(res.data.images[0].url);
    }
  } catch { /* ignore */ }
  return '';
}
