export function safePropertyReturn(value) {
  return typeof value === 'string' && /^\/properties\/[a-zA-Z0-9_-]+$/.test(value) ? value : null;
}
export function rememberPropertyReturn(value) {
  const safe = safePropertyReturn(value);
  if (safe) sessionStorage.setItem('prmsPropertyReturn', safe);
  return safe;
}
export function consumePropertyReturn(role) {
  const value = safePropertyReturn(sessionStorage.getItem('prmsPropertyReturn'));
  sessionStorage.removeItem('prmsPropertyReturn');
  return String(role).toLowerCase() === 'tenant' ? value : null;
}
export function intendedPublicRole(value) {
  return ['Tenant', 'Landlord', 'Agent'].find(role => role.toLowerCase() === String(value).toLowerCase()) || null;
}
