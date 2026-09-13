import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { categoryApi } from '../api/categories';
import { PROPERTY_TYPES } from '../config/propertyTypes';
import { getPropertyRoute } from '../config/routes';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  DollarSign,
  Upload,
  ArrowLeft,
  X,
  Save,
  LayoutGrid,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react';
import './AddProperty.css';

const PROPERTY_STATUS = [
  'AVAILABLE',
  'RENTED',
  'MAINTENANCE',
  'INACTIVE',
];

const defaultImagePlaceholders = [];

function AddProperty() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    propertyType: 'apartment',
    status: 'AVAILABLE',
    monthlyRent: '',
    address: '',
    city: '',
    state: '',
    amenities: [],
    categoryId: '',
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoryApi
      .shared()
      .then(({ data }) => setCategories(data?.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  // themeColors used to come from useCustomization(), but that context never
  // actually provides a themeColors value (grepped the whole codebase - it's
  // provider only ever exposes isEditMode/draftConfig/etc, never this), so
  // every one of these was silently always falling back to its hardcoded
  // light-mode default - this page never actually responded to the
  // light/dark toggle at all. Pointing straight at the same CSS custom
  // properties every other page (PropertyEdit.css etc) already uses fixes
  // that for real, since those ARE kept dark-mode-aware in styles.css.
  const accentColor = 'var(--accent-color)';
  const successColor = 'var(--status-success)';
  const primaryColor = 'var(--primary-color)';
  const headingColor = 'var(--text-primary)';
  const textColor = 'var(--text-secondary)';
  const bgColor = 'var(--page-bg)';
  const cardBg = 'var(--surface, #fff)';
  const borderColor = 'var(--border-color)';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const AMENITY_OPTIONS = [
    'WiFi', 'Parking', 'Laundry', 'Pool', 'Gym', 'Elevator',
    'Air Conditioning', 'Balcony', 'Garden', 'Pet Friendly',
    'Furnished', 'Security', 'Storage', 'Dishwasher',
  ];

  const toggleAmenity = (amenityName) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenityName);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenityName)
          : [...prev.amenities, amenityName],
      };
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    setVideoPreview('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Property title is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.monthlyRent || Number(formData.monthlyRent) <= 0)
      newErrors.monthlyRent = 'Valid monthly rent is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin || 'http://localhost:3500';
      const token = sessionStorage.getItem('accessToken');
      const endpoint = id ? `/properties/${id}` : '/properties';

      // Build JSON body — align frontend fields to backend DTO (schema source of truth)
      const body = {
        title: formData.title,
        address: formData.address,
        property_type: formData.propertyType?.toLowerCase(),
        rent: parseFloat(formData.monthlyRent) || 0,
        city: formData.city,
        state: formData.state,
        status: formData.status,
        amenities: formData.amenities?.map?.(a => ({ name: a })) || [],
        categoryId: formData.categoryId || undefined,
      };

      const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: id ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (res.ok) {
        const createdId = result.data?.id;
        // Upload images separately via the image endpoint
        if (createdId && images.length > 0) {
          for (const img of images) {
            const imgFD = new FormData();
            imgFD.append('image', img);
            await fetch(`${apiBaseUrl}/properties/${createdId}/images`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: imgFD,
            });
          }
        }
        // Upload video separately via the video endpoint
        if (createdId && video) {
          const vidFD = new FormData();
          vidFD.append('video', video);
          await fetch(`${apiBaseUrl}/properties/${createdId}/videos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: vidFD,
          });
        }
        setTimeout(() => {
          navigate(getPropertyRoute(user?.role));
        }, 800);
      } else {
        setErrors({
          submit: result.error?.message || result.message || 'Failed to save property',
        });
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndNew = async () => {
    await handleSubmit();
    setFormData({
      title: '',
      propertyType: 'apartment',
      status: 'AVAILABLE',
      monthlyRent: '',
      address: '',
      city: '',
      state: '',
      amenities: [],
      categoryId: '',
    });
    setImages([]);
    setImagePreviews([]);
    setVideo(null);
    setVideoPreview('');
  };

  const sectionNav = [
    { key: 'basic', label: 'Basic Info', icon: LayoutGrid, count: 0 },
    { key: 'pricing', label: 'Pricing', icon: DollarSign, count: 0 },
    { key: 'location', label: 'Location', icon: MapPin, count: 0 },
    { key: 'media', label: 'Images', icon: ImageIcon, count: images.length },
  ];

  const inputStyle = {
    background: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: '6px',
    color: headingColor,
    fontWeight: 400,
    fontSize: '15px',
    letterSpacing: '-0.01em',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    color: textColor,
    fontWeight: 500,
    fontSize: '13px',
    letterSpacing: '0.02em',
    marginBottom: '6px',
  };

  return (
    <div
      className="add-property-page"
      style={{
        background: bgColor,
        minHeight: 'calc(100vh - 80px)',
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
        {/* Page Header */}
        <div
          className="add-property-header"
          style={{
            background: cardBg,
            borderBottom: `1px solid ${borderColor}`,
            padding: '16px 24px',
            position: 'sticky',
            top: 68,
            zIndex: 50,
            backdropFilter: 'saturate(180%) blur(8px)',
          }}
        >
          <div
            className="header-inner"
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => navigate(getPropertyRoute(user?.role))}
                style={{
                  background: `${textColor}10`,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  color: textColor,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1
                  className="page-title"
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                    color: headingColor,
                    margin: 0,
                  }}
                >
                  {id ? 'Edit Property' : 'Add New Property'}
                </h1>
                <p
                  className="page-subtitle"
                  style={{
                    fontSize: '13px',
                    color: textColor,
                    margin: 0,
                    opacity: 0.7,
                  }}
                >
                  {id ? 'Update your property listing details' : 'Fill in the details for your new property listing'}
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  background: primaryColor,
                  color: '#fff',
                  padding: '8px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                }}
              >
                <Save size={15} />
                {submitting ? 'Saving...' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div
          className="section-nav"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          {sectionNav.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => {
                  setActiveSection(section.key);
                  document
                    .getElementById(`section-${section.key}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{
                  background: isActive ? `${primaryColor}12` : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  color: isActive ? primaryColor : textColor,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} />
                {section.label}
                {section.count > 0 && (
                  <span
                    style={{
                      background: `${primaryColor}20`,
                      color: primaryColor,
                      borderRadius: '999px',
                      padding: '1px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {section.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="add-property-form" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 60px' }}>
          {/* Error Banner */}
          {errors.submit && (
            <div
              className="error-banner"
              style={{
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '20px',
                color: '#c53030',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <X size={16} />
              {errors.submit}
            </div>
          )}

          {/* ---- BASIC INFO SECTION ---- */}
          <div id="section-basic" className="form-section" style={{ marginBottom: '20px' }}>
            <div
              className="section-card"
              style={{
                background: cardBg,
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                overflow: 'hidden',
                boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px',
              }}
            >
              {/* Section Header */}
              <div
                className="section-header"
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    background: `${primaryColor}12`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: primaryColor,
                    display: 'flex',
                  }}
                >
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: headingColor,
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Basic Information
                  </h2>
                  <p
                    style={{
                      fontSize: '12px',
                      color: textColor,
                      margin: 0,
                      opacity: 0.6,
                    }}
                  >
                    Core details about your property
                  </p>
                </div>
              </div>

              <div className="section-body" style={{ padding: '24px' }}>
                {/* Title & Type Row */}
                <div
                  className="form-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 200px',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div className="form-group">
                    <label style={labelStyle}>Property Title <span style={{ color: '#e53e3e' }}>*</span></label>
                    <input
                      type="text"
                      name="title"
                      placeholder="e.g. Modern Downtown Apartment"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={errors.title ? 'input-error' : ''}
                      style={{ ...inputStyle, width: '100%', padding: '10px 14px', outline: 'none' }}
                    />
                    {errors.title && (
                      <span className="field-error" style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {errors.title}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={labelStyle}>Property Type</label>
                    <select
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleInputChange}
                      style={{ ...inputStyle, width: '100%', padding: '10px 14px', outline: 'none', appearance: 'none', paddingRight: '32px', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(textColor)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description — removed: not in Property model */}

                {/* Category, Amenities Row */}
                <div
                  className="form-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                  }}
                >
                  <div className="form-group">
                    <label style={labelStyle}>Category</label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      style={{ ...inputStyle, width: '100%', padding: '10px 14px', outline: 'none' }}
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={labelStyle}>Amenities</label>
                    <div
                      style={{
                        ...inputStyle,
                        padding: '10px 14px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        minHeight: '42px',
                      }}
                    >
                      {AMENITY_OPTIONS.map((a) => (
                        <button
                          type="button"
                          key={a}
                          onClick={() => toggleAmenity(a)}
                          style={{
                            background: formData.amenities.includes(a)
                              ? primaryColor
                              : 'transparent',
                            border: `1px solid ${formData.amenities.includes(a) ? primaryColor : borderColor}`,
                            color: formData.amenities.includes(a) ? '#fff' : textColor,
                            borderRadius: '4px',
                            padding: '3px 10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: formData.amenities.includes(a) ? 600 : 400,
                            transition: 'all 0.15s',
                          }}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- PRICING SECTION ---- */}
          <div id="section-pricing" className="form-section" style={{ marginBottom: '20px' }}>
            <div
              className="section-card"
              style={{
                background: cardBg,
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                overflow: 'hidden',
                boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px',
              }}
            >
              <div
                className="section-header"
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    background: `${successColor}12`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: successColor,
                    display: 'flex',
                  }}
                >
                  <DollarSign size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: headingColor, margin: 0, letterSpacing: '-0.02em' }}>
                    Pricing & Details
                  </h2>
                  <p style={{ fontSize: '12px', color: textColor, margin: 0, opacity: 0.6 }}>
                    Rental price and availability period
                  </p>
                </div>
              </div>

              <div className="section-body" style={{ padding: '24px' }}>
                {/* Rent — only price field in Property model */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Monthly Rent (RM) <span style={{ color: '#e53e3e' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: successColor,
                        fontWeight: 600,
                        fontSize: '15px',
                      }}
                    >
                      RM
                    </span>
                    <input
                      type="number"
                      name="monthlyRent"
                      placeholder="0.00"
                      value={formData.monthlyRent}
                      onChange={handleInputChange}
                      className={errors.monthlyRent ? 'input-error' : ''}
                      min="0"
                      step="0.01"
                      style={{
                        ...inputStyle,
                        width: '100%',
                        padding: '10px 14px 10px 40px',
                        outline: 'none',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                  </div>
                  {errors.monthlyRent && (
                    <span className="field-error" style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.monthlyRent}
                    </span>
                  )}
                </div>

                {/* Status of the property */}
                <div className="form-group">
                  <label style={labelStyle}>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    style={{ ...inputStyle, width: '100%', padding: '10px 14px', outline: 'none' }}
                  >
                    {PROPERTY_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ---- LOCATION SECTION ---- */}
          <div id="section-location" className="form-section" style={{ marginBottom: '20px' }}>
            <div
              className="section-card"
              style={{
                background: cardBg,
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                overflow: 'hidden',
                boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px',
              }}
            >
              <div
                className="section-header"
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    background: `${accentColor}14`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: accentColor,
                    display: 'flex',
                  }}
                >
                  <MapPin size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: headingColor, margin: 0, letterSpacing: '-0.02em' }}>
                    Location
                  </h2>
                  <p style={{ fontSize: '12px', color: textColor, margin: 0, opacity: 0.6 }}>
                    Where your property is located
                  </p>
                </div>
              </div>

              <div className="section-body" style={{ padding: '24px' }}>
                {/* Address */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Street Address <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Full street address with number"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={errors.address ? 'input-error' : ''}
                    style={{ ...inputStyle, width: '100%', padding: '10px 14px', outline: 'none' }}
                  />
                  {errors.address && (
                    <span className="field-error" style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {errors.address}
                    </span>
                  )}
                </div>

                {/* City, State Row — only location fields in Property model besides address */}
                <div
                  className="form-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                  }}
                >
                  <div className="form-group">
                    <label style={labelStyle}>City <span style={{ color: '#e53e3e' }}>*</span></label>
                    <input
                      type="text"
                      name="city"
                      placeholder="City name"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={errors.city ? 'input-error' : ''}
                      style={{ ...inputStyle, width: '100%', padding: '10px 14px', outline: 'none' }}
                    />
                    {errors.city && (
                      <span className="field-error" style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {errors.city}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={labelStyle}>State / Province</label>
                    <input
                      type="text"
                      name="state"
                      placeholder="State or province"
                      value={formData.state}
                      onChange={handleInputChange}
                      style={{ ...inputStyle, width: '100%', padding: '10px 14px', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- IMAGES SECTION ---- */}
          <div id="section-media" className="form-section">
            <div
              className="section-card"
              style={{
                background: cardBg,
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                overflow: 'hidden',
                boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px',
              }}
            >
              <div
                className="section-header"
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    background: `${accentColor}14`,
                    borderRadius: '8px',
                    padding: '8px',
                    color: accentColor,
                    display: 'flex',
                  }}
                >
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: headingColor, margin: 0, letterSpacing: '-0.02em' }}>
                    Property Images
                  </h2>
                  <p style={{ fontSize: '12px', color: textColor, margin: 0, opacity: 0.6 }}>
                    Upload high-quality photos to showcase your property
                  </p>
                </div>
              </div>

              <div className="section-body" style={{ padding: '24px' }}>
                {/* Upload Zone */}
                <label
                  className="image-upload-zone"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px dashed ${borderColor}`,
                    borderRadius: '12px',
                    padding: '48px 24px',
                    cursor: 'pointer',
                    background: `${textColor}04`,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = primaryColor + '60';
                    e.currentTarget.style.background = `${primaryColor}08`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = borderColor;
                    e.currentTarget.style.background = `${textColor}04`;
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: `${primaryColor}12`,
                      color: primaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <Upload size={22} />
                  </div>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: headingColor,
                      margin: '0 0 4px',
                    }}
                  >
                    Click to upload or drag and drop
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: textColor,
                      margin: 0,
                      opacity: 0.5,
                    }}
                  >
                    PNG, JPG or WebP up to 10MB each
                  </p>
                </label>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div
                    className="image-preview-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '12px',
                      marginTop: '20px',
                    }}
                  >
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          aspectRatio: '4/3',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <img
                          src={preview}
                          alt={`Property image ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Video Upload */}
                <div style={{ marginTop: '24px', borderTop: `1px solid ${borderColor}`, paddingTop: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: headingColor, margin: '0 0 4px' }}>
                    Property Video (optional)
                  </p>
                  <p style={{ fontSize: '12px', color: textColor, margin: '0 0 12px', opacity: 0.6 }}>
                    Upload a short walkthrough video of the property
                  </p>

                  {!videoPreview ? (
                    <label
                      className="video-upload-zone"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px dashed ${borderColor}`,
                        borderRadius: '12px',
                        padding: '32px 24px',
                        cursor: 'pointer',
                        background: `${textColor}04`,
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = primaryColor + '60';
                        e.currentTarget.style.background = `${primaryColor}08`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.background = `${textColor}04`;
                      }}
                    >
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        style={{ display: 'none' }}
                      />
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: `${primaryColor}12`,
                          color: primaryColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '12px',
                        }}
                      >
                        <VideoIcon size={20} />
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: headingColor, margin: '0 0 4px' }}>
                        Click to upload a video
                      </p>
                      <p style={{ fontSize: '12px', color: textColor, margin: 0, opacity: 0.5 }}>
                        MP4, WebM or MOV up to 50MB
                      </p>
                    </label>
                  ) : (
                    <div
                      style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: `1px solid ${borderColor}`,
                        maxWidth: '360px',
                      }}
                    >
                      <video
                        src={videoPreview}
                        controls
                        style={{ width: '100%', display: 'block', background: '#000' }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
  );
}

export default AddProperty;
