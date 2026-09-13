// Central navigation configuration by role (ADMIN-002, TECH-005)
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  CalendarClock,
  WalletCards,
  Wrench,
  MessageCircle,
  Settings,
  CircleHelp,
  Users,
  FileText,
  Tag,
  BarChart3,
  Bell,
  ShieldCheck,
  Palette,
  Lock,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

const roleRoutes = {
  Tenant:    { prefix: '/tenant',   pages: ['dashboard', 'notifications', 'properties', 'bookings', 'viewings', 'payments', 'maintenance', 'messages', 'settings'] },
  Landlord:  { prefix: '/landlord', pages: ['dashboard', 'notifications', 'properties', 'bookings', 'viewings', 'finance', 'heatmap', 'categories', 'maintenance', 'messages', 'settings'] },
  Agent:     { prefix: '/agent',    pages: ['dashboard', 'notifications', 'properties', 'bookings', 'viewings', 'maintenance', 'messages', 'categories', 'reports', 'finance', 'settings'] },
  Admin:     { prefix: '/admin',    pages: ['dashboard', 'notifications', 'users', 'properties', 'bookings', 'viewings', 'finance', 'maintenance', 'messages', 'reports', 'categories', 'audit-logs', 'privacy-requests', 'retention', 'breach-register', 'settings'] },
}

// Reachable only via Settings (e.g. "System Preferences", "Privacy & Personal
// Data") rather than their own sidebar icon - kept here so the topbar
// title/active-highlight still resolve correctly when a user is on one of
// these pages.
const HIDDEN_PAGES = ['customizer', 'privacy']

const pageMeta = {
  dashboard:    { label: 'Dashboard',       icon: LayoutDashboard },
  notifications:{ label: 'Notifications',   icon: Bell },
  properties:   { label: 'Properties',      icon: Building2 },
  bookings:     { label: 'Applications',    icon: CalendarDays },
  viewings:     { label: 'Viewings',        icon: CalendarClock },
  payments:     { label: 'Payments',        icon: WalletCards },
  finance:      { label: 'Finance',         icon: WalletCards },
  heatmap:      { label: 'Heatmap',         icon: BarChart3 },
  maintenance:  { label: 'Maintenance',     icon: Wrench },
  messages:     { label: 'Messages',        icon: MessageCircle },
  settings:     { label: 'Settings',        icon: Settings },
  categories:   { label: 'Categories',      icon: Tag },
  users:        { label: 'Users',           icon: Users },
  reports:      { label: 'Reports',         icon: FileText },
  customizer:   { label: 'Customizer',      icon: Palette },
  privacy:      { label: 'Privacy',         icon: Lock },
  help:         { label: 'Help',            icon: CircleHelp },
  'audit-logs': { label: 'Audit Logs',      icon: ShieldCheck },
  'privacy-requests': { label: 'Privacy Requests', icon: Lock },
  retention:          { label: 'Retention',        icon: Trash2 },
  'breach-register':  { label: 'Breach Register',  icon: AlertTriangle },
}

/** Build sidebar nav items for a given role */
export function buildNavItems(role) {
  const entry = roleRoutes[role] || roleRoutes.Tenant
  return entry.pages.map((p) => ({
    key: p,
    label: pageMeta[p]?.label || p,
    icon: pageMeta[p]?.icon || LayoutDashboard,
    path: p === 'dashboard' ? entry.prefix : `${entry.prefix}/${p}`,
  }))
}

/** Determine active page key from pathname and role prefix */
export function resolveActivePage(pathname, role) {
  const entry = roleRoutes[role] || roleRoutes.Tenant
  const prefix = entry.prefix
  if (pathname === prefix) return 'dashboard'
  for (const p of entry.pages) {
    if (pathname.includes(`${prefix}/${p}`)) return p
  }
  for (const p of HIDDEN_PAGES) {
    if (pathname.includes(`${prefix}/${p}`)) return p
  }
  if (pathname.includes(`${prefix}/help`)) return 'help'
  return 'dashboard'
}

export { roleRoutes, pageMeta }
