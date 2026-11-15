import PrivateImage from '../components/PrivateImage';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Building2,
  ChevronRight,
  Download,
  Loader,
  Plus,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
  Minus,
} from 'lucide-react'
import { bookingApi } from '../api/booking'
import { maintenanceApi } from '../api/maintenance'
import { propertyApi } from '../api/property'
import { paymentApi } from '../api/payment'
import { getImageUrl } from '../config/imageHelper'
import { propertyStatusInfo } from '../config/propertyStatus'
import './LandlordDashboard.css'

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

function LandlordDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState(0)
  const [stats, setStats] = useState({
    occupancyRate: 0,
    totalProperties: 0,
    activeProperties: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    openTickets: 0,
    urgentTickets: 0,
  })
  const [approvals, setApprovals] = useState([])
  const [propertiesList, setPropertiesList] = useState([])
  const [finance, setFinance] = useState(null)
  const months = finance?.monthlyRevenue ?? []
  const maxRevenue = Math.max(1, ...months.map(m => m.amount))
  const money = (value) => `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  async function loadDashboard() {
    setLoading(true)
    let errCount = 0
    setFinance(null)

    try {
      try {
        const res = await paymentApi.getPaymentSummary()
        setFinance(res.data.data)
      } catch {
        errCount++
      }
      /* ---- Booking stats (pending / confirmed / cancelled counts) ---- */
      try {
        const res = await bookingApi.landlordBookings({ limit: 100 })
        const bookings = res?.data?.data ?? []
        const pending = bookings.filter((b) => b.status === 'PENDING').length
        const confirmed = bookings.filter((b) => b.status === 'CONFIRMED').length
        setStats((s) => ({ ...s, pendingBookings: pending, approvedBookings: confirmed }))

        /* Pending bookings become the approval queue */
        const pendingArr = bookings.filter((b) => b.status === 'PENDING').slice(0, 4)
        setApprovals(
          pendingArr.map((b) => ({
            id: b.id,
            name: b.user?.full_name ?? b.user?.email ?? 'Tenant',
            unit: b.property?.title ?? 'Property',
            time: timeAgo(b.created_at),
            initials: initialsOf(b.user),
            approving: false,
            approvalMsg: '',
            approvalMsgClass: '',
          }))
        )
      } catch {
        errCount++
      }

      /* ---- Property stats (occupancy, total/active) ---- */
      try {
        const propsRes = await propertyApi.myProperties()
        const props = propsRes?.data?.data ?? []
        const total = props.length
        const occupied = props.filter((p) => p.status === 'RENTED').length
        const rate = total > 0 ? Math.round((occupied / total) * 100) : 0
        setStats((s) => ({ ...s, totalProperties: total, activeProperties: occupied, occupancyRate: rate }))

        /* Property summary — the landlord's three most recently updated properties */
        const top3 = [...props]
          .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
          .slice(0, 3)
        setPropertiesList(top3)
      } catch {
        errCount++
      }

      /* ---- Maintenance stats (open tickets, urgent) ---- */
      try {
        const maintRes = await maintenanceApi.list({ limit: 100 })
        const tickets = maintRes?.data?.data ?? []
        const open = tickets.filter((m) => m.status === 'OPEN' || m.status === 'IN_PROGRESS').length
        const urgent = tickets.filter(
          (m) => ['OPEN', 'IN_PROGRESS'].includes(m.status) && ['HIGH', 'URGENT'].includes(m.priority)
        ).length
        setStats((s) => ({ ...s, openTickets: open, urgentTickets: urgent }))
      } catch {
        errCount++
      }

    } finally {
      setErrors(errCount)
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadDashboard)
  }, [])

  function exportDashboard() {
    if (!finance) return
    const rows = [
      ['Landlord portfolio summary', 'Simulated payments'],
      ['Exported at', new Date().toISOString()],
      ['Total revenue collected RM', Number(finance.collectedAmount).toFixed(2)],
      ['Outstanding amount RM', Number(finance.pendingAmount).toFixed(2)],
      ['Owned properties', stats.totalProperties],
      ['Rented properties', stats.activeProperties],
      ['Pending bookings', stats.pendingBookings],
      ['Open maintenance tickets', stats.openTickets],
      [], ['Month Malaysia time', 'Revenue collected RM'],
      ...months.map(m => [m.month, Number(m.amount).toFixed(2)]),
    ]
    const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `landlord-portfolio-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function handleApprove(bookingId, status) {
    // Approving now requires offer terms (deposits + expiry) that can't be
    // meaningfully collected in a one-click dashboard widget, so "Approve"
    // here hands off to the full review screen instead of bypassing them.
    if (status === 'CONFIRMED') {
      navigate(`${ROUTES.landlord.bookings}?review=${bookingId}`)
      return
    }
    const reason = window.prompt('Reason for rejecting this application:')
    if (!reason || !reason.trim()) return

    /* Mark this rejection in-flight */
    setApprovals((prev) =>
      prev.map((a) => (a.id === bookingId ? { ...a, approving: true, approvalMsg: '' } : a))
    )
    try {
      await bookingApi.decline(bookingId, reason)
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === bookingId
            ? {
                ...a,
                approving: false,
                approvalMsg: status === 'CONFIRMED' ? '✓ Booking confirmed' : '✗ Booking declined',
                approvalMsgClass: status === 'CONFIRMED' ? 'text-green-600' : 'text-red-600',
              }
            : a
        )
      )
      /* Remove after a short delay */
      setTimeout(() => {
        setApprovals((prev) => prev.filter((a) => a.id !== bookingId))
        setStats((s) => ({
          ...s,
          pendingBookings: Math.max(0, s.pendingBookings - 1),
          approvedBookings: status === 'CONFIRMED' ? s.approvedBookings + 1 : s.approvedBookings,
          rejectedBookings: status === 'CANCELLED' ? s.rejectedBookings + 1 : s.rejectedBookings,
        }))
      }, 1500)
    } catch {
      setApprovals((prev) =>
        prev.map((a) => (a.id === bookingId ? { ...a, approving: false, approvalMsg: 'Failed — try again' } : a))
      )
    }
  }

  return (
    <div className="landlord-dashboard-page" data-customize-id="global.content">
      {/* Page title row */}
      <div className="landlord-page-title-row">
        <div>
          <h1>
            <span className="material-symbols-outlined brand-icon">home_repair_service</span>
            Portfolio Overview
          </h1>
          <p>Here's what's happening with your properties today.</p>
        </div>

        <div className="landlord-page-actions">
          <button type="button" className="btn-outline" disabled={loading || !finance || errors > 0} onClick={exportDashboard} title="Export the loaded portfolio summary and six-month revenue as CSV">
            <Download size={18} />
            Export
          </button>
          <button
            type="button"
            className="btn-primary-solid"
            onClick={() => navigate(ROUTES.landlord.propertyAdd)}
          >
            <Plus size={18} />
            New Listing
          </button>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
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
            {/* Revenue */}
            <KpiCard
              icon={WalletCards}
              iconBg="icon-purple"
              label="Total Revenue"
              value={finance ? money(finance.collectedAmount) : 'Unavailable'}
              sublabel={finance ? 'All-time paid payments · simulated' : 'Payment data could not be loaded'}
            />

            {/* Occupancy */}
            <KpiCard
              icon={Users}
              iconBg="icon-blue"
              label="Occupancy"
              value={`${stats.occupancyRate}%`}
              sublabel={`${stats.activeProperties} rented / ${stats.totalProperties} owned properties`}
              trend={null}
              trendDir="neutral"
            />

            {/* Pending bookings */}
            <KpiCard
              icon={Bell}
              iconBg="icon-amber"
              label="Pending Bookings"
              value={stats.pendingBookings}
              sublabel={`${stats.approvedBookings} confirmed`}
              trend={null}
              trendDir="neutral"
            />

            {/* Tickets */}
            <KpiCard
              icon={Wrench}
              iconBg="icon-rose"
              label="Open Tickets"
              value={stats.openTickets}
              sublabel={`${stats.urgentTickets} urgent`}
              trend={stats.urgentTickets > 0 ? `${stats.urgentTickets} high` : '0 high'}
              trendDir={stats.urgentTickets > 0 ? 'down' : 'up'}
            />
          </>
        )}
      </section>

      {/* ---- Revenue chart + Approval queue ---- */}
      <section className="dashboard-main-grid">
        {/* Revenue bar chart */}
        <div className="panel-card revenue-panel">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Revenue Collected</h3>
              <p className="panel-subtitle">Last six months · paid dates in Malaysia time · simulated payments</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => navigate(ROUTES.landlord.finance)}>
              <TrendingUp size={16} />
              View Finance
            </button>
          </div>

          <div className="bar-chart">
            {loading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div className="bar-item" key={i}>
                  <div className="bar skeleton-bar" />
                  <span>...</span>
                </div>
              ))
            ) : finance && months.some(m => m.amount > 0) ? (
              months.map(m => (
                <div className="bar-item" key={m.month} title={`${m.month}: ${money(m.amount)}`}>
                  <span className="revenue-bar-value">{money(m.amount)}</span>
                  <div className="bar bar-active" style={{ height: `${m.amount / maxRevenue * 60}%`, minHeight: m.amount > 0 ? 4 : 0 }} role="img" aria-label={`${m.month}: ${money(m.amount)}`} />
                  <span className="bar-label">{new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString('en-MY', { month: 'short', year: '2-digit', timeZone: 'UTC' })}</span>
                </div>
              ))
            ) : (
              <div className="chart-empty">
                <TrendingUp size={32} className="text-text-secondary" />
                <p>{finance ? 'No paid payments recorded in the last six months.' : 'Revenue data could not be loaded.'}</p>
                {!finance && <button type="button" className="btn-ghost" onClick={loadDashboard}>Retry dashboard</button>}
              </div>
            )}
          </div>
        </div>

        {/* Pending approvals from real data */}
        <div className="panel-card approval-panel">
          <div className="approval-header">
            <h3 className="panel-title-text">Pending Approvals</h3>
            {approvals.length > 0 && (
              <span className="approval-badge">{approvals.length} new</span>
            )}
          </div>
          <div className="approval-list custom-scrollbar">
            {loading ? (
              <p className="approval-empty-state">Loading...</p>
            ) : !approvals.length ? (
              <p className="approval-empty-state">No pending approvals — all caught up!</p>
            ) : (
              approvals.map((a) => (
                <div className="approval-card" key={a.id}>
                  <div className="approval-avatar">{a.initials}</div>
                  <div className="approval-info">
                    <div className="approval-name-row">
                      <h4>{a.name}</h4>
                      <span className="approval-time">{a.time}</span>
                    </div>
                    <p className="approval-unit">{a.unit}</p>
                    <div className="approval-actions">
                      <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleApprove(a.id, 'CONFIRMED')}
                        disabled={a.approving !== undefined && a.approving}
                      >
                        {a.approving ? <Loader size={14} className="animate-spin" /> : 'Review'}
                      </button>
                      <button
                        type="button"
                        className="btn-decline"
                        onClick={() => handleApprove(a.id, 'CANCELLED')}
                        disabled={a.approving !== undefined && a.approving}
                      >
                        {a.approving ? <Loader size={14} className="animate-spin" /> : 'Decline'}
                      </button>
                    </div>
                    <p className={a.approvalMsgClass} style={{ fontSize: '12px', marginTop: 4 }}>
                      {a.approvalMsg}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ---- Property summary from real data ---- */}
      <section className="property-summary">
        <div className="property-summary-header">
          <div>
            <h3 className="property-summary-title">
              <span className="material-symbols-outlined">apartment</span>
              Asset Summary
            </h3>
            <p>Your three most recently updated properties.</p>
          </div>
          <button type="button" className="property-summary-view-all" onClick={() => navigate(ROUTES.landlord.properties)}>
            View all properties <ChevronRight size={16} />
          </button>
        </div>

        {propertiesList.length > 0 ? (
          <div className="property-summary-grid">
            {propertiesList.map((p) => {
              const status = propertyStatusInfo(p.status)
              const imageUrl = p.images?.[0]?.url
              return (
                <div
                  className="summary-card"
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(ROUTES.landlord.propertyDetail(p.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(ROUTES.landlord.propertyDetail(p.id))
                    }
                  }}
                >
                  <div className={`summary-image ${imageUrl ? '' : 'summary-image-empty'}`}>
                    {imageUrl ? <PrivateImage src={getImageUrl(imageUrl)} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={28} />}
                  </div>
                  <div className="summary-body">
                    <h4 className="summary-title">{p.title}</h4>
                    <p className="summary-detail">{p.city || p.address || 'Location not provided'}</p>
                    <span className={`summary-status status-${status.tone}`}>{status.label}</span>
                  </div>
                  <span className="summary-price">RM {Number(p.rent || 0).toLocaleString()}<small>/month</small></span>
                </div>
              )
            })}
          </div>
        ) : !loading ? (
          <div className="property-summary-empty">
            <Building2 size={32} />
            <p>No properties in your portfolio yet.</p>
            <button type="button" className="btn-primary-solid" onClick={() => navigate(ROUTES.landlord.propertyAdd)}>
              <Plus size={16} /> Add your first property
            </button>
          </div>
        ) : null}
        </section>

      {/* Error indicator */}
      {errors > 0 && (
        <div className="dashboard-warn">
          ⚠ Some dashboard data may be incomplete ({errors}/4 endpoints failed)
        </div>
      )}
    </div>
  )
}

/* ---- Helpers ---- */
function initialsOf(user) {
  if (!user) return '??'
  const name = user.full_name ?? user.email ?? ''
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const now = new Date()
  const then = new Date(dateStr)
  const diff = (now - then) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default LandlordDashboard
