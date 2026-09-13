/**
 * Canonical property type taxonomy. Stored on Property.property_type as the
 * lowercase `value`. This is the single source of truth — AddProperty,
 * PropertyEdit, and the Properties list filter all read from here so a type
 * created on one page is always recognized (and filterable) on the others.
 */
export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

export function propertyTypeLabel(value) {
  const match = PROPERTY_TYPES.find((t) => t.value === (value || '').toLowerCase());
  return match ? match.label : (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Property');
}
