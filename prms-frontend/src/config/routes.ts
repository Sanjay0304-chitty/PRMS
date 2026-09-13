/* ──────────────────────────────────────────────────────
   Single source of truth for all routes (Issue #9)
   Import this module from ANY page/component.
   ───────────────────────────────────────────────────── */

import type { RouteObject } from 'react-router-dom';

export const ROUTES = {
  public: {
    home: '/',
    login: '/login',
    register: '/register',
    roleSelection: '/role-selection',
    properties: '/properties',
    propertyDetails: (id: string) => `/properties/${id}`,
    search: '/search',
  } as const,

  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    notifications: '/admin/notifications',
    users: '/admin/users',
    properties: '/admin/properties',
    propertyAdd: '/admin/properties/add',
    propertyEdit: '/admin/properties/edit',
    propertyDetail: (id: string) => `/admin/properties/${id}`,
    bookings: '/admin/bookings',
    finance: '/admin/finance',
    maintenance: '/admin/maintenance',
    messages: '/admin/messages',
    reports: '/admin/reports',
    categories: '/admin/categories',
    settings: '/admin/settings',
    profile: '/admin/profile',
    customizer: '/admin/customizer',
    auditLogs: '/admin/audit-logs',
    help: '/admin/help',
  } as const,

  landlord: {
    root: '/landlord',
    dashboard: '/landlord/dashboard',
    notifications: '/landlord/notifications',
    properties: '/landlord/properties',
    propertyAdd: '/landlord/properties/add',
    propertyEdit: '/landlord/properties/edit',
    propertyDetail: (id: string) => `/landlord/properties/${id}`,
    bookings: '/landlord/bookings',
    finance: '/landlord/finance',
    heatmap: '/landlord/heatmap',
    maintenance: '/landlord/maintenance',
    messages: '/landlord/messages',
    settings: '/landlord/settings',
    profile: '/landlord/profile',
    customizer: '/landlord/customizer',
    help: '/landlord/help',
  } as const,

  tenant: {
    root: '/tenant',
    dashboard: '/tenant/dashboard',
    notifications: '/tenant/notifications',
    properties: '/tenant/properties',
    propertyDetail: (id: string) => `/tenant/properties/${id}`,
    bookings: '/tenant/bookings',
    payments: '/tenant/payments',
    paymentDetails: (id: string) => `/tenant/payments/${id}`,
    maintenance: '/tenant/maintenance',
    messages: '/tenant/messages',
    settings: '/tenant/settings',
    profile: '/tenant/profile',
    customizer: '/tenant/customizer',
    help: '/tenant/help',
  } as const,

  agent: {
    root: '/agent',
    dashboard: '/agent/dashboard',
    notifications: '/agent/notifications',
    properties: '/agent/properties',
    propertyDetail: (id: string) => `/agent/properties/${id}`,
    bookings: '/agent/bookings',
    finance: '/agent/finance',
    maintenance: '/agent/maintenance',
    reports: '/agent/reports',
    categories: '/agent/categories',
    settings: '/agent/settings',
    profile: '/agent/profile',
    customizer: '/agent/customizer',
    help: '/agent/help',
  } as const,

  unauthorized: '/unauthorized',
} as const;

/* ────────────  Role-to-dashboard mapping  ─────────── */

export const ROLE_ROUTES: Record<string, string> = {
  admin: ROUTES.admin.dashboard,
  landlord: ROUTES.landlord.dashboard,
  tenant: ROUTES.tenant.dashboard,
  agent: ROUTES.agent.dashboard,
};

export const VALID_ROLES = Object.keys(ROLE_ROUTES);

/* ──────────────  Helpers  ────────────── */

/** Resolve the dashboard path for the given role name (case-insensitive) */
export function roleToPath(role: string | null | undefined): string {
  if (!role) return ROUTES.public.login;
  const lower = role.toLowerCase();
  if (lower.includes('admin')) return ROLE_ROUTES.admin;
  if (lower.includes('landlord')) return ROLE_ROUTES.landlord;
  if (lower.includes('tenant')) return ROLE_ROUTES.tenant;
  if (lower.includes('agent')) return ROLE_ROUTES.agent;
  return ROUTES.public.login;
}

/** Get the correct property page for the current role */
export function getPropertyRoute(role: string | null | undefined): string {
  if (!role) return ROUTES.public.properties;
  const lower = role.toLowerCase();
  if (lower.includes('admin')) return ROUTES.admin.properties;
  if (lower.includes('landlord')) return ROUTES.landlord.properties;
  if (lower.includes('tenant')) return ROUTES.tenant.properties;
  if (lower.includes('agent')) return ROUTES.agent.properties;
  return ROUTES.public.properties;
}

/** Get the correct property-detail path for the current role */
export function getPropertyDetailPath(
  role: string | null | undefined,
  id: string,
): string {
  if (!role) return ROUTES.public.propertyDetails(id);
  const lower = role.toLowerCase();
  if (lower.includes('admin')) return ROUTES.admin.propertyDetail(id);
  if (lower.includes('landlord')) return ROUTES.landlord.propertyDetail(id);
  if (lower.includes('tenant')) return ROUTES.tenant.propertyDetail(id);
  if (lower.includes('agent')) return ROUTES.agent.propertyDetail(id);
  return ROUTES.public.propertyDetails(id);
}

/** Get the correct messages page for the current role */
export function getMessagesRoute(role: string | null | undefined): string {
  if (!role) return ROUTES.public.login;
  const lower = role.toLowerCase();
  if (lower.includes('admin')) return ROUTES.admin.messages;
  if (lower.includes('landlord')) return ROUTES.landlord.messages;
  if (lower.includes('tenant')) return ROUTES.tenant.messages;
  if (lower.includes('agent')) return ROUTES.agent.messages;
  return ROUTES.public.login;
}

/** Get the correct add-property route for the role that has it (Landlord / Admin) */
export function getAddPropertyRoute(
  role: string | null | undefined,
): string | null {
  if (!role) return null;
  const lower = role.toLowerCase();
  if (lower.includes('admin')) return ROUTES.admin.propertyAdd;
  if (lower.includes('landlord')) return ROUTES.landlord.propertyAdd;
  return null;
}

/**
 * Build a React-Router v7 <Route> object for the given path + element.
 * Convenience helper to reduce boilerplate in App.jsx role sections.
 */
export function route(
  path: string,
  element: React.ReactNode,
): RouteObject {
  return { path, element };
}