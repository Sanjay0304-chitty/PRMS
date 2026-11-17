import path from 'path';

/**
 * Checks whether an incoming request path targets an SPA client-side route
 * rather than an API endpoint, server-rendered static file, or healthcheck.
 */
export const isSpaPagePath = (reqPath: string): boolean => (
  !reqPath.startsWith('/api') &&
  !reqPath.startsWith('/uploads') &&
  !reqPath.startsWith('/files') &&
  !reqPath.startsWith('/images') &&
  !reqPath.startsWith('/health') &&
  !path.extname(reqPath)
);

/**
 * Returns true only if the client explicitly requested JSON and did NOT request HTML.
 * Browser navigations (including iOS Safari and mobile webviews) send text/html or wildcard
 * accept headers, which should be served the SPA index.html.
 */
export const isExplicitJsonRequest = (acceptHeader?: string): boolean => {
  if (!acceptHeader) return false;
  return acceptHeader.includes('application/json') && !acceptHeader.includes('text/html');
};
