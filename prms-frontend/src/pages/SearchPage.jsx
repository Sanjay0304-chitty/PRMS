import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getImageUrl } from '../config/imageHelper';
import { searchApi } from '../api/search'
import { ROUTES } from '../config/routes'
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import './SearchPage.css'

function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('relevance')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    try {
      const params = { page: String(page), limit: '20' }
      if (query) params.location = query
      if (location) params.location = location
      if (type !== 'all') params.property_type = type
      if (sort === 'price_asc') params.min_price = '0'
      else if (sort === 'price_desc') params.max_price = '1000000'

      let response
      try {
        response = await searchApi.search(params)
      } catch {
        response = await searchApi.listWithFilters(params)
      }

      /* Backend returns { properties, total, page, limit, totalPages } inside successResponse.data */
      const resultData = response.data?.data
      if (resultData && Array.isArray(resultData.properties)) {
        setResults(resultData.properties)
        setTotal(resultData.total || resultData.properties.length)
      } else if (Array.isArray(resultData)) {
        setResults(resultData)
        setTotal(resultData.length)
      } else {
        setResults([])
        setTotal(0)
      }
    } catch (err) {
      setError(err.message || 'Search failed')
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }, [query, location, type, sort, page])

  // Run the search once on load when arriving with ?q= already set (e.g.
  // from the sidebar search box) - otherwise landing here just shows the
  // empty filter panel with no results until the user re-submits.
  useEffect(() => {
    if (searchParams.get('q')) handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearFilters = useCallback(() => {
    setQuery('')
    setLocation('')
    setType('all')
    setSort('relevance')
    setPage(1)
  }, [])

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'condo', label: 'Condominium' },
    { value: 'house', label: 'House' },
    { value: 'studio', label: 'Studio' },
  ]

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest' },
  ]

  return (
    <div className="search-page" data-customize-id="global.page">
      {/* Search Header */}
      <div className="search-header" data-customize-id="search.header">
        <div className="search-header-content">
          <h1>Find Your Next Home</h1>
          <p>Search verified rental properties across Malaysia</p>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-group">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by property name, location, or features..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="search-input-group">
              <MapPin size={20} />
              <input
                type="text"
                placeholder="Location (e.g., Kuala Lumpur)"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <button type="submit" className="search-submit">
              <Search size={18} />
              Search
            </button>
          </form>
        </div>
      </div>

      <main className="search-body" data-customize-id="search.body">
        {/* Filters Sidebar */}
        <aside className={`search-filters ${filtersOpen ? 'open' : ''}`} data-customize-id="search.filters">
          <div className="filter-header">
            <h3>Filters</h3>
            <button type="button" onClick={clearFilters}>
              Clear All
            </button>
          </div>

          <div className="filter-group">
            <label>Property Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button type="button" className="apply-filters" onClick={handleSearch}>
            <SlidersHorizontal size={16} />
            Apply Filters
          </button>
        </aside>

        {/* Results */}
        <section className="search-results" data-customize-id="search.results">
          <div className="results-toolbar">
            <button
              type="button"
              className="filter-toggle"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter size={16} />
              Filters
            </button>

            <p className="results-count">
              {loading ? 'Searching...' : `${total} properties found`}
            </p>

            <div className="sort-inline">
              <span>Sort:</span>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div className="loading-skeleton">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-text" />
                  <div className="skeleton-text short" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              {error} <button className="btn btn-sm" onClick={handleSearch}>Retry</button>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="empty-state">
              <Search size={48} />
              <h3>No properties found</h3>
              <p>Try adjusting your search terms or filters</p>
            </div>
          )}

          <div className="results-grid">
            {results.map((property) => (
              <article
                key={property.id}
                className="result-card"
                onClick={() => navigate(ROUTES.public.propertyDetails(property.id))}
              >
                <div className="result-image">
                  {property.images?.[0]?.url ? (
                    <img src={getImageUrl(property.images[0].url)} alt={property.title || property.name} />
                  ) : property.image ? (
                    <img src={property.image} alt={property.title} />
                  ) : (
                    <div className="result-image-placeholder">
                      <Building2 size={32} />
                    </div>
                  )}
                  {property.status === 'available' && (
                    <span className="status-badge available">Available</span>
                  )}
                </div>

                <div className="result-info">
                  <h3>{property.title}</h3>
                  <div className="result-location">
                    <MapPin size={14} />
                    <span>{property.location || property.address || 'Malaysia'}</span>
                  </div>

                  <div className="result-meta">
                    <span>{property.rent && `RM ${property.rent}/month`}</span>
                    {property.area && <span>{property.area} sqft</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default SearchPage
