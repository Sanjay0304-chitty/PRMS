import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ArrowLeft,
  Clock,
  Droplets,
  Edit3,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  ParkingCircle,
  Search,
  ShieldCheck,
  Star,
  Sun,
  Tv,
  UserCircle,
  Utensils,
  Wifi,
  Wind,
  AlertTriangle,
} from 'lucide-react';
import { propertyApi, viewingApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import TenantBookingModal from '../components/TenantBookingModal';
import ImageGallery from '../components/ImageGallery';
import Modal from '../components/Modal';
import { VideoUploader, DocumentUploader } from '../components/MediaUploader';
import { getPropertyRoute, getMessagesRoute } from '../config/routes';
import './PropertyDetail.css';

/* ================= AMENITY ICON MAP ================= */
function amenityIcon(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) return <Wifi size={18} />;
  if (lower.includes('water') || lower.includes('utilities')) return <Droplets size={18} />;
  if (lower.includes('kitchen') || lower.includes('cooking')) return <Utensils size={18} />;
  if (lower.includes('parking') || lower.includes('car')) return <ParkingCircle size={18} />;
  if (lower.includes('tv') || lower.includes('streaming')) return <Tv size={18} />;
  if (lower.includes('cooling') || lower.includes('ac') || lower.includes('air') || lower.includes('cond')) return <Wind size={18} />;
  if (lower.includes('sun') || lower.includes('view') || lower.includes('balcony')) return <Sun size={18} />;
  if (lower.includes('security') || lower.includes('safe') || lower.includes('cctv')) return <ShieldCheck size={18} />;
  if (lower.includes('pool')) return <Droplets size={18} />;
  return <Search size={18} />;
}

