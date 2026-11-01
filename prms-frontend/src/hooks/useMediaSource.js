import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFullUrl } from '../config/apiBaseUrl';
import { getFileBlobUrl, isPrivateFile } from '../utils/privateFiles';

/** Normal image/video elements cannot attach the bearer header private media needs. */
export function useMediaSource(url) {
  const { user } = useAuth();
  const userId = user?.id || '';
  const fullUrl = /^(data:|blob:)/.test(url || '') ? url : getFullUrl(url);
  const protectedMedia = !!url && isPrivateFile(url);
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (!protectedMedia) return;
    const controller = new AbortController();
    let objectUrl;
    getFileBlobUrl(url, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) { URL.revokeObjectURL(result); return; }
      objectUrl = result;
      setLoaded({ url, userId, source: result, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setLoaded({ url, userId, source: '', failed: true });
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, protectedMedia, userId]);
  if (!protectedMedia) return { source: fullUrl, failed: false };
  return loaded?.url === url && loaded.userId === userId ? loaded : { source: '', failed: false };
}
