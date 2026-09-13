import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarDays,
  CircleHelp,
  MessageCircle,
  Search,
  Settings,
  WalletCards,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { propertyApi } from '../api/property'
import { bookingApi } from '../api/booking'
import { paymentApi } from '../api/payment'
import { maintenanceApi } from '../api/maintenance'
import { adminApi } from '../api/admin'
import './LandlordSimplePage.css'

const subPages = {
  properties: {
    title: 'My Properties',
    subtitle: 'Manage your listings, unit status, rental pricing, and approval progress.',
    icon: Building2,
    primaryBtn: 'Add Property',
    cardLabels: ['Total Listings', 'Occupied', 'Vacant', 'Pending Approval'],
    columns: ['Property', 'Location', 'Monthly Rent', 'Status', 'Action'],
    renderRow: (p) => [
      p.title || '—',
      p.city || '—',
      typeof p.monthly_rent === 'number' ? 'RM ' + p.monthly_rent.toLocaleString() : (p.rent || '—'),
      p.status || 'Active',
      'View',
    ],
  },
  bookings: {
    title: 'Booking Requests',
    subtitle: 'Review tenant booking requests, approvals, scheduled viewings, and cancellations.',
    icon: CalendarDays,
    primaryBtn: 'Review All',
    cardLabels: ['Total Bookings', 'Pending', 'Approved', 'Cancelled'],
    columns: ['Tenant', 'Property', 'Date', 'Status', 'Action'],
    renderRow: (b) => [
      b.tenantId ? 'Tenant' : '—',
      b.propertyTitle || b.propertyId ? 'Property' : '—',
      b.viewing_date ? new Date(b.viewing_date).toLocaleDateString() : '—',
      b.status,
      b.status === 'Pending' ? 'Approve' : 'View',
    ],
  },
  finance: {
    title: 'Finance',
    subtitle: 'Track rent income, payment records, deposits, and late payments.',
    icon: WalletCards,
    primaryBtn: 'Export Report',
    cardLabels: ['Monthly Revenue', 'Pending Rent', 'Deposits', 'Late Payments'],
    columns: ['Transaction', 'Tenant', 'Amount', 'Status', 'Action'],
    renderRow: (p) => [
      p.id ? 'RENT-' + p.id.slice(-4) : (p.reference || '—'),
      p.tenantId ? 'Tenant' : '—',
      typeof p.amount === 'number' ? 'RM ' + p.amount.toLocaleString() : p.amount || '—',
      p.status,
      p.status === 'Pending' ? 'Remind' : 'View',
    ],
  },
  maintenance: {
    title: 'Maintenance',
    subtitle: 'Manage maintenance tickets, urgent repairs, staff assignments, and tenant updates.',
    icon: Wrench,
    primaryBtn: 'Assign Staff',
    cardLabels: ['Open Tickets', 'High Priority', 'In Progress', 'Completed'],
    columns: ['Ticket', 'Property', 'Issue', 'Priority', 'Action'],
    renderRow: (m) => [
      m.id ? 'TCK-' + m.id.slice(-4) : '—',
      m.propertyTitle || m.propertyId ? m.propertyTitle || 'Property' : '—',
      m.issue || m.description || '—',
      m.priority || 'Medium',
      m.status === 'Open' ? 'Assign' : 'View',
    ],
  },
  messages: {
    title: 'Messages',
    subtitle: 'Communicate with tenants, respond to booking questions, and manage support threads.',
    icon: MessageCircle,
    primaryBtn: 'New Message',
    cardLabels: ['Unread', 'Total', 'Unread', 'Total'],
    columns: ['Conversation', 'Related Property', 'Category', 'Status', 'Action'],
    renderRow: (n, i) => [
      n.title || 'Notification',
      '—',
      n.type || 'General',
      n.isRead ? 'Read' : 'Unread',
      n.isRead ? 'View' : 'Reply',
    ],
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage landlord account preferences, notifications, security, and profile details.',
    icon: Settings,
    primaryBtn: 'Update',
    cardLabels: ['Profile', 'Notifications', 'Security', 'Bank Account'],
    columns: ['Setting', 'Category', 'Status', 'Last Updated', 'Action'],
    renderRow: null,
  },
  help: {
    title: 'Help Center',
    subtitle: 'Find landlord guides, support cases, and troubleshooting help.',
    icon: CircleHelp,
    primaryBtn: 'Submit Ticket',
    cardLabels: ['Open Cases', 'Guides', 'Response SLA', 'Status'],
    columns: ['Topic', 'Category', 'Priority', 'Status', 'Action'],
    renderRow: null,
  },
}

