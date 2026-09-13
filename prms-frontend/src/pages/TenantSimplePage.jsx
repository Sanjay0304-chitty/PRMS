import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CircleHelp,
  MessageCircle,
  Search,
  Settings,
  WalletCards,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { bookingApi } from '../api/booking'
import { paymentApi } from '../api/payment'
import { maintenanceApi } from '../api/maintenance'
import { adminApi } from '../api/admin'
import { ROUTES } from '../config/routes'
import { bookingStatusLabel } from '../config/bookingStatus'
import './TenantSimplePage.css'

const formatLabel = bookingStatusLabel

/* ---- Sub-page config (static metadata only) ---- */
const subPages = {
  bookings: {
    title: 'My Bookings',
    subtitle: 'Track viewing appointments, rental applications, approvals, and cancellations.',
    icon: CalendarDays,
    primaryBtn: 'New Request',
    cardKeys: ['total', 'pending', 'approved', 'cancelled'],
    cardLabels: ['Total Bookings', 'Pending', 'Approved', 'Cancelled'],
    columns: ['Property', 'Landlord', 'Viewing Date', 'Status', 'Action'],
    renderRow: (b) => [
      b.property?.title || b.property?.name || (b.propertyId ? 'Property' : '—'),
      b.landlord?.full_name || b.landlord?.name || (b.landlordId ? 'Landlord' : '—'),
      b.viewing_date ? new Date(b.viewing_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
      formatLabel(b.status),
      'View',
    ],
  },
  payments: {
    title: 'Payments',
    subtitle: 'Manage rent payments, deposits, outstanding balances, and receipts.',
    icon: WalletCards,
    primaryBtn: 'Pay Now',
    cardKeys: ['nextDue', 'paid', 'outstanding', 'deposit'],
    cardLabels: ['Next Rent Due', 'Paid This Month', 'Outstanding', 'Deposit Balance'],
    columns: ['Payment ID', 'Property', 'Amount', 'Status', 'Action'],
    renderRow: (p) => [
      p.id ? 'PAY-' + p.id.slice(-4) : p.reference || '—',
      p.propertyId ? 'Property' : '—',
      typeof p.amount === 'number' ? 'RM ' + p.amount.toLocaleString() : p.amount || '—',
      p.status,
      p.status === 'Pending' ? 'Pay Now' : 'Receipt',
    ],
  },
  maintenance: {
    title: 'Maintenance Requests',
    subtitle: 'Submit issues, track repair progress, and communicate with landlords.',
    icon: Wrench,
    primaryBtn: 'New Request',
    cardKeys: ['open', 'inProgress', 'completed', 'urgent'],
    cardLabels: ['Open Requests', 'In Progress', 'Completed', 'Urgent'],
    columns: ['Ticket ID', 'Property', 'Issue', 'Status', 'Action'],
    renderRow: (m) => [
      m.id ? 'TCK-' + m.id.slice(-4) : '—',
      m.property?.title || m.property?.name || m.propertyTitle || (m.propertyId ? 'Property' : '—'),
      m.issue || m.title || m.description || '—',
      formatLabel(m.status),
      'View',
    ],
  },
  messages: {
    title: 'Messages',
    subtitle: 'Chat with landlords, admin support, and maintenance contacts.',
    icon: MessageCircle,
    primaryBtn: 'New Message',
    cardKeys: ['unread', 'total', 'unread', 'total'],
    cardLabels: ['Unread', 'Total', 'Unread', 'Total'],
    columns: ['Conversation', 'Related Property', 'Category', 'Status', 'Action'],
    renderRow: (n, i) => [
      n.title || 'Notification',
      n.property?.title || n.property?.name || '—',
      formatLabel(n.type || 'General'),
      n.isRead ? 'Read' : 'Unread',
      n.isRead ? 'View' : 'Reply',
    ],
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage tenant profile, notifications, security, and payment methods.',
    icon: Settings,
    primaryBtn: 'Update',
    cardKeys: ['profile', 'notifications', 'security', 'payment'],
    cardLabels: ['Profile', 'Notifications', 'Security', 'Payment Method'],
    columns: ['Setting', 'Category', 'Status', 'Last Updated', 'Action'],
    renderRow: null,
  },
  help: {
    title: 'Help Center',
    subtitle: 'Find tenant guides, support cases, and troubleshooting help.',
    icon: CircleHelp,
    primaryBtn: 'Submit Ticket',
    cardKeys: ['cases', 'guides', 'sla', 'status'],
    cardLabels: ['Open Cases', 'Help Guides', 'Response SLA', 'System Status'],
    columns: ['Topic', 'Category', 'Priority', 'Status', 'Action'],
    renderRow: null,
  },
}

export default function TenantSimplePage({ type, label, children }) {
  const navigate = useNavigate()
  const resolvedType = type || (label === 'Messages' ? 'messages' : label === 'Help Center' ? 'help' : 'bookings')
  const cfg = subPages[resolvedType] || subPages.bookings
  const Icon = cfg.icon
  const { user, updateProfile } = useAuth()

  const [cards, setCards] = useState(cfg.cardLabels.map((l) => ({ label: l, value: '...' })))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  /* ---- Fetch real data when type or user changes ---- */
   
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    async function load() {
      try {
        if (resolvedType === 'bookings') {
          const { data } = await bookingApi.myBookings()
          const items = data?.data || data || []
          setRows(items)
          const status = (b) => String(b.status || '').toLowerCase()
          setCards([
            { label: 'Total Bookings', value: items.length },
            { label: 'Pending', value: items.filter((b) => status(b) === 'pending').length },
            { label: 'Approved', value: items.filter((b) => status(b) === 'confirmed').length },
            { label: 'Cancelled', value: items.filter((b) => status(b) === 'cancelled').length },
          ])
        } else if (resolvedType === 'payments') {
          const { data } = await paymentApi.list()
          const items = data?.data || data || []
          setRows(items)
          const paid = items.filter((p) => p.status === 'Paid')
          const pending = items.filter((p) => p.status === 'Pending')
          setCards([
            { label: 'Next Rent Due', value: pending.length ? 'RM ' + (pending[0]?.amount || 0).toLocaleString() : '—' },
            { label: 'Paid This Month', value: 'RM ' + paid.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString() },
            { label: 'Outstanding', value: pending.length },
            { label: 'Deposit Balance', value: '—' },
          ])
        } else if (resolvedType === 'maintenance') {
          const { data } = await maintenanceApi.list()
          const items = data?.data || data || []
          setRows(items)
          const status = (m) => String(m.status || '').toLowerCase()
          setCards([
            { label: 'Open Requests', value: items.filter((m) => status(m) === 'open').length },
            { label: 'In Progress', value: items.filter((m) => status(m) === 'in_progress').length },
            { label: 'Completed', value: items.filter((m) => ['resolved', 'closed'].includes(status(m))).length },
            { label: 'Urgent', value: items.filter((m) => String(m.priority || '').toLowerCase() === 'high').length },
          ])
        } else if (resolvedType === 'messages') {
          const { data } = await adminApi.getNotifications()
          const items = data?.data || data || []
          setRows(items)
          const unread = items.filter((n) => !n.isRead).length
          setCards([
            { label: 'Unread', value: unread },
            { label: 'Total', value: items.length },
            { label: 'Unread', value: unread },
            { label: 'Total', value: items.length },
          ])
        } else if (resolvedType === 'settings') {
          setCards([
            { label: 'Profile', value: user?.full_name || 'Active' },
            { label: 'Notifications', value: 'On' },
            { label: 'Security', value: 'Secure' },
            { label: 'Payment Method', value: 'Linked' },
          ])
          setRows([
            ['Profile Details', 'Account', 'Active', new Date().toLocaleDateString(), 'Manage'],
            ['Payment Method', 'Payments', 'Linked', '—', 'Manage'],
            ['Login Verification', 'Security', 'Enabled', 'Today', 'Manage'],
          ])
        } else if (resolvedType === 'help') {
          setCards([
            { label: 'Open Cases', value: '0' },
            { label: 'Help Guides', value: '16' },
            { label: 'Response SLA', value: '4h' },
            { label: 'System Status', value: 'Online' },
          ])
          setRows([
            ['How to pay rent', 'Payments', 'Low', 'Available', 'Open'],
            ['Booking cancellation guide', 'Bookings', 'Low', 'Available', 'Open'],
            ['Maintenance request issue', 'Maintenance', 'Medium', 'Open', 'View'],
          ])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.message || e.response?.data?.error?.message || e.message || 'Failed to load data')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [resolvedType, user])

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows
    const search = searchTerm.trim().toLowerCase()
    return rows.filter((row, i) => {
      const cells = cfg.renderRow ? cfg.renderRow(row, i) : row
      if (!cells) return false
      return cells.some((cell) => String(cell || '').toLowerCase().includes(search))
    })
  }, [rows, searchTerm, cfg])

  /* ---- Wire the primary button ---- */
  const handlePrimaryBtn = async () => {
    if (resolvedType === 'maintenance') {
      const issue = prompt('Describe the issue:')
      if (issue) {
        try {
          await maintenanceApi.create({ issue, description: issue, status: 'Open' })
          window.location.reload()
        } catch (e) {
          alert('Failed to create: ' + e.message)
        }
      }
    } else if (resolvedType === 'settings') {
      const name = prompt('Full name:', user?.full_name)
      const phone = prompt('Phone:', user?.phone)
      if (name || phone) {
        try {
          await updateProfile({ full_name: name, phone })
        } catch (e) {
          alert('Failed to update: ' + e.message)
        }
      }
    }
  }

  const handleRowAction = (row) => {
    if (resolvedType === 'bookings') navigate(ROUTES.tenant.bookings)
    else if (resolvedType === 'payments') navigate(row.id ? `/tenant/payments/${row.id}` : ROUTES.tenant.payments)
    else if (resolvedType === 'maintenance') navigate(ROUTES.tenant.maintenance)
    else if (resolvedType === 'settings') navigate(ROUTES.tenant.profile)
  }

  return (
    <>
      <section className="tenant-simple-hero">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.subtitle}</p>
        </div>
        {resolvedType !== 'messages' && (
          <button type="button" className="tenant-simple-primary-btn" onClick={handlePrimaryBtn}>
            {cfg.primaryBtn}
          </button>
        )}
      </section>

      {children && <section style={{ marginBottom: '1.5rem' }}>{children}</section>}

      {/* Messages owns its own stats + conversation list inside
          CommunicationHub (children above) - the generic cards/table below
          are sourced from notifications, not real messages, and duplicate
          that UI with a dead "Reply" button, so skip them here. */}
      {resolvedType !== 'messages' && (
        <>
          <section className="tenant-simple-cards">
            {cards.map((card) => (
              <article className="tenant-simple-card" key={card.label}>
                <div className="tenant-simple-icon">
                  <Icon size={26} />
                </div>
                <p>{card.label}</p>
                <h3>{card.value}</h3>
              </article>
            ))}
          </section>

          <section className="tenant-simple-table-card">
            <div className="tenant-simple-table-header">
              <h2>{cfg.title}</h2>
              <div className="tenant-simple-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {error && <p style={{ color: 'red', padding: 12 }}>{error}</p>}

            {loading ? (
              <div className="tenant-simple-table">
                <div className="tenant-simple-table-head">Loading...</div>
              </div>
            ) : (
              <div className="tenant-simple-table">
                <div
                  className="tenant-simple-table-head"
                  style={{ gridTemplateColumns: `repeat(${cfg.columns.length}, 1fr)` }}
                >
                  {cfg.columns.map((col) => (
                    <p key={col}>{col}</p>
                  ))}
                </div>

                {filteredRows.length === 0 && (
                  <div className="tenant-simple-table-row">
                    <div colSpan={cfg.columns.length} style={{ gridColumn: `1 / ${cfg.columns.length + 1}`, textAlign: 'center', padding: 20 }}>
                      {searchTerm ? 'No matching records found.' : 'No records found'}
                    </div>
                  </div>
                )}

                {filteredRows.map((row, i) => {
                  const cells = cfg.renderRow ? cfg.renderRow(row, i) : row
                  if (!cells) return null
                  return (
                    <div
                      className="tenant-simple-table-row"
                      style={{ gridTemplateColumns: `repeat(${cfg.columns.length}, 1fr)` }}
                      key={row.id || i}
                    >
                      {cells.map((cell, ci) => (
                        <div key={`${String(ci)}-${row.id || i}`}>
                          {ci === cells.length - 1 ? (
                            <button type="button" onClick={() => handleRowAction(row)}>{cell}</button>
                          ) : (
                            <span>{cell}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
