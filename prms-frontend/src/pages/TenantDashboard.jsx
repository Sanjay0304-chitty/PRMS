import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import { bookingApi } from '../api/booking'
import { favoritesApi } from '../api/favorites'
import { maintenanceApi } from '../api/maintenance'
import { paymentApi } from '../api/payment'
import { getImageUrl } from '../config/imageHelper'
import {
  ArrowUp,
  Clock,
  Heart,
  Home,
  Minus,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react'
import './TenantDashboard.css'

function formatAmount(amount) {
  const value = Number(amount)
  if (Number.isNaN(value)) return 'N/A'
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 0 }).format(value)
}

function isActiveBooking(b) {
  const status = (b.status || '').toUpperCase()
  if (status === 'CHECKED_IN') return true
  if (status !== 'CONFIRMED') return false
  const now = new Date()
  const start = new Date(b.start_date)
  const end = new Date(b.end_date)
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= now && now <= end

}

function TenantDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rentals, setRentals] = useState([])
  const [savedProperties, setSavedProperties] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [maintenanceCounts, setMaintenanceCounts] = useState({ open: 0, inProgress: 0 })
  const [dataError, setDataError] = useState('')
  const [paymentData, setPaymentData] = useState({ recent: [], nextDue: null })
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentError, setPaymentError] = useState('')
  const [dismissBusy, setDismissBusy] = useState(false)
  const [dismissedPayment, setDismissedPayment] = useState(null)
  const paymentVersion = useRef(0)

  const refreshPayments = useCallback(async () => {
    const version = ++paymentVersion.current
    try {
      const res = await paymentApi.dashboard()
      if (version === paymentVersion.current) {
        setPaymentData(res.data.data)
        setPaymentError('')
      }
    } catch {
      if (version === paymentVersion.current) setPaymentError('Payment activity could not be refreshed. Please check My Payments.')
    } finally {
      if (version === paymentVersion.current) setPaymentsLoading(false)
    }
  }, [])

  async function dismissPayment(payment, dismissed) {
    if (dismissBusy) return
    setDismissBusy(true)
    setPaymentError('')
    ++paymentVersion.current
    try {
      await paymentApi.dismissActivity(payment.id, dismissed)
      setDismissedPayment(dismissed ? payment : null)
      await refreshPayments()
    } catch (e) {
      setPaymentError(e.response?.data?.error?.message || 'Unable to update Payment Activity. Please try again.')
    } finally { setDismissBusy(false) }
  }

  useEffect(() => {
    refreshPayments()
    window.addEventListener('focus', refreshPayments)
    const timer = window.setInterval(refreshPayments, 60000)
    return () => { ++paymentVersion.current; window.removeEventListener('focus', refreshPayments); window.clearInterval(timer) }
  }, [refreshPayments])

  useEffect(() => {
    localStorage.setItem('prmsDashboardPath', '/tenant')

    let cancelled = false

    async function loadDashboardData() {
      try {
        const [bookingsRes, favoritesRes, openTicketsRes, progressTicketsRes] = await Promise.all([
          bookingApi.myBookings(),
          favoritesApi.getMyFavorites(),
          maintenanceApi.myTickets({ status: 'OPEN', limit: 4 }),
          maintenanceApi.myTickets({ status: 'IN_PROGRESS', limit: 4 }),
        ])
        if (cancelled) return

        const bookings = bookingsRes.data?.data || []
        setRentals(
          bookings.filter(isActiveBooking).map((b) => ({
            name: b.property?.title || 'Property',
            location: [b.property?.city, b.property?.state].filter(Boolean).join(', ') || b.property?.address || '',
          }))
        )

        const favorites = favoritesRes.data?.data || []
        setSavedProperties(
          favorites.slice(0, 4).map((f) => ({
            name: f.property?.title || 'Property',
            location: [f.property?.city, f.property?.state].filter(Boolean).join(', ') || f.property?.address || '',
            price: f.property?.rent ? `${formatAmount(f.property.rent)} / month` : '',
            image: getImageUrl(f.property?.images?.[0]?.url) || null,
          }))
        )

        setMaintenanceCounts({
          open: openTicketsRes.data?.pagination?.total || 0,
          inProgress: progressTicketsRes.data?.pagination?.total || 0,
        })
        const tickets = [...(openTicketsRes.data?.data || []), ...(progressTicketsRes.data?.data || [])]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setMaintenance(
          tickets.slice(0, 4).map((t) => ({
            id: t.id,
            title: t.title,
            desc: t.description,
            status: (t.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            inProgress: t.status === 'IN_PROGRESS',
            urgent: (t.priority || '').toUpperCase() === 'URGENT' || (t.priority || '').toUpperCase() === 'HIGH',
          }))
        )
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load dashboard data:', e)
          setDataError('Some dashboard data could not be loaded.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboardData()
    return () => { cancelled = true }
  }, [])

  /* ---- KPI Card helper ---- */
  function KpiCard({ icon: Icon, iconBg, label, value, sublabel, trend, trendDir }) {
    const TrendIcon =
      trendDir === 'up' ? (
        <ArrowUp size={14} className="text-status-success" />
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
            <span className={`trend-pill ${trendDir === 'up' ? 'positive' : 'neutral'}`}>
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

  return (
    <div className="tenant-dashboard-page" data-customize-id="global.content">
      {/* ---- Hero ---- */}
      <div className="landlord-page-title-row">
        <div>
          <h1>
            <span className="material-symbols-outlined brand-icon">apartment</span>
            My Tenancy Hub
          </h1>
          <p>Here&apos;s what&apos;s happening with your rentals today.</p>
        </div>

        <div className="landlord-page-actions">
          <button type="button" className="btn-outline" onClick={() => navigate(ROUTES.tenant.maintenance)}>
            <Wrench size={18} />
            Requests
          </button>
          <button type="button" className="btn-primary-solid" onClick={() => navigate(ROUTES.tenant.payments)}>
            <WalletCards size={18} />
            Pay Now
          </button>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <section className="kpi-card-grid">
        {loading ? (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="kpi-card kpi-skeleton">
                <div className="skeleton-line skeleton-sm" />
                <div className="skeleton-line skeleton-lg" />
                <div className="skeleton-line skeleton-xs" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Earliest outstanding payment, including overdue balances. */}
            <KpiCard
              icon={WalletCards}
              iconBg="icon-purple"
              label="Next Payment Due"
              value={paymentsLoading ? 'Loading…' : paymentError ? '—' : paymentData.nextDue ? formatAmount(paymentData.nextDue.amount) : '—'}
              sublabel={paymentError ? 'Payment data unavailable' : paymentsLoading ? 'Checking payments' : paymentData.nextDue ? `Due ${new Date(paymentData.nextDue.due_date).toLocaleDateString('en-MY')}` : 'No outstanding payments'}
              trend={null}
              trendDir="neutral"
            />

            {/* Active Rentals */}
            <KpiCard
              icon={Home}
              iconBg="icon-blue"
              label="Active Rentals"
              value={String(rentals.length)}
              sublabel={rentals.length ? `Across ${new Set(rentals.map((r) => r.location)).size} location${new Set(rentals.map((r) => r.location)).size === 1 ? '' : 's'}` : 'No active rentals'}
              trend={rentals.length ? 'Active' : null}
              trendDir="up"
            />

            {/* Maintenance */}
            <KpiCard
              icon={Wrench}
              iconBg="icon-rose"
              label="Maintenance"
              value={`${maintenanceCounts.open + maintenanceCounts.inProgress} Active`}
              sublabel={`${maintenanceCounts.open} open · ${maintenanceCounts.inProgress} in progress`}
              trend={maintenanceCounts.inProgress ? 'In progress' : maintenanceCounts.open ? 'Awaiting action' : null}
              trendDir="neutral"
            />
          </>
        )}
      </section>

      {dataError && (
        <div className="alert alert-danger mt-2">{dataError}</div>
      )}

      {/* ---- Active Rentals panel ---- */}
      <section className="panel-card">
        <div className="panel-title">
          <div>
            <h3 className="panel-title-text">Active Rentals</h3>
            <p className="panel-subtitle">Your current lease agreements</p>
          </div>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={() => navigate(ROUTES.tenant.bookings)}
          >
            View All
          </button>
        </div>

        <div className="tenant-rental-list">
          {rentals.length ? rentals.map((rental, i) => (
            <div className="tenant-rental-item" key={`${rental.name}-${i}`}>
              <div className="tenant-rental-dot" />
              <div>
                <strong>{rental.name}</strong>
                <p>{rental.location}</p>
              </div>
              <span className="tenant-dashboard-status active">Active</span>
            </div>
          )) : (
            <p className="panel-subtitle">No active rentals right now.</p>
          )}
        </div>
      </section>

      {/* ---- Saved Properties ---- */}
      <section className="saved-panel">
        <div className="saved-header">
          <div>
            <h3 className="panel-title-text">Saved Properties</h3>
            <p className="panel-subtitle">Properties you have on your watchlist</p>
          </div>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={() => navigate(ROUTES.tenant.properties)}
          >
            View All
          </button>
        </div>

        <div className="saved-grid">
          {savedProperties.length ? savedProperties.map((property, i) => (
            <article className="saved-card" key={`${property.name}-${i}`}>
              {property.image && <img src={property.image} alt={property.name} />}

              <button type="button" className="heart-btn">
                <Heart size={24} fill="currentColor" />
              </button>

              <div className="saved-overlay">
                <h4>{property.name}</h4>
                <p>{property.location}</p>
                <span>{property.price}</span>
              </div>
            </article>
          )) : (
            <p className="panel-subtitle">No saved properties yet.</p>
          )}
        </div>
      </section>

      {/* ---- Bottom grid: Payments + Maintenance ---- */}
      <section className="dashboard-main-grid">
        {/* Payment history */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Payment Activity</h3>
              <p className="panel-subtitle">Recent transactions and upcoming dues</p>
            </div>
            <button
              type="button"
              className="btn-outline-sm"
              onClick={() => navigate(ROUTES.tenant.payments)}
            >
              See All
            </button>
          </div>

          <div className="payment-list">
            {dismissedPayment && <p className="panel-subtitle" role="status">Hidden from this dashboard. Still available in My Payments. <button type="button" className="btn-outline-sm" disabled={dismissBusy} onClick={() => dismissPayment(dismissedPayment, false)}>Undo</button></p>}
            {paymentError && <p className="panel-subtitle" role="alert">{paymentError}</p>}
            {paymentsLoading ? <p className="panel-subtitle">Loading payments…</p> : !paymentError && !paymentData.recent.length ? <p className="panel-subtitle">No payments found for your bookings yet.</p> : paymentData.recent.map(payment => (
              <div className="payment-item tenant-payment-activity-item" key={payment.id}>
                <div className="payment-icon-sm"><WalletCards size={22} /></div>
                <div className="payment-info">
                  <h4>{payment.booking?.property?.title || 'Property payment'}</h4>
                  <p>{payment.type || 'rent'} · {payment.status === 'PAID' && payment.paid_at ? `Paid ${new Date(payment.paid_at).toLocaleDateString('en-MY')}` : `Due ${new Date(payment.due_date).toLocaleDateString('en-MY')}`}</p>
                </div>
                <div className="payment-right">
                  <strong>{formatAmount(payment.amount)}</strong>
                  <span className={`tenant-dashboard-status ${payment.status === 'PAID' ? 'paid' : payment.status === 'FAILED' ? 'failed' : payment.status === 'REFUNDED' ? 'refunded' : 'pending'}`}>{({ PAID: 'Paid', PENDING: 'Pending', UNPAID: 'Unpaid', FAILED: 'Failed', REFUNDED: 'Refunded' })[payment.status] || payment.status}</span>
                </div>
                {['PAID', 'REFUNDED', 'FAILED'].includes(payment.status) && <button type="button" className="payment-activity-dismiss" disabled={dismissBusy} title="Hide from dashboard" aria-label={`Hide payment activity for ${payment.booking?.property?.title || 'property'}`} onClick={() => dismissPayment(payment, true)}><X size={16} /></button>}
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Maintenance Updates</h3>
              <p className="panel-subtitle">Open work orders and repair status</p>
            </div>
            <button
              type="button"
              className="btn-primary-sm"
              onClick={() => navigate(ROUTES.tenant.maintenance)}
            >
              <Wrench size={16} />
              New Request
            </button>
          </div>

          <div className="maintenance-list">
            {maintenance.length ? maintenance.map((req, i) => (
              <div className="maintenance-item" key={req.id || `${req.title}-${i}`}>
                <div className={`maintenance-icon ${req.urgent ? 'urgent' : 'soft'}`}>
                  <Wrench size={22} />
                </div>

                <div className="maintenance-info">
                  <h4>{req.title}</h4>
                  <p>{req.desc}</p>
                  <span className={`tenant-dashboard-status ${req.inProgress ? 'active' : 'pending'}`}>
                    {req.inProgress ? <Wrench size={12} /> : <Clock size={12} />}
                    {req.status}
                  </span>
                </div>
              </div>
            )) : (
              <p className="panel-subtitle">No maintenance requests open.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default TenantDashboard
