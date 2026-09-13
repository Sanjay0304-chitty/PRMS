import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Globe2,
  Heart,
  Home,
  Loader2,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { getImageUrl } from '../config/imageHelper';
import { propertyApi, searchApi } from '../api';
import './GuestProperties.css';

const PRICE_RANGES = [
  { label: 'Under RM 1,500', min: 0, max: 1500 },
  { label: 'RM 1,500 - RM 2,500', min: 1500, max: 2500 },
  { label: 'RM 2,500 - RM 3,500', min: 2500, max: 3500 },
  { label: 'RM 3,500 - RM 5,000', min: 3500, max: 5000 },
  { label: 'Over RM 5,000', min: 5000, max: Infinity },
];

const PROPERTY_TYPES = ['apartment', 'condo', 'serviced residence', 'studio', 'loft', 'house', 'other'];

function GuestProperties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Issue #14: Filter state */
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  /* Issue #13: Fetch real data */
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await propertyApi.list({ limit: 50 });
      if (res?.data?.data) {
        setProperties(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, []);

   
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  /* Issue #14: Apply filters */
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      /* Search by title, city, state, address */
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [p.title, p.city, p.state, p.address]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      /* Price range filter */
      if (priceFilter !== null) {
        const range = PRICE_RANGES[priceFilter];
        if (range && (p.rent < range.min || p.rent > range.max)) return false;
      }

      /* Property type filter */
      if (typeFilter) {
        const pType = (p.property_type || '').toLowerCase();
        if (!pType.includes(typeFilter.toLowerCase())) return false;
      }

      /* Status filter */
      if (statusFilter) {
        if (p.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [properties, searchQuery, priceFilter, typeFilter, statusFilter]);

  /* Collect unique cities for area tabs */
  const cities = useMemo(() => {
    const citySet = new Set();
    properties.forEach((p) => {
      if (p.city) citySet.add(p.city);
    });
    return Array.from(citySet).slice(0, 6);
  }, [properties]);

  /* Currency formatter */
  const formatRent = (rent) => {
    try {
      return new Intl.NumberFormat('ms-MY', {
        style: 'currency',
        currency: 'MYR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(rent);
    } catch {
      return `RM ${Math.round(rent)}`;
    }
  };

  /* Status display */
  const statusInfo = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'available') return { text: 'Available now', color: 'var(--status-success, #3C9B4D)' };
    if (s === 'occupied') return { text: 'Occupied', color: 'var(--status-warning, #F29F05)' };
    if (s === 'maintenance') return { text: 'Maintenance', color: 'var(--error-state, #D8554F)' };
    return { text: 'Unknown', color: 'var(--text-secondary, #666)' };
  };

  /* Reset filters */
  const resetFilters = () => {
    setSearchQuery('');
    setPriceFilter(null);
    setTypeFilter(null);
    setStatusFilter(null);
  };

  const hasActiveFilters = searchQuery || priceFilter !== null || typeFilter || statusFilter;

  return (
    <main className="guest-properties-page" data-customize-id="global.page">
      <header className="guest-properties-navbar" data-customize-id="global.header">
        <Link to="/" className="guest-properties-logo" data-customize-id="global.brand">
          PRMS
        </Link>

        <nav className="guest-properties-tabs" data-customize-id="global.tabs">
          <button type="button" className="active">
            <Home size={22} />
            Homes
          </button>
          <button type="button">
            <Sparkles size={22} />
            Experiences
          </button>
          <button type="button">
            <Building2 size={22} />
            Services
          </button>
        </nav>

        <div className="guest-properties-actions" data-customize-id="global.top-actions">
          <Link to="/register">Become a host</Link>
          <button type="button" className="circle-btn">
            <Globe2 size={21} />
          </button>
          <div className="guest-user-menu">
            <button type="button" className="menu-btn">
              <Menu size={22} />
              <UserCircle size={28} />
            </button>
            <div className="guest-menu-dropdown">
              <Link to="/register">Join now</Link>
              <Link to="/login">Log in</Link>
              <span></span>
              <a href="#">Help Center</a>
              <a href="#">Gift cards</a>
              <a href="#">Safety guide</a>
            </div>
          </div>
        </div>
      </header>

      {/* Issue #13: Search panel connected to data */}
      <section className="guest-search-panel" data-customize-id="home.search">
        <div className="guest-search-pill">
          <div>
            <span>Where</span>
            <input
              type="text"
              placeholder="Search destinations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {}}
          >
            <Search size={22} />
          </motion.button>
        </div>
      </section>

      {/* Filter bar with area tabs */}
      <section className="guest-filter-bar" data-customize-id="search.filters">
        <div className="guest-area-tabs">
          {cities.map((city, index) => (
            <button
              type="button"
              className={searchQuery === city ? 'active' : ''}
              key={city}
              onClick={() => setSearchQuery(searchQuery === city ? '' : city)}
            >
              {city}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="filter-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={19} />
          Filters
          {hasActiveFilters && <span className="filter-badge" />}
        </button>
      </section>

      {/* Issue #14: Expandable filter panel */}
      {showFilters && (
        <motion.section
          className="filter-panel-expanded"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <div className="filter-panel-inner">
            <div className="filter-group">
              <h3>Price range</h3>
              <div className="filter-options">
                <button
                  type="button"
                  className={priceFilter === null ? 'active' : ''}
                  onClick={() => setPriceFilter(null)}
                >
                  Any price
                </button>
                {PRICE_RANGES.map((range, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={priceFilter === idx ? 'active' : ''}
                    onClick={() => setPriceFilter(priceFilter === idx ? null : idx)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h3>Property type</h3>
              <div className="filter-options">
                <button
                  type="button"
                  className={!typeFilter ? 'active' : ''}
                  onClick={() => setTypeFilter(null)}
                >
                  Any type
                </button>
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={typeFilter === type ? 'active' : ''}
                    onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h3>Availability</h3>
              <div className="filter-options">
                <button
                  type="button"
                  className={!statusFilter ? 'active' : ''}
                  onClick={() => setStatusFilter(null)}
                >
                  Any status
                </button>
                <button
                  type="button"
                  className={statusFilter === 'AVAILABLE' ? 'active' : ''}
                  onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? null : 'AVAILABLE')}
                >
                  Available only
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <button type="button" className="reset-filters-btn" onClick={resetFilters}>
                <X size={14} />
                Clear all filters
              </button>
            )}

            <p className="filter-count">
              Showing {filteredProperties.length} of {properties.length} properties
            </p>
          </div>
        </motion.section>
      )}

      {/* Loading state */}
      {loading && (
        <div className="guest-properties-loading">
          <Loader2 size={32} className="spin" />
          <p>Loading properties...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="guest-properties-error">
          <p>{error}</p>
          <button onClick={fetchProperties}>Try again</button>
        </div>
      )}

      {/* Issue #13: Property listing with real data */}
      {!loading && !error && (
        <section className="guest-listing-section" data-customize-id="home.listings">
          <div className="guest-listing-title">
            <div>
              <h1>
                {filteredProperties.length === properties.length
                  ? 'Popular homes in Malaysia'
                  : `${filteredProperties.length} properties found`}
              </h1>
              <p>Verified rental homes managed under PRMS Malaysia.</p>
            </div>
            <div className="guest-safe-badge">
              <ShieldCheck size={19} />
              Verified listings
            </div>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="no-properties">
              <p>No properties match your filters.</p>
              <button onClick={resetFilters}>Reset filters</button>
            </div>
          ) : (
            <div className="guest-property-grid">
              {filteredProperties.map((property, index) => {
                const status = statusInfo(property.status);
                const firstImg = getImageUrl(property.images?.[0]?.url);
                return (
                  <motion.article
                    key={property.id}
                    className="guest-property-card"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.35 }}
                    whileHover={{ y: -7 }}
                    onClick={() => navigate(`/properties/${property.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="guest-property-image">
                      {firstImg ? (
                        <img src={firstImg} alt={property.title} />
                      ) : (
                        <div className="image-placeholder">
                          <Building2 size={48} />
                        </div>
                      )}
                      <button
                        type="button"
                        className="heart-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Heart size={21} />
                      </button>
                    </div>

                    <div className="guest-property-body">
                      <div className="guest-property-main">
                        <h3>{property.title}</h3>
                      </div>

                      <p>
                        <MapPin size={15} />
                        {property.city
                          ? `${property.city}${property.state ? `, ${property.state}` : ''}`
                          : property.address}
                      </p>

                      <p>
                        <CalendarDays size={15} />
                        <span style={{ color: status.color }}>{status.text}</span>
                      </p>

                      <p>
                        <Users size={15} />
                        {(property.property_type || 'Apartment').charAt(0).toUpperCase() +
                          (property.property_type || 'Apartment').slice(1)}
                      </p>

                      <strong>{formatRent(property.rent)} / month</strong>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default GuestProperties;
