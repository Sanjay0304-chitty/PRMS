import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  Building2,
  MapPin,
  DollarSign,
  Search,
  Filter,
  Plus,
  RotateCw,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getImageUrl } from '../config/imageHelper';
import { propertyApi, getApiError } from '../api'
import { ROUTES, getAddPropertyRoute, getPropertyDetailPath } from '../config/routes'
import { PROPERTY_TYPES as CANONICAL_PROPERTY_TYPES, propertyTypeLabel } from '../config/propertyTypes'
import './Properties.css'

const TYPE_FILTERS = [
  { key: 'all', label: 'All Types' },
  ...CANONICAL_PROPERTY_TYPES.map((t) => ({ key: t.value, label: t.label })),
]

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'occupied', label: 'Occupied' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'inactive', label: 'Inactive' },
]

function Properties() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [activeType, setActiveType] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  // Pre-fill from ?search=... so the topbar search box (which navigates
  // here rather than filtering in place) actually lands on a filtered view.
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const perPage = 12

  async function fetchProperties() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await propertyApi.list({
        page: currentPage,
        limit: perPage,
        type: activeType === 'all' ? undefined : activeType,
        search: debouncedSearch || undefined,
      })
      const list = data?.data || data?.properties || data
      setProperties(Array.isArray(list) ? list : [])

      setTotalCount(
        data?.pagination?.total ??
          data?.totalCount ??
          data?.total ??
          list.length
      )
    } catch (err) {
      setError(getApiError(err))
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  // Debounce the raw search input into `debouncedSearch`
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Any filter change goes back to page 1
  useEffect(() => {
    setCurrentPage(1)
  }, [activeType, debouncedSearch])

  // Fetch whenever the page, type filter, or committed search term changes
  useEffect(() => {
    fetchProperties()
  }, [currentPage, activeType, debouncedSearch])

  function handleSearch(e) {
    if (e) e.preventDefault()
    setDebouncedSearch(searchTerm.trim())
  }

  const totalPages = Math.max(Math.ceil(totalCount / perPage), 1)

  function statusColor(status) {
    const s = (status || '').toLowerCase()
    if (s === 'available') return 'green'
    if (s === 'pending') return 'yellow'
    if (s === 'rented' || s === 'approved' || s === 'active') return 'blue'
    if (s === 'rejected' || s === 'inactive') return 'red'
    return 'gray'
  }

  /* Client-side status filtering */
  const filteredProperties = properties.filter((p) => {
    if (activeStatus === 'all') return true
    const pStatus = (p.status || '').toLowerCase()
    return pStatus === activeStatus.toLowerCase()
  })

  return (
    <div className="properties-page">
      {/* ── Title bar ── */}
      <div className="properties-titlebar">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">Browse and manage all property listings in your portfolio.</p>
        </div>
        {getAddPropertyRoute(user?.role) && (
          <motion.button
            type="button"
            className="btn-primary-solid"
            onClick={() => {
              const addRoute = getAddPropertyRoute(user?.role)
              if (addRoute) navigate(addRoute)
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={16} /> Add Property
          </motion.button>
        )}
      </div>

      {/* ── Toolbar: Search + Filters + View toggle ── */}
      <div className="panel-card properties-toolbar">
        <form className="properties-search" onSubmit={handleSearch}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Filter size={18} className="filter-icon" />
        </form>

        <div className="properties-controls">
          <div className="properties-type-filters">
            {TYPE_FILTERS.map((t) => (
              <button
                type="button"
                key={t.key}
                className={`chip-btn ${activeType === t.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveType(t.key)
                  setCurrentPage(1)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="properties-status-filters">
            {STATUS_FILTERS.map((s) => (
              <button
                type="button"
                key={s.key}
                className={`status-btn ${activeStatus === s.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveStatus(s.key)
                  setCurrentPage(1)
                }}
              >
                <span className={`status-dot status-${statusColor(s.key)}`} />
                {s.label}
              </button>
            ))}
          </div>

          <div className="view-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <motion.div
          className="panel-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="error-text">{error}</span>
        </motion.div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading properties...</p>
        </div>
      )}

      {/* ── Properties grid / list ── */}
      {!loading && !error && (
        <>
          {filteredProperties.length === 0 ? (
            <div className="panel-card empty-state">
              <div className="empty-icon">
                <Building2 size={56} />
              </div>
              <h2>No properties found</h2>
              <p>Try adjusting your filters or add a new property.</p>
              {getAddPropertyRoute(user?.role) && (
                <motion.button
                  type="button"
                  className="btn-outline"
                  onClick={() => navigate(getAddPropertyRoute(user?.role))}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus size={16} /> Add Property
                </motion.button>
              )}
            </div>
          ) : (
            <>
              {/* Filtered count when a filter is active */}
              {(activeStatus !== 'all' || activeType !== 'all' || searchTerm) && (
                <div className="filter-count">
                  Showing {filteredProperties.length} of {properties.length} properties
                </div>
              )}

              {/* ── Grid / List ── */}
              <div className={`properties-${viewMode}`} role="list">
                {filteredProperties.map((p, i) => {
                  const pid = p._id || p.id || i
                  const stype = statusColor(p.status || 'available')
                  return (
                    <motion.div
                      key={pid}
                      className="property-item"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => navigate(getPropertyDetailPath(user?.role, pid))}
                      onKeyPress={(e) => e.key === 'Enter' && navigate(getPropertyDetailPath(user?.role, pid))}
                      role="listitem"
                      tabIndex={0}
                    >
                      <div className="property-card">
                        {/* Image */}
                        <div className="property-card-image">
                          {(() => {
                            const imageUrl = p.images?.[0]?.url || p.image || p.thumbnail;
                            if (imageUrl) {
                              return <img src={getImageUrl(imageUrl)} alt={p.name || p.title} />;
                            }
                            return (
                              <div className="image-placeholder">
                                <Building2 size={40} />
                              </div>
                            );
                          })()}
                          <span className={`status-badge status-${stype}`}>
                            {p.status || 'Available'}
                          </span>
                        </div>

                        {/* Body */}
                        <div className="property-card-body">
                          <h3 className="property-name">{p.name || p.title || 'Property'}</h3>
                          <div className="property-location">
                            <MapPin size={14} />
                            <span>{p.location || p.address || 'Location not set'}</span>
                          </div>
                          <span className={`type-badge type-${(p.property_type || 'property').toLowerCase()}`}>
                            {propertyTypeLabel(p.property_type)}
                          </span>
                          <div className="property-footer">
                            <div className="property-price">
                              <DollarSign size={14} />
                              <span>
                                {Number(p.price || p.rent || 0).toLocaleString()}{' '}
                                /mo
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>

                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn-outline"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((c) => Math.min(c + 1, totalPages))
                    }
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Properties