export default function LandlordSimplePage({ type, label }) {
  const resolvedType = type || (label === 'Help Center' ? 'help' : 'properties')
  const cfg = subPages[resolvedType] || subPages.properties
  const Icon = cfg.icon
  const { user, updateProfile } = useAuth()

  const [cards, setCards] = useState(cfg.cardLabels.map((l) => ({ label: l, value: '...' })))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

   
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    async function load() {
      try {
        if (resolvedType === 'properties') {
          const { data } = await propertyApi.myProperties()
          const items = data?.data || data || []
          setRows(items)
          setCards([
            { label: 'Total Listings', value: items.length },
            { label: 'Occupied', value: items.filter((p) => p.status === 'Occupied' || p.status === 'Active').length },
            { label: 'Vacant', value: items.filter((p) => p.status === 'Vacant').length },
            { label: 'Pending Approval', value: items.filter((p) => p.status === 'Pending').length },
          ])
        } else if (resolvedType === 'bookings') {
          const { data } = await bookingApi.list()
          const items = data?.data || data || []
          setRows(items)
          setCards([
            { label: 'Total Bookings', value: items.length },
            { label: 'Pending', value: items.filter((b) => b.status === 'Pending').length },
            { label: 'Approved', value: items.filter((b) => b.status === 'Approved').length },
            { label: 'Cancelled', value: items.filter((b) => b.status === 'Cancelled').length },
          ])
        } else if (resolvedType === 'finance') {
          const { data } = await paymentApi.list()
          const items = data?.data || data || []
          setRows(items)
          const paid = items.filter((p) => p.status === 'Paid')
          const pending = items.filter((p) => p.status === 'Pending')
          const totalPaid = paid.reduce((s, p) => s + (p.amount || 0), 0)
          const totalPending = pending.reduce((s, p) => s + (p.amount || 0), 0)
          setCards([
            { label: 'Monthly Revenue', value: 'RM ' + totalPaid.toLocaleString() },
            { label: 'Pending Rent', value: 'RM ' + totalPending.toLocaleString() },
            { label: 'Deposits', value: '—' },
            { label: 'Late Payments', value: items.filter((p) => p.status === 'Overdue' || p.status === 'Late').length },
          ])
        } else if (resolvedType === 'maintenance') {
          const { data } = await maintenanceApi.list()
          const items = data?.data || data || []
          setRows(items)
          setCards([
            { label: 'Open Tickets', value: items.filter((m) => m.status === 'Open').length },
            { label: 'High Priority', value: items.filter((m) => m.priority === 'High').length },
            { label: 'In Progress', value: items.filter((m) => m.status === 'In Progress' || m.status === 'InProgress').length },
            { label: 'Completed', value: items.filter((m) => m.status === 'Completed').length },
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
            { label: 'Bank Account', value: 'Linked' },
          ])
          setRows([
            ['Profile Details', 'Account', 'Active', new Date().toLocaleDateString(), 'Manage'],
            ['Rent Alerts', 'Notification', 'Enabled', 'Today', 'Manage'],
            ['Bank Payout', 'Finance', 'Linked', '—', 'Manage'],
          ])
        } else if (resolvedType === 'help') {
          setCards([
            { label: 'Open Cases', value: '0' },
            { label: 'Guides', value: '12' },
            { label: 'Response SLA', value: '4h' },
            { label: 'Status', value: 'Online' },
          ])
          setRows([
            ['How to approve tenant booking', 'Bookings', 'Low', 'Available', 'Open'],
            ['Payment not reflected', 'Finance', 'High', 'Open', 'View'],
            ['Listing verification issue', 'Properties', 'Medium', 'Open', 'Review'],
          ])
        }
      } catch (e) {
        setError(e.message || 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [resolvedType, user])

  const handlePrimaryBtn = async () => {
    if (resolvedType === 'settings') {
      const name = prompt('Full name:', user?.full_name)
      const phone = prompt('Phone:', user?.phone)
      if (name || phone) {
        try {
          await updateProfile({ full_name: name, phone })
        } catch (e) {
          alert('Failed: ' + e.message)
        }
      }
    }
  }

  return (
    <>
      <section className="landlord-simple-hero">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.subtitle}</p>
        </div>
        <button type="button" className="landlord-simple-primary-btn" onClick={handlePrimaryBtn}>
          {cfg.primaryBtn}
        </button>
      </section>

      <section className="landlord-simple-cards">
        {cards.map((card) => (
          <article className="landlord-simple-card" key={card.label}>
            <div className="landlord-simple-icon">
              <Icon size={26} />
            </div>
            <p>{card.label}</p>
            <h3>{card.value}</h3>
          </article>
        ))}
      </section>

      <section className="landlord-simple-table-card">
        <div className="landlord-simple-table-header">
          <h2>{cfg.title}</h2>
          <div className="landlord-simple-search">
            <Search size={17} />
            <input type="text" placeholder="Search records..." />
          </div>
        </div>

        {error && <p style={{ color: 'red', padding: 12 }}>{error}</p>}

        {loading ? (
          <div className="landlord-simple-table">
            <div className="landlord-simple-table-head">Loading...</div>
          </div>
        ) : (
          <div className="landlord-simple-table">
            <div
              className="landlord-simple-table-head"
              style={{ gridTemplateColumns: `repeat(${cfg.columns.length}, 1fr)` }}
            >
              {cfg.columns.map((col) => (
                <p key={col}>{col}</p>
              ))}
            </div>

            {rows.length === 0 && (
              <div className="landlord-simple-table-row">
                <div style={{ gridColumn: `1 / ${cfg.columns.length + 1}`, textAlign: 'center', padding: 20 }}>
                  No records found
                </div>
              </div>
            )}

            {rows.map((row, i) => {
              const cells = cfg.renderRow ? cfg.renderRow(row, i) : row
              if (!cells) return null
              return (
                <div
                  className="landlord-simple-table-row"
                  style={{ gridTemplateColumns: `repeat(${cfg.columns.length}, 1fr)` }}
                  key={row.id || i}
                >
                  {cells.map((cell, ci) => (
                    <div key={`${ci}-${row.id || i}`}>
                      {ci === cells.length - 1 ? (
                        <button type="button">{cell}</button>
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
  )
}
