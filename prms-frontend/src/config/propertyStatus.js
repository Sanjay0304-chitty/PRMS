export const PROPERTY_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', color: '#22c55e', tone: 'green' },
  { value: 'RENTED', label: 'Rented', color: '#3b82f6', tone: 'blue' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#f59e0b', tone: 'yellow' },
  { value: 'INACTIVE', label: 'Inactive', color: '#ef4444', tone: 'red' },
]

export function normalizePropertyStatus(status) {
  return String(status || '').trim().toUpperCase()
}

export function propertyStatusInfo(status) {
  const normalized = normalizePropertyStatus(status)
  return PROPERTY_STATUSES.find((item) => item.value === normalized) || {
    value: normalized,
    label: 'Unknown',
    color: '#6b7280',
    tone: 'gray',
  }
}

export function isPropertyAvailable(status) {
  return normalizePropertyStatus(status) === 'AVAILABLE'
}
