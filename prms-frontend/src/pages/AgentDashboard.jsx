import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import { Building2, CalendarClock, CalendarDays, CheckCircle2, Clock, Home, Star, Wrench } from 'lucide-react'
import { getImageUrl } from '../config/imageHelper';
import { propertyStatusInfo } from '../config/propertyStatus'
import { agentApi } from '../api/agents'
import { bookingApi } from '../api/booking'
import { maintenanceApi } from '../api/maintenance'
import { viewingApi } from '../api/viewing'
import './AgentDashboard.css'

function AgentDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assignedProperties, setAssignedProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [viewings, setViewings] = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    assignedProperties: 0,
    rentedProperties: 0,
    activeTenancies: 0,
    applicationsToReview: 0,
    upcomingViewings: 0,
    viewingsAwaitingResponse: 0,
    openMaintenance: 0,
    urgentMaintenance: 0,
  })
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    localStorage.setItem('prmsDashboardPath', '/agent')

    const fetchData = async () => {
      try {
        const [statsRes, propsRes, bookingsRes, viewingsRes, ticketsRes] = await Promise.all([
          agentApi.dashboard(),
          agentApi.myProperties({ limit: 100 }),
          bookingApi.assigned({ limit: 100 }),
          viewingApi.assigned(),
          maintenanceApi.assigned({ limit: 100 }),
        ])

        setDashboardStats(statsRes.data?.data || {})

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
            .map((b) => ({
              id: b.id,
              propertyTitle: b.property?.title || 'Property',
              tenant: b.user?.full_name || b.user?.email || 'Tenant',
              startDate: b.start_date ? new Date(b.start_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
              endDate: b.end_date ? new Date(b.end_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
              status: b.status,
              applicationStage: b.application_stage,
            }))
        )

        const activeViewingStatuses = ['REQUESTED', 'ACCEPTED', 'PROPOSED_ALTERNATE', 'CONFIRMED']
        setViewings(
          (viewingsRes.data?.data || [])
            .filter((v) => {
              const scheduledAt = v.status === 'PROPOSED_ALTERNATE' && v.proposedTime ? v.proposedTime : v.preferredTime
              return activeViewingStatuses.includes(v.status) && scheduledAt && new Date(scheduledAt).getTime() >= Date.now()
            })
            .map((v) => {
              const scheduledAt = v.status === 'PROPOSED_ALTERNATE' && v.proposedTime ? v.proposedTime : v.preferredTime
              return {
                id: v.id,
                propertyTitle: v.property?.title || propertyNames[v.propertyId] || 'Property',
                tenant: v.tenant?.full_name || v.tenant?.email || 'Tenant',
                scheduledAt: scheduledAt ? new Date(scheduledAt).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled',
                status: v.status,
              }
            })
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
        setLoadError('Dashboard data could not be loaded. Please refresh and try again.')
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
  function KpiCard({ icon: Icon, iconBg, label, value, sublabel, trend }) {
    return (
      <div className="kpi-card">
        <div className="kpi-card-top">
          <div className={`kpi-icon-wrap ${iconBg}`}>
            <Icon size={20} />
          </div>
          {trend && (
            <span className="trend-pill neutral">{trend}</span>
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

      </div>

      {loadError && <div className="agent-dashboard-error" role="alert">{loadError}</div>}

      {/* ---- KPI Cards ---- */}
      <section className="kpi-card-grid">
        {/* Assigned Properties */}
        <KpiCard
          icon={Home}
          iconBg="icon-blue"
          label="Assigned Properties"
          value={String(dashboardStats.assignedProperties || 0)}
          sublabel="Under management"
          trend={`${dashboardStats.rentedProperties || 0} rented`}
        />

        {/* Active Bookings */}
        <KpiCard
          icon={CalendarDays}
          iconBg="icon-purple"
          label="Upcoming Viewings"
          value={String(dashboardStats.upcomingViewings || 0)}
          sublabel="Scheduled appointments"
          trend={`${dashboardStats.viewingsAwaitingResponse || 0} awaiting response`}
        />

        {/* Maintenance */}
        <KpiCard
          icon={Clock}
          iconBg="icon-rose"
          label="Applications to Review"
          value={String(dashboardStats.applicationsToReview || 0)}
          sublabel="Assigned properties"
          trend={`${dashboardStats.activeTenancies || 0} active tenancies`}
        />

        {/* Revenue Estimate */}
        <KpiCard
          icon={Wrench}
          iconBg="icon-emerald"
          label="Open Maintenance"
          value={String(dashboardStats.openMaintenance || 0)}
          sublabel="Open and in progress"
          trend={`${dashboardStats.urgentMaintenance || 0} high priority`}
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
          {assignedProperties.slice(0, 4).map((prop) => (
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
                    {propertyStatusInfo(prop.status).label}
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
                  onClick={() => navigate(ROUTES.agent.propertyDetail(prop.id))}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
          {!assignedProperties.length && <p className="agent-empty-state">No properties are assigned to you yet.</p>}
        </div>
      </section>

      {/* ---- Bookings + Maintenance grid ---- */}
      <section className="dashboard-main-grid">
        {/* Bookings */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Applications &amp; Tenancies</h3>
              <p className="panel-subtitle">
                Recent applications and active lease records
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
            {bookings.slice(0, 5).map((booking) => (
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
                <span className={`agent-status-badge ${['CONFIRMED', 'CHECKED_IN'].includes(booking.status) ? 'agent-status--confirmed' : 'agent-status--pending'}`}>
                  <CheckCircle2 size={12} />
                  {booking.applicationStage || booking.status}
                </span>
              </div>
            ))}
            {!bookings.length && <p className="agent-empty-state">No applications or tenancies for your assigned properties.</p>}
          </div>
        </div>

        {/* Viewings */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Upcoming Viewings</h3>
              <p className="panel-subtitle">Appointments for assigned properties</p>
            </div>
            <button type="button" className="btn-outline-sm" onClick={() => navigate(ROUTES.agent.viewings)}>
              See All
            </button>
          </div>

          <div className="agent-bookings-list">
            {viewings.slice(0, 5).map((viewing) => (
              <div className="agent-booking-item" key={viewing.id}>
                <div className="agent-booking-icon"><CalendarClock size={20} /></div>
                <div className="agent-booking-info">
                  <h4>{viewing.propertyTitle}</h4>
                  <p>Tenant: {viewing.tenant}</p>
                  <p>{viewing.scheduledAt}</p>
                </div>
                <span className="agent-status-badge agent-status--pending">{viewing.status}</span>
              </div>
            ))}
            {!viewings.length && <p className="agent-empty-state">No open viewing appointments.</p>}
          </div>
        </div>

        {/* Maintenance */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Maintenance Requests</h3>
              <p className="panel-subtitle">Open work orders and repair tickets</p>
            </div>
            <button type="button" className="btn-outline-sm" onClick={() => navigate(ROUTES.agent.maintenance)}>View All</button>
          </div>

          <div className="agent-maintenance-list">
            {maintenanceRequests.filter((req) => ['OPEN', 'IN_PROGRESS'].includes(req.status)).slice(0, 5).map((req) => (
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
            {!maintenanceRequests.some((req) => ['OPEN', 'IN_PROGRESS'].includes(req.status)) && <p className="agent-empty-state">No open maintenance requests.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

export default AgentDashboard
