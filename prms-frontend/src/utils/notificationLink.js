export function notificationLink(notification, role) {
  if (role?.toLowerCase() !== 'admin' || !notification?.type?.startsWith('property_reported')) return null;
  const id = notification.type.startsWith('property_reported:') ? notification.type.slice('property_reported:'.length) : '';
  return `/admin/audit-logs?view=reports${id ? `&report=${encodeURIComponent(id)}` : ''}`;
}
