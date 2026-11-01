/** Keep production limits explicit while allowing normal local development traffic. */
export function apiRequestBudget(mode: string, configuredLimit: number) {
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 100;
  return mode === 'development' ? Math.max(2000, limit) : limit;
}
