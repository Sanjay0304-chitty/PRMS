import { useEffect, useState } from 'react'
import {
  CircleHelp,
  Search,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { maintenanceApi } from '../api/maintenance'
import { propertyApi } from '../api/property'
import './AdminSimplePage.css'

const subPages = {
  maintenance: {
    title: 'Maintenance Center',
    subtitle: 'Track maintenance tickets, priorities, progress, and assigned staff.',
    icon: Wrench,
    cardLabels: ['Open Tickets', 'High Priority', 'In Progress', 'Completed'],
    columns: ['Ticket', 'Property', 'Issue', 'Priority', 'Action'],
    renderRow: (m, i, ctx) => [
      m.id ? 'TCK-' + m.id.slice(-4) : '—',
      ctx?.propertyNames?.[m.propertyId] || m.propertyId || '—',
      m.issue || m.description || '—',
      m.priority || 'MEDIUM',
      m.status === 'OPEN' ? 'Assign' : 'View',
    ],
  },
  help: {
    title: 'Admin Help Center',
    subtitle: 'Find support resources, guides, escalation contacts, and troubleshooting steps.',
    icon: CircleHelp,
    cardLabels: ['Open Support Cases', 'Guides', 'Response SLA', 'System Status'],
    columns: ['Topic', 'Category', 'Priority', 'Status', 'Action'],
    renderRow: null,
  },
}

export default function AdminSimplePage({ type = 'maintenance' }) {
  const cfg = subPages[type] || subPages.maintenance
  const Icon = cfg.icon
  const { user } = useAuth()

  const [cards, setCards] = useState(cfg.cardLabels.map((l) => ({ label: l, value: '...' })))
  const [rows, setRows] = useState([])
  const [propertyNames, setPropertyNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (type !== 'maintenance') return
    // Maintenance tickets only store a bare propertyId (no real relation) -
    // resolve names client-side the same way the Agent/Landlord pages do.
    propertyApi.list({ limit: 100 }).then((res) => {
      const data = res.data?.data
      const items = Array.isArray(data) ? data : data?.properties || []
      setPropertyNames(Object.fromEntries(items.map((p) => [p.id, p.title])))
    }).catch(() => {})
  }, [type])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (type === 'maintenance') {
          const { data } = await maintenanceApi.list()
          const items = data?.data || data || []
          setRows(items)
          setCards([
            { label: 'Open Tickets', value: items.filter((m) => m.status === 'OPEN').length },
            { label: 'High Priority', value: items.filter((m) => m.priority === 'HIGH' || m.priority === 'URGENT').length },
            { label: 'In Progress', value: items.filter((m) => m.status === 'IN_PROGRESS').length },
            { label: 'Completed', value: items.filter((m) => m.status === 'RESOLVED' || m.status === 'CLOSED').length },
          ])
        } else if (type === 'help') {
          setCards([
            { label: 'Open Support Cases', value: '0' },
            { label: 'Guides', value: '18' },
            { label: 'Response SLA', value: '2h' },
            { label: 'System Status', value: 'Online' },
          ])
          setRows([
            ['User verification issue', 'KYC', 'Medium', 'Open', 'View'],
            ['Payment dispute flow', 'Finance', 'High', 'Open', 'Review'],
            ['Property approval guide', 'Properties', 'Low', 'Available', 'Open'],
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
  }, [type, user])

  const filteredRows = rows.filter((row) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const cells = cfg.renderRow ? cfg.renderRow(row, 0, { propertyNames }) : row
    if (!cells) return false
    return cells.some((c) => String(c).toLowerCase().includes(q))
  })

  return (
    <>
      <section className="admin-simple-hero">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.subtitle}</p>
        </div>
      </section>

      <section className="admin-simple-cards">
        {cards.map((card) => (
          <article className="admin-simple-card" key={card.label}>
            <div className="admin-simple-icon">
              <Icon size={26} />
            </div>
            <p>{card.label}</p>
            <h3>{card.value}</h3>
          </article>
        ))}
      </section>

      <section className="admin-simple-table-card">
        <div className="admin-simple-table-header">
          <h2>{cfg.title}</h2>
          <div className="admin-simple-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && <p style={{ color: 'red', padding: 12 }}>{error}</p>}

        {loading ? (
          <div className="admin-simple-table">
            <div className="admin-simple-table-head">Loading...</div>
          </div>
        ) : (
          <div className="admin-simple-table">
            <div
              className="admin-simple-table-head"
              style={{ gridTemplateColumns: `repeat(${cfg.columns.length}, 1fr)` }}
            >
              {cfg.columns.map((col) => (
                <p key={col}>{col}</p>
              ))}
            </div>

            {filteredRows.length === 0 && (
              <div className="admin-simple-table-row">
                <div style={{ gridColumn: `1 / ${cfg.columns.length + 1}`, textAlign: 'center', padding: 20 }}>
                  {search ? `No records match "${search}"` : 'No records found'}
                </div>
              </div>
            )}

            {filteredRows.map((row, i) => {
              const cells = cfg.renderRow ? cfg.renderRow(row, i, { propertyNames }) : row
              if (!cells) return null
              return (
                <div
                  className="admin-simple-table-row"
                  style={{ gridTemplateColumns: `repeat(${cfg.columns.length}, 1fr)` }}
                  key={row.id || i}
                >
                  {cells.map((cell, ci) => (
                    <div key={`${ci}-${row.id || i}`}>
                      {ci === cells.length - 1 ? (
                        <button type="button" disabled title="Not yet available">{cell}</button>
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