/* ================= BOOKING CARD (RIGHT SIDEBAR) ================= */
function BookingCard({ property, onBookClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);

  const owner = property.owner;
  const isOwnProperty = !!(user && owner && (owner.id === user.id || property.ownerId === user.id));

  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingPreferred, setViewingPreferred] = useState('');
  const [viewingAlternative, setViewingAlternative] = useState('');
  const [viewingMessage, setViewingMessage] = useState('');
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingResult, setViewingResult] = useState(null);

  async function handleRequestViewing() {
    if (!viewingPreferred) return;
    setViewingSubmitting(true);
    setViewingResult(null);
    try {
      await viewingApi.request({
        propertyId: property.id,
        preferredTime: viewingPreferred,
        alternativeTime: viewingAlternative || undefined,
        message: viewingMessage || undefined,
      });
      setViewingResult({ success: true, message: 'Viewing requested — the landlord will respond soon.' });
      setTimeout(() => {
        setShowViewingModal(false);
        setViewingResult(null);
        setViewingPreferred('');
        setViewingAlternative('');
        setViewingMessage('');
      }, 1800);
    } catch (err) {
      setViewingResult({ success: false, message: err.response?.data?.error?.message || 'Failed to request viewing' });
    } finally {
      setViewingSubmitting(false);
    }
  }

  function handleMessageOwner() {
    if (!owner?.id) return;
    navigate(getMessagesRoute(user?.role), {
      state: { startConversationWith: { id: owner.id, name: owner.full_name || 'Property Owner' } },
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  const nightlyRate = property.rent || 0;
  // checkOut can be momentarily empty right after clicking a calendar day
  // to start a fresh range (before its checkout day is picked) — fall
  // back to 1 night instead of showing "RM NaN" in the price breakdown.
  const rawNights = checkIn && checkOut
    ? Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))
    : 1;
  const nights = Math.max(1, Number.isFinite(rawNights) ? rawNights : 1);
  const subtotal = nightlyRate * nights;
  const cleaningFee = Math.round(nightlyRate * 0.28);
  const serviceFee = Math.round(nightlyRate * 0.33);
  const total = subtotal + cleaningFee + serviceFee;

  const formatRM = (n) =>
    new Intl.NumberFormat('ms-MY', {
      style: 'currency', currency: 'MYR', minimumFractionDigits: 0,
    }).format(n);

  // Mini calendar — the viewed month is independent of checkIn/checkOut so
  // browsing months with </> doesn't silently change the actual booking
  // dates (it used to call setCheckIn on every month change).
  const [viewDate, setViewDate] = useState(() => new Date());
  useEffect(() => {
    if (checkIn) setViewDate(new Date(checkIn + 'T00:00:00'));
  }, [checkIn]);

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const checkInDate = checkIn ? new Date(checkIn + 'T00:00:00') : null;
  const checkOutDate = checkOut ? new Date(checkOut + 'T00:00:00') : null;

  const toISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Compares full dates (year + month + day), not just the day-of-month
  // number — comparing bare day numbers broke as soon as the calendar
  // showed a month other than checkIn's (e.g. day 5 of next month was
  // wrongly marked "past" just because 5 < today's day-of-month).
  const getDayClass = (date, isPast) => {
    if (isPast) return 'cal-past cal-disabled';
    if (checkInDate && checkOutDate && date >= checkInDate && date < checkOutDate) return 'cal-selected';
    if (checkInDate && date.getTime() === checkInDate.getTime()) return 'cal-boundary';
    if (checkOutDate && date.getTime() === checkOutDate.getTime()) return 'cal-boundary';
    return '';
  };

  function handleDayClick(date, isPast) {
    if (isPast) return; // dates before today are unavailable
    const iso = toISODate(date);
    // First click (or restarting after a full range is already picked)
    // sets check-in; the next click after that sets check-out, as long as
    // it's a later date — otherwise it just moves check-in there instead.
    if (!checkInDate || (checkOutDate && date >= checkOutDate) || date < checkInDate) {
      setCheckIn(iso);
      setCheckOut('');
    } else {
      setCheckOut(iso);
    }
  }

  // Build calendar days as real Date objects spanning the full 6-week grid
  // (leading days from the previous month, the current month, and trailing
  // days from the next), so every cell carries an unambiguous date.
  const calDays = [];
  for (let i = firstDay; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    calDays.push({ date: d, current: false, isPast: d < todayMidnight });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    calDays.push({ date, current: true, isPast: date < todayMidnight });
  }
  while (calDays.length % 7 !== 0) {
    const last = calDays[calDays.length - 1].date;
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    calDays.push({ date: d, current: false, isPast: d < todayMidnight });
  }

  return (
    <>
      <div className="booking-card">
        <div className="booking-card-header">
          <div>
            <div className="booking-price-line">
              <span className="booking-price-amount">{formatRM(nightlyRate)} / {property.rent_period || 'month' || 'night'}</span>
              <span className="booking-rating">
                <Star size={13} fill="#F59E0B" color="#F59E0B" />
                {property.rating || '4.9'}{' '}
                <span className="booking-rating-loc">{property.city || 'Bukit Bintang'}, {property.state || 'KL'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dates / Guests */}
        <div className="booking-inputs">
          <div className="booking-input-row">
            <div className="booking-input-col">
              <span className="booking-input-label">PREFERRED MOVE-IN</span>
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
                className="booking-date-input"
              />
            </div>
            <div className="booking-input-col">
              <span className="booking-input-label">EXPECTED END</span>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="booking-date-input"
              />
            </div>
          </div>
          <div className="booking-input-row">
            <div className="booking-input-col">
              <span className="booking-input-label">OCCUPANTS</span>
              <input
                type="number"
                min={1}
                max={property.capacity || 10}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                className="booking-date-input"
              />
            </div>
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="booking-minical">
          <div className="booking-minical-header">
            <span
              className="booking-minical-nav"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
            >
              {'<'}
            </span>
            <span>{monthName} {year}</span>
            <span
              className="booking-minical-nav"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
            >
              {'>'}
            </span>
          </div>
          <div className="booking-minical-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="booking-minical-days">
            {calDays.map((d, i) => (
              <span
                key={i}
                className={`booking-minical-day ${getDayClass(d.date, d.isPast)}${!d.current ? ' booking-minical-other' : ''}`}
                onClick={() => handleDayClick(d.date, d.isPast)}
              >
                {d.date.getDate()}
              </span>
            ))}
          </div>
        </div>

        {/* Applying banner */}
        <div className="booking-payment-banner">
          NO PAYMENT REQUIRED TO APPLY
        </div>

        {/* Apply button */}
        <button
          className="book-now-btn"
          onClick={() => {
            if (property.status === 'OCCUPIED' || property.status === 'MAINTENANCE') return;
            onBookClick();
          }}
          disabled={property.status === 'OCCUPIED' || property.status === 'MAINTENANCE'}
        >
          {property.status === 'OCCUPIED' ? 'Occupied' : property.status === 'MAINTENANCE' ? 'Maintenance' : 'Apply to Rent'}
        </button>

        {/* Approximate price */}
        <div className="booking-approximate">
          You won't be charged yet
        </div>

        {/* Price breakdown */}
        <div className="booking-breakdown">
          <div className="breakdown-row">
            <span>{formatRM(nightlyRate)} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
            <span>{formatRM(subtotal)}</span>
          </div>
          <div className="breakdown-row">
            <span>Cleaning fee</span>
            <span>{formatRM(cleaningFee)}</span>
          </div>
          <div className="breakdown-row">
            <span>EstateSync service fee</span>
            <span>{formatRM(serviceFee)}</span>
          </div>
          <div className="breakdown-total">
            <span>Total before taxes</span>
            <span>{formatRM(total)}</span>
          </div>
        </div>

        {/* Request Viewing */}
        {!isOwnProperty && user?.role?.toLowerCase() === 'tenant' && (
          <button
            type="button"
            className="message-owner-btn"
            style={{ marginBottom: 8 }}
            onClick={() => setShowViewingModal(true)}
          >
            <Clock size={16} />
            Request a Viewing
          </button>
        )}

        {/* Message Owner */}
        {!isOwnProperty && (
          <button
            type="button"
            className="message-owner-btn"
            onClick={handleMessageOwner}
            disabled={!user || !owner?.id}
          >
            <MessageSquare size={16} />
            Message Owner
          </button>
        )}
      </div>

      <Modal
        isOpen={showViewingModal}
        onOpenChange={(open) => { if (!open) { setShowViewingModal(false); setViewingResult(null); } }}
        title="Request a Viewing"
        footer={(
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowViewingModal(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleRequestViewing} disabled={viewingSubmitting || !viewingPreferred}>
              {viewingSubmitting ? 'Requesting…' : 'Request Viewing'}
            </button>
          </>
        )}
      >
        {viewingResult ? (
          <p style={{ color: viewingResult.success ? 'var(--status-success)' : 'var(--status-error)' }}>{viewingResult.message}</p>
        ) : (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
              Preferred Time
              <input type="datetime-local" value={viewingPreferred} onChange={(e) => setViewingPreferred(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
              Alternative Time (optional)
              <input type="datetime-local" value={viewingAlternative} onChange={(e) => setViewingAlternative(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
              Message (optional)
              <textarea rows={3} value={viewingMessage} onChange={(e) => setViewingMessage(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, fontFamily: 'inherit' }} />
            </label>
          </>
        )}
      </Modal>

      {/* Report this listing */}
      <a href="#" className="report-listing">
        <AlertTriangle size={13} />
        Report this listing
      </a>
    </>
  );
}

/* ================= IMAGE GALLERY ================= */
/* Moved to src/components/ImageGallery.jsx with placeholder fallback */

/* ================= MAIN COMPONENT ================= */
function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState(null); // null | 'success' | 'error'

  function handleBack() {
    // Prefer real browser history (works from any properties list —
    // Tenant's, Landlord's, Agent's, Admin's, or the public one) so the
    // user lands back exactly where they clicked in from. Falls back to
    // that role's properties list only when there's no history to go back
    // to (e.g. the page was opened directly via URL).
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(getPropertyRoute(user?.role));
    }
  }

  function handleNewsletterSubmit(e) {
    e.preventDefault();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail.trim());
    if (!isValidEmail) {
      setNewsletterStatus('error');
      return;
    }
    setNewsletterStatus('success');
    setNewsletterEmail('');
  }

  /* Detect if rendered inside a role-protected PRMS layout.
     When true, hide the EstateSync topbar/footer so the PRMS
     layout navbar/sidebar are the only navigation surfaces. */
  const isInRoleLayout = ['/admin/', '/landlord/', '/tenant/', '/agent/'].some(
    (prefix) => location.pathname.startsWith(prefix)
  );

  /* Detect if the current user is the property owner */
  const isPropertyOwner = (() => {
    if (!user || !property || !property.owner) return false;
    const userRole = (user.role || '').toLowerCase();
    // Admin can edit any property; landlord/owner can edit their own
    if (userRole.includes('admin')) return true;
    if (property.owner.id === user.id) return true;
    if (property.ownerId === user.id) return true;
    return false;
  })();

  /* Address string used to query Google Maps — no lat/lng column exists
     on Property, so this drives both the embed and the "Open in Google
     Maps" link directly off the free-text address fields. */
  const mapQuery = property
    ? [property.address, property.city, property.state, 'Malaysia'].filter(Boolean).join(', ')
    : '';

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const res = await propertyApi.getById(id);
        if (!cancelled && res?.data) {
          const propData = res.data.data;
          setProperty(propData);
          setImages(propData.images || []);
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Failed to load property');
          setLoading(false);
        }
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [id]);

  /* Owner info */
  const owner = property?.owner;
  /* Description */
  const description = property?.description || '';
  const shortDesc = description.length > 350 ? description.slice(0, 350) + '...' : description;

  /* Star rating placeholder */
  const rating = property?.rating || '4.9';

  /* Status badge */
  const statusConfig =
    {
      AVAILABLE: { text: 'Available', color: '#22c55e' },
      OCCUPIED: { text: 'Occupied', color: '#f59e0b' },
      MAINTENANCE: { text: 'Maintenance', color: '#ef4444' },
    }[property?.status];

  const todayStr = new Date().toISOString().slice(0, 10);

  /* Amenities */
  const amenities = property?.amenities || [];

  /* Reviews placeholder */
  const sampleReviews = [
    {
      name: 'Sarah J.',
      date: 'October 2024',
      text: 'The views from this property were even better than the photos. Great location and friendly host!',
      rating: 5,
    },
    {
      name: 'Michael R.',
      date: 'September 2024',
      text: 'Absolutely loved every moment. Clean, well-maintained, and perfectly described. Highly recommend!',
      rating: 5,
    },
  ];

  /* Loading */
  if (loading) {
    return (
      <main className="property-detail-page">
        <div className="pd-loading">
          <Loader2 size={32} className="pd-spinner" />
          <p>Loading property...</p>
        </div>
      </main>
    );
  }

  /* Error */
  if (error || !property) {
    return (
      <main className="property-detail-page">
        <div className="pd-error">
          <p>{error || 'Property not found'}</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </main>
    );
  }

  return (
    <main className="property-detail-page" data-customize-id="global.page">
      {/* ── Top Bar (EstateSync-style, only on public routes) ── */}
      {!isInRoleLayout && (
        <header className="pd-topbar" data-customize-id="global.header">
          <Link to="/" className="pd-logo" data-customize-id="global.brand">EstateSync</Link>
          <nav className="pd-topnav" data-customize-id="global.tabs">
            <Link to="/properties" className="active">Properties</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/bookings">Bookings</Link>
          </nav>
          <div className="pd-topactions" data-customize-id="global.top-actions">
            <button type="button" className="pd-icon-btn">&lt;Search size={18} /&gt;</button>
            <button type="button" className="pd-icon-btn">&lt;UserCircle size={20} /&gt;</button>
            <button type="button" className="pd-switch-btn">Switch Role</button>
          </div>
        </header>
      )}

      <motion.div
        className="pd-content"
        data-customize-id="global.body"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* ── Back ── */}
        <button type="button" className="pd-back-btn" onClick={handleBack}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* ── Breadcrumb ── */}
        <div className="pd-breadcrumb" data-customize-id="detail.breadcrumb">
          <Link to={getPropertyRoute(user?.role)}>Properties</Link>
          <ChevronRight size={12} />
          <span>{property.city || 'Kuala Lumpur'}</span>
          <ChevronRight size={12} />
          <span className="breadcrumb-title">{property.title}</span>
        </div>

        {/* ── Title + Rating ── */}
        <div className="pd-title-row" data-customize-id="detail.title">
          <h1 className="pd-title">{property.title}</h1>
          <div className="pd-rating">
            <Star size={16} fill="#F59E0B" color="#F59E0B" />
            <span>{rating}</span>
            <span className="pd-rating-loc">
              <MapPin size={12} />
              {property.city || 'Bukit Bintang'}, {property.state || 'KL'}
            </span>
          </div>
        </div>

        {/* ── Image Gallery ── */}
        <ImageGallery
          images={images.length > 0 ? images : property?.images}
          propertyId={id}
          userRole={user?.role}
          onImagesChange={(updatedImages) => {
            setImages(updatedImages);
            setProperty((prev) => (prev ? { ...prev, images: updatedImages } : prev));
          }}
          wrapperProps={{ className: 'mb-6', 'data-customize-id': 'detail.gallery' }}
        />

        {/* ── Two-column layout ── */}
        <div className="pd-body" data-customize-id="detail.body">
          {/* LEFT COLUMN */}
          <div className="pd-left" data-customize-id="detail.left">
            {/* Hosted by section */}
            <div className="pd-host-section">
              <div className="pd-host-top">
                <div>
                  <h2 className="pd-host-heading">
                    Hosted by {owner?.full_name || 'Property Owner'}
                  </h2>
                  <p className="pd-capacity-line">
                    {(() => {
                      const t = property?.property_type || property?.propertyType || 'Property';
                      return t.charAt(0).toUpperCase() + t.slice(1);
                    })()}
                    {property?.floorArea && ` · ${property.floorArea} sq ft`}
                  </p>
                </div>
                <div className="pd-host-right">
                  {owner && (
                    <div className="pd-host-avatar">
                      <UserCircle size={48} />
                    </div>
                  )}
                  {isPropertyOwner && (
                    <motion.button
                      className="pd-edit-btn"
                      onClick={() => {
                        const lower = (user?.role || '').toLowerCase();
                        const prefix = lower.includes('admin')
                          ? '/admin/properties/edit'
                          : lower.includes('landlord')
                            ? '/landlord/properties/edit'
                            : '/properties/edit';
                        navigate(`${prefix}/${id}`);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Edit3 size={16} />
                      Edit Property
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="pd-badges">
                <div className="pd-badge">
                  <ShieldCheck size={22} className="pd-badge-icon" />
                  <div>
                    <div className="pd-badge-title">Verified Property</div>
                    <div className="pd-badge-desc">This property has been verified and approved.</div>
                  </div>
                </div>
                <div className="pd-badge">
                  <MapPin size={22} className="pd-badge-icon" />
                  <div>
                    <div className="pd-badge-title">Great location</div>
                    <div className="pd-badge-desc">Conveniently located with great access to amenities.</div>
                  </div>
                </div>
                <div className="pd-badge">
                  <Clock size={22} className="pd-badge-icon" />
                  <div>
                    <div className="pd-badge-title">Free cancellation</div>
                    <div className="pd-badge-desc">Full refund if you change your mind within 48 hours.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="pd-divider" />

            {/* Description */}
            <div className="pd-section">
              <div className="pd-description">
                <p>
                  {showFullDescription ? description : shortDesc}
                  {description.length > 350 && (
                    <button className="pd-show-more" onClick={() => setShowFullDescription(!showFullDescription)}>
                      Show more{' '}
                      <ChevronRight size={14} className="pd-show-more-arrow" />
                    </button>
                  )}
                </p>
              </div>
              {/* Status pill */}
              <div className="pd-status-pill" style={{
                color: statusConfig?.color || '#22c55e',
                borderColor: statusConfig?.color || '#22c55e',
              }}>
                <ShieldCheck size={14} />
                {statusConfig?.text || 'Available'}
              </div>
            </div>

            <div className="pd-divider" />

            {/* Amenities */}
            {amenities.length > 0 && (
              <>
                <div className="pd-section">
                  <h3 className="pd-section-title">What this place offers</h3>
                  <div className="pd-amenities-grid">
                    {amenities.map((a) => (
                      <div className="pd-amenity" key={a.id}>
                        <span className="pd-amenity-icon">{amenityIcon(a.name)}</span>
                        <span>{a.name}</span>
                      </div>
                    ))}
                  </div>
                  {amenities.length > 6 && (
                    <button className="pd-amenity-more">Show all amenities</button>
                  )}
                </div>
                <div className="pd-divider" />
              </>
            )}

            {/* Building Facilities */}
            {property?.buildingFacilities && property.buildingFacilities.length > 0 && (
              <>
                <div className="pd-divider" />
                <div className="pd-section">
                  <h3 className="pd-section-title">Building Facilities</h3>
                  <div className="pd-facilities-chips">
                    {property.buildingFacilities.map((facility, i) => (
                      <span className="pd-facility-chip" key={i}>
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Pet Policy */}
            {property?.petPolicy && (
              <>
                <div className="pd-divider" />
                <div className="pd-section">
                  <h3 className="pd-section-title">
                    {' '}Pet Policy
                  </h3>
                  <p className="pd-pet-policy-text">{property.petPolicy}</p>
                </div>
              </>
            )}

            {/* Video & Document sections (visible when logged in and can edit) */}
            {(user?.role === "Landlord" || user?.role === "Admin" || user?.role === "landlord" || user?.role === "admin") && (
              <>
                <div className="pd-divider" />
                <div className="pd-section">
                  <VideoUploader
                    propertyId={id}
                    videos={property?.videoUrls || []}
                    onChange={(updated) => {
                      setProperty((prev) => prev ? { ...prev, videoUrls: updated } : prev);
                    }}
                  />
                </div>
                <div className="pd-divider" />
                <div className="pd-section">
                  <DocumentUploader
                    propertyId={id}
                    documents={property?.documentUrls || []}
                    onChange={(updated) => {
                      setProperty((prev) => prev ? { ...prev, documentUrls: updated } : prev);
                    }}
                  />
                </div>
              </>
            )}

            {/* Map section */}
            <div className="pd-section">
              <h3 className="pd-section-title">Where you'll be</h3>
              <p className="pd-map-location">{property.address || property.city || 'Kuala Lumpur'}</p>
              <div className="pd-map">
                {mapQuery ? (
                  <iframe
                    title="Property location"
                    className="pd-map-iframe"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="pd-map-placeholder">
                    <MapPin size={48} />
                    <span>Map coming soon — address: {property.address || 'TBD'}</span>
                  </div>
                )}
              </div>
              {mapQuery && (
                <a
                  className="pd-map-open-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={14} />
                  Open in Google Maps
                </a>
              )}
            </div>

            <div className="pd-divider" />

            {/* Reviews */}
            <div className="pd-section">
              <h3 className="pd-section-title">
                <Star size={16} fill="#222" color="#222" />
                {' '}{rating} · {sampleReviews.length} reviews
              </h3>
              <div className="pd-reviews">
                {sampleReviews.map((r, i) => (
                  <div className="pd-review" key={i}>
                    <div className="pd-review-avatar">
                      <UserCircle size={36} />
                    </div>
                    <div className="pd-review-body">
                      <div className="pd-review-header">
                        <strong>{r.name}</strong>
                        <span className="pd-review-date">{r.date}</span>
                      </div>
                      <div className="pd-review-stars">
                        {'★ '.repeat(r.rating)}
                      </div>
                      <p>{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="pd-amenity-more">Show all reviews</button>
            </div>
          </div>

          {/* RIGHT COLUMN — Sticky Booking Card */}
          <div className="pd-right">
            <BookingCard
              property={property}
              onBookClick={() => setShowBookingModal(true)}
            />
          </div>
        </div>
      </motion.div>

      {/* Footer (EstateSync-style, only on public routes) */}
      {!isInRoleLayout && (
        <footer className="pd-footer">
          <div className="pd-footer-inner">
            <div className="pd-footer-col">
              <h4>EstateSync</h4>
              <p>The world's most trusted platform for luxury property management and short-term rentals.</p>
            </div>
            <div className="pd-footer-col">
              <h4>Support</h4>
              <a href="#">Help Center</a>
              <a href="#">Cancellation options</a>
              <a href="#">Safety information</a>
            </div>
            <div className="pd-footer-col">
              <h4>Hosting</h4>
              <a href="#">List your property</a>
              <a href="#">Hosting resources</a>
              <a href="#">Community forum</a>
            </div>
            <div className="pd-footer-col">
              <h4>Newsletter</h4>
              <p>Get the latest travel news and property deals.</p>
              <form className="pd-footer-newsletter" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    setNewsletterStatus(null);
                  }}
                />
                <button type="submit">Join</button>
              </form>
              {newsletterStatus === 'success' && (
                <p className="pd-footer-newsletter-msg pd-footer-newsletter-msg--success">
                  Thanks for subscribing!
                </p>
              )}
              {newsletterStatus === 'error' && (
                <p className="pd-footer-newsletter-msg pd-footer-newsletter-msg--error">
                  Please enter a valid email address.
                </p>
              )}
            </div>
          </div>
          <div className="pd-footer-bottom">
            <span>© 2024 EstateSync Inc. All rights reserved.</span>
            <div className="pd-footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Sitemap</a>
            </div>
          </div>
        </footer>
      )}

      {/* ── Heart overlay on gallery ── */}
      <button
        className="pd-heart"
        onClick={() => setLiked(!liked)}
        aria-label="Like"
      >
        <Heart size={20} fill={liked ? '#D82A2A' : 'none'} stroke="#D82A2A" />
      </button>

      {/* Booking Modal */}
      <TenantBookingModal
        property={property}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />
    </main>
  );
}

export default PropertyDetail
