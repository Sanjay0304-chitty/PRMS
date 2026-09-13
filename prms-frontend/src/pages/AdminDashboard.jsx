import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../api/ApiClient'
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Database,
  Download,
  Loader,
  Minus,
  Search,
  Server,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react'
import './AdminDashboard.css'

/* ------------------------------------------------------------------ */
/*  API helpers                                                       */
/* ------------------------------------------------------------------ */

const API_ENDPOINTS = {
  dashboard: '/reports/dashboard',
  occupancy: '/reports/occupancy',
  properties: '/reports/properties',
  users: '/users',
  auditLogs: '/admin/audit-logs',
}

function fetchJson(url) {
  return apiClient.get(url).then((r) => r.data)
}

/* ------------------------------------------------------------------ */
/*  Timestamp helpers                                                 */
/* ------------------------------------------------------------------ */

function formatTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatRelative(dateStr) {
  if (!dateStr) return '—'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatCurrency(value) {
  const num = Number(value) || 0
  if (num >= 1_000_000) return `RM ${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `RM ${num / 1_000}.0K`
  return `RM ${num.toLocaleString('en-MY')}`
}

function formatCompact(value) {
  const num = Number(value) || 0
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k'
  return num.toLocaleString('en-MY')
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

function AdminDashboard() {
  // Loading / error state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Real data
  const [stats, setStats] = useState(null)
  const [occupancy, setOccupancy] = useState(null)
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [auditLogs, setAuditLogs] = useState([])
  const [properties, setProperties] = useState([])

  useEffect(() => {
    localStorage.setItem('prmsDashboardPath', '/admin')

    // Fetch all dashboard data in parallel
    Promise.allSettled([
      fetchJson(API_ENDPOINTS.dashboard).then((d) => d?.data ?? d),
      fetchJson(API_ENDPOINTS.occupancy).then((d) => d?.data ?? d),
      fetchJson(API_ENDPOINTS.properties).then((d) => d?.data ?? d),
      fetchJson(API_ENDPOINTS.users).then((d) => (Array.isArray(d?.data) ? d.data : d?.data?.users ?? d?.users ?? []).slice(0, 8)),
      fetchJson(API_ENDPOINTS.auditLogs + '?limit=12').then((d) => d?.data?.logs ?? d?.logs ?? d?.data ?? []),
    ])
      .then(([dash, occ, props, usr, logs]) => {
        // Promise.allSettled wraps each result in {status, value|reason}
        setStats(dash.status === 'fulfilled' ? dash.value : null)
        setOccupancy(occ.status === 'fulfilled' ? occ.value : null)
        setProperties(props.status === 'fulfilled' && Array.isArray(props.value) ? props.value : [])
        setUsers(usr.status === 'fulfilled' && Array.isArray(usr.value) ? usr.value : [])
        setAuditLogs(logs.status === 'fulfilled' && Array.isArray(logs.value) ? logs.value : [])

        const failures = [dash, occ, props, usr, logs].filter((r) => r.status === 'rejected')
        setError(failures.length ? failures[0].reason?.message || 'Some dashboard data failed to load' : null)
      })
      .finally(() => {
        // Short delay so skeleton is visible briefly
        setTimeout(() => setLoading(false), 400)
      })
  }, [])

  /* ---- KPI data ---- */
  const kpiData = useMemo(() => {
    if (!stats) return null

    // Total transactions (revenue)
    const revenue = stats.totalRevenue || 0

    return [
      {
        icon: Activity,
        iconBg: 'icon-emerald',
        label: 'Active Users',
        value: formatCompact(stats.totalUsers),
        sublabel: `${stats.totalProperties} properties listed`,
        // No historical snapshot exists yet to compute a real change-over-time
        // trend, so we don't show a fake "+N" pill that just repeats the total.
      },
      {
        icon: WalletCards,
        iconBg: 'icon-purple',
        label: 'Total Revenue',
        value: formatCurrency(revenue),
        sublabel: `${stats.totalBookings || 0} bookings processed`,
      },
      {
        icon: Database,
        iconBg: 'icon-blue',
        label: 'Occupancy',
        value: occupancy ? `${occupancy.occupancyRate}%` : '—',
        sublabel: `${occupancy ? occupancy.activeBookings : 0} active of ${occupancy ? occupancy.totalProperties || 0 : 0} total`,
      },
      {
        icon: ShieldCheck,
        iconBg: 'icon-rose',
        label: 'System Integrity',
        value: 'Secure',
        sublabel: `${Array.isArray(auditLogs) ? auditLogs.length : 0} recent audit events`,
        trend: 'OK',
        trendDir: 'up',
      },
    ]
  }, [stats, occupancy, auditLogs])

  /* ---- Property clusters (group by status) ---- */
  const propertyClusters = useMemo(() => {
    if (!properties.length) return []
    const byStatus = {}
    for (const p of properties) {
      const key = p?.status || 'Unknown'
      if (!byStatus[key]) byStatus[key] = { label: key, count: 0, bookings: 0 }
      byStatus[key].count += 1
      byStatus[key].bookings += p?.bookingCount || 0
    }
    return Object.values(byStatus).slice(0, 4)
  }, [properties])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) =>
      (user.full_name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      getRoleName(user).toLowerCase().includes(q)
    )
  }, [users, userSearch])

  /* ---- KPI Card helper ---- */
  function KpiCard({ icon: Icon, iconBg, label, value, sublabel, trend, trendDir }) {
    const TrendIcon =
      trendDir === 'up' ? (
        <ArrowUp size={14} className="text-status-success" />
      ) : trendDir === 'down' ? (
        <ArrowDown size={14} className="text-status-error" />
      ) : (
        <Minus size={14} className="text-text-secondary" />
      )

    return (
      <div className="kpi-card">
        <div className="kpi-card-top">
          <div className={`kpi-icon-wrap ${iconBg}`}>
            <Icon size={20} />
          </div>
          {trend && (
            <span className={`trend-pill ${trendDir === 'up' ? 'positive' : trendDir === 'down' ? 'negative' : 'neutral'}`}>
              {TrendIcon}
              {trend}
            </span>
          )}
        </div>
        <div className="kpi-card-body">
          <span className="kpi-label">{label}</span>
          <div className="kpi-value">{value}</div>
          {sublabel && <span className="kpi-sublabel">{sublabel}</span>}
        </div>
      </div>
    )
  }

  /* ---- User row ---- */
  function getInitials(name) {
    if (!name) return '?'
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  function getRoleName(user) {
    // user.UserRole is an array of { role: { name: 'Admin' } }
    if (Array.isArray(user?.UserRole)) {
      const first = user.UserRole[0]?.role?.name
      return first || 'User'
    }
    return user?.role || 'User'
  }

  function roleClass(roleName) {
    if (!roleName) return 'user-role--landlord'
    const lower = roleName.toLowerCase()
    if (lower.includes('admin')) return 'user-role--admin'
    if (lower.includes('landlord')) return 'user-role--landlord'
    if (lower.includes('agent')) return 'user-role--landlord'
    return 'user-role--tenant'
  }

  function exportUsersCsv() {
    const header = 'Name,Email,Role,Status,Last Seen'
    const rows = users.map((u) =>
      [
        u.full_name || '',
        u.email || '',
        getRoleName(u),
        u.is_active !== false ? 'Active' : 'Suspended',
        u.updated_at || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---- Audit log mapping ---- */
  const mappedLogs = auditLogs.map((log) => {
    const level = (log.level || '').toLowerCase()
    const status = (log.status || '').toLowerCase()
    const isDanger = level === 'error' || level === 'warn' || status === 'failure' || status === 'failed' || log.action?.includes('FAIL') || log.action?.includes('DENIED')
    return {
      time: formatTime(log.created_at),
      title: log.action || 'SYSTEM_EVENT',
      detail: [
        log.module ? `MOD: ${log.module}` : null,
        log.user?.full_name ? `USER: ${log.user.full_name}` : log.username ? `USER: ${log.username}` : null,
        log.entity ? `ENTITY: ${log.entity}` : null,
        log.description ? log.description : null,
      ]
        .filter(Boolean)
        .join(' | '),
      type: isDanger ? 'danger' : 'success',
    }
  })

  return (
    <div className="admin-dashboard-page" data-customize-id="global.content">
      {/* ---- Hero ---- */}
      <div className="landlord-page-title-row">
        <div>
          <h1>
            <span className="material-symbols-outlined brand-icon">settings_applications</span>
            System Health Console
          </h1>
          <p>Infrastructure monitoring and global operations audit overview.</p>
        </div>

        <div className="landlord-page-actions">
          <button type="button" className="btn-primary-solid" onClick={exportUsersCsv}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* ---- Error banner ---- */}
      {error && !loading && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          color: 'var(--status-error)',
          fontSize: '14px',
        }}>
          <AlertCircle size={18} />
          <span>Failed to load dashboard data: {error}. Data shown may be stale.</span>
        </div>
      )}

      {/* ---- KPI Metrics ---- */}
      <section className="kpi-card-grid">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="kpi-card kpi-skeleton">
                <div className="skeleton-line skeleton-sm" />
                <div className="skeleton-line skeleton-lg" />
                <div className="skeleton-line skeleton-xs" />
              </div>
            ))}
          </>
        ) : (
          <>
            {kpiData
              ? kpiData.map((kpi, i) => <KpiCard key={i} {...kpi} />)
              : /* Fallback when no data */
                [
                  { icon: Activity, iconBg: 'icon-emerald', label: 'Active Users', value: '—', sublabel: 'No data' },
                  { icon: WalletCards, iconBg: 'icon-purple', label: 'Total Revenue', value: 'RM 0', sublabel: 'No transactions' },
                  { icon: Database, iconBg: 'icon-blue', label: 'Occupancy', value: '—', sublabel: 'No properties' },
                  { icon: ShieldCheck, iconBg: 'icon-rose', label: 'System Integrity', value: 'Secure', sublabel: 'Monitoring active', trend: 'OK', trendDir: 'up' },
                ].map((kpi, i) => <KpiCard key={i} {...kpi} />)}
          </>
        )}
      </section>

      {/* ---- User Directory + Right Panel ---- */}
      <section className="dashboard-main-grid">
        {/* User directory */}
        <div className="panel-card admin-directory">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">User Directory</h3>
              <p className="panel-subtitle">
                {loading ? 'Loading...' : `${users.length} users loaded`}
              </p>
            </div>
            <div className="admin-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-table-warp">
            <div className="admin-table-head">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Last Seen</span>
            </div>

            {loading ? (
              /* Loading rows */
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="admin-table-row">
                  <div className="admin-user-cell">
                    <div className="admin-user-avatar" style={{ background: 'var(--surface-container)', animation: 'pulse-dot 1.5s ease infinite' }} /><div><h4 style={{ color: 'var(--surface-container)' }}>Loading...</h4></div>
                  </div>
                </div>
              ))
            ) : !filteredUsers.length ? (
              <div style={{ padding: 'var(--spacing-lg) var(--spacing-sm)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {userSearch ? `No users match "${userSearch}"` : 'No users found'}
              </div>
            ) : (
              /* Real user rows */
              filteredUsers.map((user) => {
                const roleName = getRoleName(user)
                const isActive = user.is_active !== false
                return (
                  <div className="admin-table-row" key={user.id}>
                    <div className="admin-user-cell">
                      <div className="admin-user-avatar">{getInitials(user.full_name)}</div>
                      <div className="admin-user-info">
                        <h4>{user.full_name || 'Unnamed'}</h4>
                        <p>{user.email}</p>
                      </div>
                    </div>

                    <span className={`user-role ${roleClass(roleName)}`}>{roleName}</span>
                    <span className={`user-status ${isActive ? 'user-status--active' : 'user-status--pending'}`}>
                      <span className="status-dot" />
                      {isActive ? 'Active' : 'Suspended'}
                    </span>
                    <p className="admin-activity">{formatRelative(user.updated_at)}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right panel: Audit Log + Clusters */}
        <div className="admin-right-col">
          {/* Audit log */}
          <div className="panel-card admin-audit dark-panel">
            <div className="audit-header">
              <h3 className="panel-title-text">Global Audit Log</h3>
              <span className="audit-live">
                <span className="live-dot" />
                LIVE
              </span>
            </div>

            <div className="audit-list custom-scrollbar">
              {loading ? (
                [1, 2, 3].map((n) => (
                  <div key={n} className="audit-item">
                    <span className="audit-time">--:--:--</span>
                    <div className="audit-body">
                      <h4>LOADING...</h4>
                      <p>Fetching audit trail...</p>
                    </div>
                  </div>
                ))
              ) : !mappedLogs.length ? (
                <div style={{ padding: 'var(--spacing-md) 0', textAlign: 'center', color: 'var(--secondary-fixed)', fontSize: '13px' }}>
                  No audit events recorded
                </div>
              ) : (
                mappedLogs.map((log, idx) => (
                  <div key={idx} className={`audit-item audit-${log.type}`}>
                    <span className="audit-time">{log.time}</span>
                    <div className="audit-body">
                      <h4>{log.title}</h4>
                      <p>{log.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational notes */}
          <div className="panel-card admin-notes">
            <div className="notes-header">
              <h3 className="panel-title-text">Property Overview</h3>
            </div>

            <p className="notes-text">
              {loading
                ? 'Loading properties...'
                : `${properties.length} properties tracked across the platform.`}
            </p>

            <div className="clusters-grid">
              {loading ? (
                [1, 2, 3].map((n) => (
                  <div key={n} className="cluster-tile">
                    <span>...</span><strong>--</strong>
                  </div>
                ))
              ) : propertyClusters.length ? (
                propertyClusters.map((cluster) => (
                  <div key={cluster.label} className="cluster-tile" title={`${cluster.label}: ${cluster.count} properties, ${cluster.bookings} bookings`}>
                    <span>{cluster.label.slice(0, 2).toUpperCase()}</span>
                    <strong>{cluster.count}</strong>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No properties</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
