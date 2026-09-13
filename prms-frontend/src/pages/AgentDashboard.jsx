import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import {
  ArrowUp,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Home,
  Loader,
  Minus,
  Search,
  SlidersHorizontal,
  Star,
  Target,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { getImageUrl } from '../config/imageHelper';
import { agentApi } from '../api/agents'
import { bookingApi } from '../api/booking'
import { maintenanceApi } from '../api/maintenance'
import './AgentDashboard.css'

function AgentDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assignedProperties, setAssignedProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    localStorage.setItem('prmsDashboardPath', '/agent')

    const fetchData = async () => {
      try {
        const [propsRes, bookingsRes, ticketsRes] = await Promise.all([
          agentApi.myProperties({ limit: 100 }),
          bookingApi.assigned(),
          maintenanceApi.assigned({ limit: 100 }),
        ])

        const properties = propsRes.data?.data || []
        setAssignedProperties(
          properties.map((p) => ({
            id: p.id,
            title: p.title,
            address: p.address || '',
            rent: p.rent || 0,
            status: p.status,
            image: getImageUrl(p.images?.[0]?.url) || '',
          }))
        )

        const propertyNames = Object.fromEntries(properties.map((p) => [p.id, p.title]))

        const allBookings = bookingsRes.data?.data || []
        setBookings(
          allBookings
            .filter((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
            .map((b) => ({
              id: b.id,
              propertyTitle: b.property?.title || 'Property',
              tenant: b.user?.full_name || b.user?.email || 'Tenant',
              startDate: b.start_date ? new Date(b.start_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
              endDate: b.end_date ? new Date(b.end_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
              status: b.status,
            }))
        )

        const tickets = ticketsRes.data?.data || []
        setMaintenanceRequests(
          tickets.map((t) => ({
            id: t.id,
            propertyTitle: propertyNames[t.propertyId] || 'Property',
            title: t.title,
            priority: t.priority,
            status: t.status,
            createdDate: t.created_at ? new Date(t.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          }))
        )
      } catch (e) {
        console.error('Failed to load agent dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, navigate])

  if (authLoading || loading) {
    return (
      <div className="agent-dashboard-skeleton" data-customize-id="global.content">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="kpi-card kpi-skeleton">
            <div className="skeleton-line skeleton-sm" />
            <div className="skeleton-line skeleton-lg" />
            <div className="skeleton-line skeleton-xs" />
          </div>
        ))}
      </div>
    )
  }

  if (!user) {
    return null
  }

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
    <div className="agent-dashboard-page">
      {/* ---- Hero ---- */}
      <div className="landlord-page-title-row">
        <div>
          <h1>
            <span className="material-symbols-outlined brand-icon">apartment</span>
            Agent Dashboard
          </h1>
          <p>Welcome back, {user.full_name} — here&apos;s your portfolio overview.</p>
        </div>

        <div className="landlord-page-actions">
          <button type="button" className="btn-outline">
            <SlidersHorizontal size={18} />
            Filter
          </button>
          <button type="button" className="btn-primary-solid">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <section className="kpi-card-grid">
        {/* Assigned Properties */}
        <KpiCard
          icon={Home}
          iconBg="icon-blue"
          label="Assigned Properties"
          value={String(assignedProperties.length)}
          sublabel="Under management"
          trend={`${assignedProperties.filter((p) => p.status === 'RENTED').length} rented`}
          trendDir="up"
        />

        {/* Active Bookings */}
        <KpiCard
          icon={CalendarDays}
          iconBg="icon-purple"
          label="Active Bookings"
          value={String(bookings.length)}
          sublabel="Confirmed leases"
          trend="All active"
          trendDir="up"
        />

        {/* Maintenance */}
        <KpiCard
          icon={Wrench}
          iconBg="icon-rose"
          label="Open Maintenance"
          value={String(maintenanceRequests.filter((m) => m.status === 'OPEN').length)}
          sublabel="Awaiting attention"
          trend="Urgent"
          trendDir="neutral"
        />

        {/* Revenue Estimate */}
        <KpiCard
          icon={TrendingUp}
          iconBg="icon-emerald"
          label="Monthly Revenue"
          value={`RM ${assignedProperties.reduce((s, p) => s + p.rent, 0).toLocaleString()}`}
          sublabel="Estimated from active leases"
          trend="+8%"
          trendDir="up"
        />
      </section>

      {/* ---- Properties panel ---- */}
      <section className="panel-card">
        <div className="panel-title">
          <div>
            <h3 className="panel-title-text">Assigned Properties</h3>
            <p className="panel-subtitle">Properties under your management</p>
          </div>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={() => navigate(ROUTES.agent.properties)}
          >
            View All
          </button>
        </div>

        <div className="agent-properties-grid">
          {assignedProperties.map((prop) => (
            <div className="agent-property-card" key={prop.id}>
              <div className="agent-property-img">
                {prop.image ? (
                  <img src={prop.image} alt={prop.title} />
                ) : (
                  <div className="agent-property-img-placeholder">
                    <Building2 size={28} />
                  </div>
                )}
              </div>
              <div className="agent-property-info">
                <div className="agent-property-top">
                  <h4>{prop.title}</h4>
                  <span
                    className={`agent-status ${
                      prop.status === 'AVAILABLE' ? 'agent-status--available' : 'agent-status--rented'
                    }`}
                  >
                    {prop.status === 'AVAILABLE' ? (
                      <Star size={10} fill="currentColor" />
                    ) : (
                      <Home size={10} />
                    )}
                    {prop.status}
                  </span>
                </div>
                <p className="agent-location">{prop.address}</p>
                <div className="agent-rent-row">
                  <span className="agent-rent-label">Rent</span>
                  <strong>RM {prop.rent.toLocaleString()}/mo</strong>
                </div>
                <button
                  type="button"
                  className="btn-outline-sm"
                  onClick={() => navigate(ROUTES.agent.properties)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Bookings + Maintenance grid ---- */}
      <section className="dashboard-main-grid">
        {/* Bookings */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Bookings</h3>
              <p className="panel-subtitle">
                Confirmed and pending lease agreements
              </p>
            </div>
            <button
              type="button"
              className="btn-outline-sm"
              onClick={() => navigate(ROUTES.agent.bookings)}
            >
              See All
            </button>
          </div>

          <div className="agent-bookings-list">
            {bookings.map((booking) => (
              <div className="agent-booking-item" key={booking.id}>
                <div className="agent-booking-icon">
                  <CalendarDays size={20} />
                </div>
                <div className="agent-booking-info">
                  <h4>{booking.propertyTitle}</h4>
                  <p>Tenant: {booking.tenant}</p>
                  <p>
                    {booking.startDate} → {booking.endDate}
                  </p>
                </div>
                <span className="agent-status-badge agent-status--confirmed">
                  <CheckCircle2 size={12} />
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Maintenance Requests</h3>
              <p className="panel-subtitle">Open work orders and repair tickets</p>
            </div>
            <button
              type="button"
              className="btn-primary-sm"
              onClick={() => navigate(ROUTES.agent.maintenance)}
            >
              <Wrench size={16} />
              New Request
            </button>
          </div>

          <div className="agent-maintenance-list">
            {maintenanceRequests.map((req) => (
              <div className="agent-maintenance-item" key={req.id}>
                <div className={`agent-maint-icon ${req.priority === 'HIGH' ? 'urgent' : 'soft'}`}>
                  <Wrench size={20} />
                </div>
                <div className="agent-maintenance-info">
                  <h4>{req.title}</h4>
                  <p>Property: {req.propertyTitle}</p>
                  <p>Filed: {req.createdDate}</p>
                </div>
                <div className="agent-maintenance-badges">
                  <span
                    className={`agent-priority-badge ${
                      req.priority === 'HIGH'
                        ? 'agent-priority--high'
                        : req.priority === 'MEDIUM'
                        ? 'agent-priority--medium'
                        : 'agent-priority--low'
                    }`}
                  >
                    {req.priority}
                  </span>
                  <span
                    className={`agent-status-badge ${
                      req.status === 'OPEN'
                        ? 'agent-status--error'
                        : 'agent-status--active'
                    }`}
                  >
                    <Clock size={12} />
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default AgentDashboard
