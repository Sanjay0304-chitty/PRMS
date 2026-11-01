import { apiClient } from '../api/ApiClient';
import { getFullUrl, getApiBaseUrl } from '../config/apiBaseUrl';

export function isPrivateFile(url) {
  if (!url) return false;
  const target = new URL(getFullUrl(url), window.location.origin);
  const api = new URL(getApiBaseUrl(), window.location.origin);
  return target.origin === api.origin && /^\/(files\/|uploads\/|api\/files\/thumbnails\/)/.test(target.pathname);
}

export async function getFileBlobUrl(url, options = {}) {
  const target = new URL(getFullUrl(url), window.location.origin);
  const api = new URL(getApiBaseUrl(), window.location.origin);
  if (target.origin !== api.origin) throw new Error('This file is hosted outside PRMS.');
  const response = await apiClient.get(target.href, { responseType: 'blob', signal: options.signal });
  return URL.createObjectURL(response.data);
}

export async function openPrivateFile(url, download = false) {
  if (!isPrivateFile(url)) {
    window.open(getFullUrl(url), '_blank', 'noopener,noreferrer');
    return;
  }
  // Open synchronously to avoid browser popup blockers after the request completes.
  const forceDownload = download || /\.(svg|html?|xml)(?:[?#]|$)/i.test(url);
  const tab = forceDownload ? null : window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const blobUrl = await getFileBlobUrl(url);
    if (forceDownload || !tab) {
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = decodeURIComponent(new URL(getFullUrl(url)).pathname.split('/').pop());
      anchor.click();
    } else {
      tab.location.replace(blobUrl);
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch {
    tab?.close();
    throw new Error('Unable to open this file. Please check your access or sign in again.');
  }
}
