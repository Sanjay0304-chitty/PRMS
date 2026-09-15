/**
 * Resolves the API base URL for browser requests.
 *
 * Priority:
 *   1. VITE_API_BASE_URL (set at build time via .env files)
 *   2. window.location.origin — the current page's host (dev, staging, prod)
 *
 * This avoids the common problem where a hardcoded fallback like
 * 'http://localhost:3500' is wrong when the frontend is served from
 * a different host (staging on 192.168.1.140:3500, production, etc.).
 *
 * Uses window.location.origin (not document.location.origin) to guard
 * against SSR/hydration edge-cases where document may not be ready.
 */

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl !== '') return envUrl;
  // Backend runs on port 3500 by default. Only use window.location.origin
  // when the frontend and backend are served from the same host/port
  // (e.g. production build behind a reverse proxy).
  // The .gitignore'd .env.development sets VITE_API_BASE_URL for dev.
  return 'http://localhost:3500';
}

/**
 * Join the API base URL with a relative path, stripping trailing/leading
 * slashes so that double-slashes like "http://host//path" never happen.
 *
 * If the path is already an absolute URL (http/https), it is returned as-is.
 */
export function getFullUrl(path) {
  if (!path || path.startsWith('http')) return path;
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const rel = path.replace(/^\/+/, '');
  return `${base}/${rel}`;
}
