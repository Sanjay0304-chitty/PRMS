import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { propertyApi, getApiError } from '../api'
import { getPropertyRoute, getPropertyDetailPath, roleToPath } from '../config/routes'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Save,
  X,
} from 'lucide-react'

const UNDEAD_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'condo',
  'villa',
  'studio',
  'commercial',
  'retail',
  'office',
  'warehouse',
  'land',
  'farmhouse',
]

const UNDEAD_AMENITIES = [
  'WiFi',
  'Parking',
  'Air Conditioning',
  'Heating',
  'Washer/Dryer',
  'Dishwasher',
  'Gym',
  'Pool',
  'Elevator',
  'Balcony',
  'Garden',
  'Pet Friendly',
  'Security',
  '24/7 Support',
]

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export default function EditProperty() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    property_type: 'apartment',
    rent: '',
    city: '',
    state: '',
    status: 'AVAILABLE',
    availableFrom: '',
    availableTo: '',
  })

  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [customAmenity, setCustomAmenity] = useState('')
  const [imageUrls, setImageUrls] = useState([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  // Load property data
  async function loadProperty() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await propertyApi.getById(id)
      const p = data.property || data.data || data

      setProperty(p)
      setFormData({
        title: p.title || p.name || '',
        address: p.address || '',
        property_type: p.property_type || p.type || 'apartment',
        rent: p.rent || p.price || '',
        city: p.city || '',
        state: p.state || '',
        status: p.status || 'AVAILABLE',
        availableFrom: p.availableFrom ? p.availableFrom.split('T')[0] : '',
        availableTo: p.availableTo ? p.availableTo.split('T')[0] : '',
      })
      setSelectedCategoryId(p.categoryId || p.category?._id || '')
      setSelectedAmenities(
        (p.amenities || []).map((a) => a.name || a)
      )
      setImageUrls((p.images || []).map((img) => img.url || img))
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  // Load categories
  async function loadCategories() {
    try {
      const { data } = await propertyApi.getCategories()
      setCategories(data.categories || data.data || data || [])
    } catch (_) {
      // non critical
    }
  }

  useEffect(() => {
    loadProperty()
    loadCategories()
  }, [])

  function handleFieldChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function toggleAmenity(name) {
    setSelectedAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    )
  }

  function addCustomAmenity() {
    if (!customAmenity.trim()) return
    setSelectedAmenities((prev) => [...prev, customAmenity.trim()])
    setCustomAmenity('')
  }

  function removeAmenity(name) {
    setSelectedAmenities((prev) => prev.filter((a) => a !== name))
  }

  function addImageUrl() {
    if (!newImageUrl.trim()) return
    setImageUrls((prev) => [...prev, newImageUrl.trim()])
    setNewImageUrl('')
  }

  function removeImageUrl(url) {
    setImageUrls((prev) => prev.filter((u) => u !== url))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const payload = {
        title: formData.title.trim(),
        address: formData.address.trim(),
        property_type: formData.property_type,
        rent: Number(formData.rent),
        city: formData.city.trim(),
        state: formData.state.trim(),
        status: formData.status,
        availableFrom: formData.availableFrom || undefined,
        availableTo: formData.availableTo || undefined,
        selectedAmenities,
        imageUrls,
      }
      if (selectedCategoryId) {
        payload.categoryId = selectedCategoryId
      }

      await propertyApi.update(id, payload)
      setSuccess(true)

      // Navigate after short delay
      setTimeout(() => {
        navigate(getPropertyDetailPath(user?.role, id))
      }, 1200)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="spin-icon" size={36} />
        <p style={{ marginTop: 12, color: 'var(--text-secondary, #6b7280)' }}>Loading property...</p>
      </div>
    )
  }

  return (
    <div className="add-property-page">
      <div className="add-property-columns">
        {/* Header with back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            type="button"
            className="add-property-back-btn"
            onClick={() => navigate(getPropertyDetailPath(user?.role, id))}
          >
            <ArrowLeft size={18} />
          </button>
          <h2>
            <span className="accent">Edit</span> Property
          </h2>
        </div>

        {/* Success message */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="form-alert-ok"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Check size={16} />
              Property updated successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="form-alert-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="add-property-form">
          {/* ── Basic Info ── */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            <p className="section-hint">Enter the core details of your property</p>

            <label>
              Property Title <span className="required">*</span>
              <input
                type="text"
                required
                placeholder="e.g. Sunset Beach Apartment"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
              />
            </label>

            <label>
              Full Address <span className="required">*</span>
              <input
                type="text"
                required
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
              />
            </label>

            <div className="field-row">
              <label>
                Property Type <span className="required">*</span>
                <select
                  value={formData.property_type}
                  onChange={(e) => handleFieldChange('property_type', e.target.value)}
                >
                  {UNDEAD_PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Rent / Month <span className="required">*</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.rent}
                  onChange={(e) => handleFieldChange('rent', e.target.value)}
                />
              </label>
            </div>

            <label>
              Status
              <select
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            {categories.length > 0 && (
              <label>
                Category
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* ── Location ── */}
          <div className="form-section">
            <h3 className="section-title">Location</h3>
            <div className="field-row">
              <label>
                City
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                />
              </label>
              <label>
                State / Region
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* ── Availability ── */}
          <div className="form-section">
            <h3 className="section-title">Availability</h3>
            <div className="field-row">
              <label>
                Available From
                <input
                  type="date"
                  value={formData.availableFrom}
                  onChange={(e) => handleFieldChange('availableFrom', e.target.value)}
                />
              </label>
              <label>
                Available To
                <input
                  type="date"
                  value={formData.availableTo}
                  onChange={(e) => handleFieldChange('availableTo', e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* ── Amenities ── */}
          <div className="form-section">
            <h3 className="section-title">Amenities</h3>
            <p className="section-hint">
              Check the facilities that come with your property
            </p>

            <div className="amenity-grid">
              {UNDEAD_AMENITIES.map((name) => (
                <button
                  type="button"
                  key={name}
                  className={`amenity-chip ${selectedAmenities.includes(name) ? 'active' : ''}`}
                  onClick={() => toggleAmenity(name)}
                >
                  <Check size={14} />
                  {name}
                </button>
              ))}
            </div>

            <div className="custom-amenity-row">
              <input
                type="text"
                placeholder="Add custom amenity..."
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
              />
              <button type="button" className="add-amenity-btn" onClick={addCustomAmenity}>
                <Plus size={18} />
              </button>
            </div>

            {selectedAmenities.length > 0 && (
              <div className="selected-amenities">
                <span className="selected-label">Selected Amenities</span>
                <div className="selected-tags">
                  {selectedAmenities.map((name) => (
                    <span key={name} className="selected-tag">
                      {name}
                      <button
                        type="button"
                        className="remove-tag"
                        onClick={() => removeAmenity(name)}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Images ── */}
          <div className="form-section">
            <h3 className="section-title">Property Images</h3>
            <p className="section-hint">
              Paste image URLs. Upload will happen automatically on save.
            </p>

            <div className="image-input-row">
              <input
                type="url"
                placeholder="https://...jpg / png..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addImageUrl())
                }
              />
              <button type="button" className="add-amenity-btn" onClick={addImageUrl}>
                <Plus size={18} />
              </button>
            </div>

            <div className="image-list">
              {imageUrls.map((url) => (
                <div key={url} className="image-thumb">
                  <img src={url} alt="property" />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={() => removeImageUrl(url)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Submit bar ── */}
          <div className="submit-bar">
            <Link
              className="cancel-btn"
              to={getPropertyDetailPath(user?.role, id)}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="save-btn"
              disabled={saving || success}
            >
              {saving && <Loader2 className="spin-icon" size={16} />}
              {saving ? 'Updating...' : 'Update Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
