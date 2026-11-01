export function isAllowedOrigin(origin: string | undefined, configuredOrigins: string[], mode = 'production') {
  if (!origin || configuredOrigins.includes(origin)) return true;
  // Vite can choose another local port when one is occupied. These aliases are
  // development-only; deployed environments still require an explicit origin.
  if (mode === 'development') {
    return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):517[3-5]$/.test(origin);
  }
  return false;
}
