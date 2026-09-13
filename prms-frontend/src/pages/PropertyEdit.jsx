import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  AlertTriangle,
  CheckCircle,
  GripVertical,
  MapPin,
  Home,
  DollarSign,
  Calendar,
  Layers,
  Tag,
  Building2,
  Info,
} from 'lucide-react';
import { propertyApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import ImageGallery from '../components/ImageGallery';
import { PROPERTY_TYPES } from '../config/propertyTypes';
import './PropertyEdit.css';

/* ================= VALIDATION HELPERS ================= */

function validateField(fieldName, value) {
  const errors = [];
  switch (fieldName) {
    case 'title':
      if (!value || !value.trim()) errors.push('Title is required.');
      else if (value.trim().length < 3) errors.push('Title must be at least 3 characters.');
      else if (value.length > 150) errors.push('Title must be under 150 characters.');
      break;
    case 'address':
      if (!value || !value.trim()) errors.push('Address is required.');
      else if (value.trim().length < 5) errors.push('Address must be at least 5 characters.');
      break;
    case 'rent': {
      const num = parseFloat(value);
      if (!value || value === '') errors.push('Rent is required.');
      else if (isNaN(num)) errors.push('Rent must be a valid number.');
      else if (num <= 0) errors.push('Rent must be greater than zero.');
      else if (num > 9999999) errors.push('Rent must be under 9,999,999 MYR.');
      break;
    }
    case 'city':
      if (value && value.length > 100) errors.push('City must be under 100 characters.');
      break;
    case 'state':
      if (value && value.length > 100) errors.push('State must be under 100 characters.');
      break;
    default:
      break;
  }
  return errors;
}

/* ================= TOAST NOTIFICATION ================= */

function Toast({ message, type = 'success', onClose }) {
  return (
    <motion.div
      className={`pe-toast pe-toast--${type}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      role="alert"
      aria-live="polite"
    >
      <span style={{ marginRight: 'auto' }}></span>
      {type === 'success' ? (
        <CheckCircle size={20} />
      ) : type === 'error' ? (
        <AlertTriangle size={20} />
      ) : (
        <Info size={20} />
      )}
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification" className="pe-toast-close">
        <X size={16} />
      </button>
    </motion.div>
  );
}

/* ================= STATUS PICKER ================= */

function StatusPicker({ value, onChange }) {
  const statuses = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE'];
  const statusColors = {
    AVAILABLE: { bg: '#22c55e', text: '#fff' },
    RENTED: { bg: '#f59e0b', text: '#fff' },
    MAINTENANCE: { bg: '#ef4444', text: '#fff' },
    INACTIVE: { bg: '#94a3b8', text: '#fff' },
  };

  return (
    <div className="pe-group">
      <span className="pe-field-label">
        <Layers size={18} />
        Status
      </span>
      <div className="pe-status-picker" role="radiogroup" aria-label="Select property status">
        {statuses.map((status) => {
          const color = statusColors[status] || { bg: '#e2e8f0', text: '#1a1a1a' };
          const isSelected = value === status;
          return (
            <div
              key={status}
              className={`pe-status-chip ${isSelected ? 'pe-status-chip--active' : ''}`}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChange(status)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(status);
                }
              }}
              style={isSelected ? { borderColor: color.bg } : {}}
            >
              <span
                className="pe-status-chip-dot"
                style={{ backgroundColor: isSelected ? color.bg : 'transparent', borderColor: color.bg }}
              />
              <span className="pe-status-chip-label">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= PROPERTY TYPE SELECT ================= */

function PropertyTypeSelect({ value, onChange }) {
  return (
    <div className="pe-group">
      <label htmlFor="propertyType" className="pe-field-label">
        <Building2 size={18} />
        Property Type
      </label>
      <select
        id="propertyType"
        className={`pe-select ${!value ? 'pe-select--empty' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="propertyTypeHelp"
      >
        <option value="">Select type</option>
        {PROPERTY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <span id="propertyTypeHelp" className="pe-field-help">Type of the property unit.</span>
    </div>
  );
}

/* ================= DATE RANGE PICKER ================= */

function DateRangePicker({ label, fromValue, fromChange, toValue, toChange }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="pe-group">
      <span className="pe-field-label">
        <Calendar size={18} />
        {label}
      </span>
      <div className="pe-dates-row">
        <div className="pe-date-field">
          <label htmlFor={`${label}From`} className="pe-date-label">From</label>
          <input
            id={`${label}From`}
            type="date"
            className="pe-input--date"
            value={fromValue || ''}
            min={today}
            onChange={(e) => fromChange(e.target.value)}
          />
        </div>
        <span className="pe-date-separator">to</span>
        <div className="pe-date-field">
          <label htmlFor={`${label}To`} className="pe-date-label">To</label>
          <input
            id={`${label}To`}
            type="date"
            className="pe-input--date"
            value={toValue || ''}
            min={fromValue || today}
            onChange={(e) => toChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

/* ================= MEDIA ITEM (IMAGE/VIDEO) ================= */

function MediaItem({ item, type = 'image', onUpdate, onRemove }) {
  const isImg = type === 'image';
  const previewSrc = isImg ? item.url : item.thumbnailUrl || item.url;

  return (
    <motion.div
      className={`pe-media-item pe-media-item--${type}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      layout
      aria-label={`${isImg ? 'Image' : 'Video'}: ${item.alt || 'Untitled'}`}
    >
      <div className="pe-media-preview">
        {isImg ? (
          <img src={previewSrc} alt={item.alt || 'Property image'} className="pe-media-img" loading="lazy" />
        ) : (
          <video src={previewSrc} className="pe-media-video" muted loop preload="metadata" />
        )}
        <button
          className="pe-media-play-btn"
          type="button"
          onClick={() => onUpdate(item, { playing: !item.playing })}
          aria-label={item.playing ? 'Pause video' : 'Play video'}
        >
          <Video size={20} fill={item.playing ? 'currentColor' : 'none'} />
        </button>
        <button
          className="pe-media-remove"
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${isImg ? 'image' : 'video'}`}
        >
          <X size={16} />
        </button>
      </div>
      <button className="pe-media-reorder" aria-label={`Reorder ${isImg ? 'image' : 'video'}`} type="button">
        <GripVertical size={16} />
      </button>
    </motion.div>
  );
}

/* ================= ADD MEDIA MODAL ================= */

function AddMediaModal({ isOpen, onClose, type, propertyId, onAdd, categories }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = { current: null };

  const handleFiles = useCallback((files) => {
    const mediaFiles = Array.from(files).filter((f) => {
      if (type === 'image') return f.type.startsWith('image/');
      if (type === 'video') return f.type.startsWith('video/');
      // Documents: allow pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip
      const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'text/plain', 'application/zip'];
      return docTypes.some((t) => f.type.includes(t.split('/')[1])) || f.type.includes('pdf') || f.type.includes('word') || f.type.includes('excel') || f.type.includes('powerpoint') || f.type.includes('text');
    });
    setSelectedFiles((prev) => [...prev, ...mediaFiles]);
  }, [type]);

  const handleAdd = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const results = [];
      for (const file of selectedFiles) {
        // Determine the correct field name for the backend route
        const field = type === 'image' ? 'image' : type === 'video' ? 'video' : 'document';
        if (!propertyId) {
          // Fallback: no propertyId yet — use blob URL
          results.push({
            id: `new-${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 6)}`,
            url: URL.createObjectURL(file),
            file,
            documentName: file.name,
            type,
          });
          continue;
        }
        // Upload to backend via the correct API endpoint
        const fd = new FormData();
        fd.append(field, file);
        const uploadFn = type === 'image' ? propertyApi.addImage : type === 'video' ? propertyApi.addVideo : propertyApi.addDocument;
        const res = await uploadFn(propertyId, fd);
        const serverData = res?.data?.data;
        if (serverData) {
          results.push({ id: serverData.id, url: serverData.url, documentName: serverData.documentName || file.name, type });
        } else {
          results.push({
            id: `new-${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 6)}`,
            url: URL.createObjectURL(file),
            file,
            documentName: file.name,
            type,
          });
        }
      }
      onAdd(results);
      setSelectedFiles([]);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    } catch (err) {
      setUploadError(err.response?.data?.error?.message || err.message || 'Upload failed.');
      setTimeout(() => setUploadError(''), 4000);
    } finally {
      setUploading(false);
    }
  };

  const onFileInput = (e) => handleFiles(e.target.files);

  if (!isOpen) return null;

  return (
    <div className="pe-modal-overlay" role="dialog" aria-modal="true" aria-label={`Add ${type}`}>
      <motion.div
        className="pe-modal"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="pe-modal-header">
          <h2 className="pe-modal-title">{type === 'image' ? 'Add Images' : type === 'video' ? 'Add Videos' : 'Add Documents'}</h2>
          <button onClick={onClose} className="pe-modal-close" aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <div className="pe-modal-body">
          {/* Category picker */}
          <div className="pe-modal-categories">
            <label className="pe-field-label">Assign to category:</label>
            <select className="pe-select">
              <option value="">No category</option>
              {categories && categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {categories && categories.length === 0 && (
                <>
                  <option value="cat-1">Living Room</option>
                  <option value="cat-2">Bedroom</option>
                  <option value="cat-3">Kitchen</option>
                  <option value="cat-4">Bathroom</option>
                  <option value="cat-5">Exterior</option>
                </>
              )}
            </select>
          </div>

          {/* File list preview */}
          <div className="pe-file-preview">
            {selectedFiles.length === 0 && <p className="pe-file-empty">No files selected. Upload files to preview them here.</p>}
            <div className="pe-file-grid">
              {selectedFiles.map((file, i) => (
                <div key={i} className="pe-file-swatch">
                  <span className="pe-file-name">{file.name}</span>
                  <button onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))} className="pe-file-remove" aria-label={`Remove ${file.name}`}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upload button */}
          <div className="pe-modal-actions">
            <label className="pe-btn-secondary">
              <input ref={(el) => { fileInputRef.current = el; }} type="file" accept={type === 'image' ? 'image/*' : 'video/*'} multiple style={{ display: 'none' }} onChange={onFileInput} />
              <Plus size={16} />
              Browse Files
            </label>
            <button className={`pe-btn-primary ${selectedFiles.length === 0 ? 'pe-btn--disabled' : ''}`} onClick={handleAdd} disabled={selectedFiles.length === 0 || uploading} aria-busy={uploading}>
              {uploading ? (
                <>
                  <Loader2 size={16} className="pe-spinner" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </button>
          </div>

          {/* Upload status messages */}
          {addedSuccess && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pe-upload-success">
              <CheckCircle size={16} /> Uploaded successfully
            </motion.p>
          )}
          {uploadError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pe-upload-error">
              <AlertTriangle size={16} /> {uploadError}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ================= AMENITY ITEM ================= */

function AmenityItem({ amenity, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(amenity.name);

  const handleSave = () => {
    if (name.trim()) onEdit(amenity.id, { name: name.trim() });
    setEditing(false);
  };

  return (
    <motion.div className="pe-amenity-item" key={amenity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
      {editing ? (
        <div className="pe-amenity-edit">
          <input className="pe-input pe-amenity-input" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSave} onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }} aria-label="Amenity name" />
        </div>
      ) : (
        <div className="pe-amenity-content">
          <span className="pe-amenity-name">{amenity.name}</span>
          <span className="pe-amenity-desc">{amenity.description || 'No description'}</span>
        </div>
      )}
      <div className="pe-amenity-actions">
        <button className="pe-amenity-action-btn" type="button" onClick={() => setEditing(true)} aria-label="Edit amenity">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
        <button className="pe-amenity-action-btn pe-amenity-remove" type="button" onClick={() => onRemove(amenity.id)} aria-label="Remove amenity">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

/* ================= MAIN EDIT PAGE ================= */

function PropertyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  /* ---- State ---- */
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(null); // 'image' | 'video' | null
  const [showAmenityModal, setShowAmenityModal] = useState(false);
  const [validationResults, setValidationResults] = useState({});

  // Form fields backed by Property schema
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [rent, setRent] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');

  // Media
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [categories] = useState([{ id: 'cat-1', name: 'Living Room' }, { id: 'cat-2', name: 'Bedroom' }, { id: 'cat-3', name: 'Kitchen' }, { id: 'cat-4', name: 'Bathroom' }, { id: 'cat-5', name: 'Exterior' }]);

  // Amenities (many-to-many: Property -> Amenity via PropertyAmenity join)
  const [amenities, setAmenities] = useState([]);
  const [newAmenityName, setNewAmenityName] = useState('');

  /* ---- Fetch property data ---- */
  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const res = await propertyApi.getById(id);
        if (!cancelled && res?.data) {
          const prop = res.data.data;
          setProperty(prop);
          setTitle(prop.title || '');
          setAddress(prop.address || '');
          setPropertyType(prop.property_type || prop.propertyType || '');
          setRent(prop.rent ? String(prop.rent) : '');
          setStatus(prop.status || 'AVAILABLE');
          setAvailableFrom(prop.availableFrom ? new Date(prop.availableFrom).toISOString().slice(0, 10) : '');
          setAvailableTo(prop.availableTo ? new Date(prop.availableTo).toISOString().slice(0, 10) : '');
          setCity(prop.city || '');
          setState(prop.state || '');
          setDescription(prop.description || '');
          setImages(prop.images || []);
          // Videos may be stored as PropertyImage with url ending in video types
          setVideos(prop.videos || []);
          // Documents are also PropertyImage records with type='document'
          setDocuments(prop.documents || []);
          setAmenities(prop.amenities || []);
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Failed to load property data');
          setLoading(false);
        }
      }
    }
    fetch();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---- Validation ---- */
  const validateAll = useCallback(() => {
    const results = {};
    ['title', 'address', 'rent', 'city', 'state'].forEach((f) => {
      let val;
      switch (f) {
        case 'title':
          val = title;
          break;
        case 'address':
          val = address;
          break;
        case 'rent':
          val = rent;
          break;
        case 'city':
          val = city;
          break;
        case 'state':
          val = state;
          break;
      }
      results[f] = validateField(f, val);
    });
    setValidationResults(results);
    const hasErrors = Object.values(results).some((errs) => errs.length > 0);
    return !hasErrors;
  }, [title, address, rent, city, state]);

  /* ---- Submit / Save ---- */
  const handleSave = async () => {
    if (!validateAll()) {
      setToast({ message: 'Please fix the validation errors below.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        address: address.trim(),
        property_type: propertyType,
        rent: parseFloat(rent) || 0,
        status,
        availableFrom: availableFrom || null,
        availableTo: availableTo || null,
        city: city.trim() || null,
        state: state.trim() || null,
        description: description.trim(),
        images,
        videos,
        amenities,
      };
      await propertyApi.update(id, body);
      setToast({ message: 'Property updated successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to save property.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /* ---- Image handlers ---- */
  const addImage = (newImages) => {
    setImages((prev) => [...prev, ...newImages]);
    setShowMediaModal(null);
    setToast({ message: `${newImages.length} image${newImages.length > 1 ? 's' : ''} added.`, type: 'success' });
  };

  const removeImage = (imgId) => {
    setImages((prev) => prev.filter((img) => img.id !== imgId));
  };

  const reorderImages = (imgIds) => {
    const sorted = imgIds.map((id) => {
      const idx = images.findIndex((img) => img.id === id);
      return idx !== -1 ? images[idx] : null;
    }).filter(Boolean);
    setImages(sorted);
  };

  /* ---- Video handlers ---- */
  const addVideo = (newVideos) => {
    setVideos((prev) => [...prev, ...newVideos]);
    setShowMediaModal(null);
    setToast({ message: `${newVideos.length} video${newVideos.length > 1 ? 's' : ''} added.`, type: 'success' });
  };

  const removeVideo = (vidId) => {
    setVideos((prev) => prev.filter((v) => v.id !== vidId));
  };

  /* ---- Document handlers ---- */
  const addDocument = (newDocs) => {
    setDocuments((prev) => [...prev, ...newDocs]);
    setShowMediaModal(null);
    setToast({ message: `${newDocs.length} document${newDocs.length > 1 ? 's' : ''} added.`, type: 'success' });
  };

  const removeDocument = (docId) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  /* ---- Amenities handlers ---- */
  const addAmenity = () => {
    if (!newAmenityName.trim()) return;
    const item = {
      id: `amenity-${Date.now()}`,
      name: newAmenityName.trim(),
      description: `Amenity: ${newAmenityName.trim()}`,
    };
    setAmenities((prev) => [...prev, item]);
    setNewAmenityName('');
  };

  const removeAmenity = (amenityId) => {
    setAmenities((prev) => prev.filter((a) => a.id !== amenityId));
  };

  const editAmenity = (amenityId, updates) => {
    setAmenities((prev) => prev.map((a) => (a.id === amenityId ? { ...a, ...updates } : a)));
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <main className="pe-page">
        <div className="pe-loading">
          <Loader2 size={32} className="pe-spinner" />
          <p>Loading property data...</p>
        </div>
      </main>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <main className="pe-page">
        <div className="pe-error">
          <AlertTriangle size={32} />
          <p>{error}</p>
          <button className="pe-btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </main>
    );
  }

  /* ---- Render ---- */
  return (
    <main className="pe-page" data-customize-id="edit.page">
      {/* Toast */}
      {toast && (
        <div className="pe-toast-wrapper">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Top bar */}
      <header className="pe-topbar" data-customize-id="edit.header">
        <button className="pe-back-btn" onClick={() => navigate(-1)} aria-label="Back to property detail" data-customize-id="edit.back-btn">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="pe-topbar-center">
          <h1 className="pe-topbar-title" data-customize-id="edit.title">Edit Property</h1>
          <span className="pe-topbar-sub">
            {property ? property.property_type || property.propertyType : 'Property'} &middot; {property ? property.rent || 0 : 0} MYR
          </span>
        </div>
        <div className="pe-topbar-actions" data-customize-id="edit.actions">
          <button className="pe-btn-secondary" type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button
            className="pe-btn-primary"
            type="button"
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
            data-customize-id="edit.save-btn"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="pe-spinner" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle size={16} /> Save Changes
              </>
            )}
          </button>
        </div>
      </header>

      {/* Progress stepper */}
      <div className="pe-steps" data-customize-id="edit.steps">
        {[
          { label: 'Details', done: title && address && rent },
          { label: 'Media', done: images.length + videos.length > 0 },
          { label: 'Amenities', done: amenities.length > 0 },
          { label: 'Publish', done: false },
        ].map((step, i) => (
          <div key={step.label} className={`pe-step ${step.done ? 'pe-step--done' : ''} ${i === 0 ? 'pe-step--active' : ''}`}>
            <span className="pe-step-num">{i + 1}</span>
            <span className="pe-step-label">{step.label}</span>
            {step.done && <CheckCircle size={14} className="pe-step-check" />}
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="pe-body" data-customize-id="edit.body">
        {/* Left column */}
        <div className="pe-left" data-customize-id="edit.left">
          {/* --- General / Basic Info --- */}
          <section className="pe-section" aria-labelledby="general-heading">
            <h2 id="general-heading" className="pe-section-title">
              <Home size={20} />
              General Information
            </h2>

            {/* Title */}
            <div className="pe-group">
              <label htmlFor="editTitle" className="pe-field-label">
                <Home size={18} />
                Title
              </label>
              <input
                id="editTitle"
                className={`pe-input ${validationResults.title?.length > 0 ? 'pe-input--error' : ''}`}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setValidationResults((prev) => ({ ...prev, title: validateField('title', e.target.value) }));
                }}
                placeholder="e.g. Modern 2BR Apartment in KLCC"
                aria-required="true"
                aria-invalid={validationResults.title?.length > 0}
                aria-describedby={validationResults.title?.length > 0 ? 'titleErr' : 'titleHelp'}
                data-customize-id="edit.title-input"
              />
              <span id="titleHelp" className="pe-field-help">
                Descriptive title for your property listing.
              </span>
              {validationResults.title?.length > 0 && (
                <span id="titleErr" className="pe-validation-msg" role="alert">
                  {validationResults.title.join(' ')}
                </span>
              )}
            </div>

            {/* Address */}
            <div className="pe-group">
              <label htmlFor="editAddress" className="pe-field-label">
                <MapPin size={18} />
                Address
              </label>
              <input
                id="editAddress"
                className={`pe-input ${validationResults.address?.length > 0 ? 'pe-input--error' : ''}`}
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setValidationResults((prev) => ({ ...prev, address: validateField('address', e.target.value) }));
                }}
                placeholder="Street address"
                aria-required="true"
                aria-describedby={validationResults.address?.length > 0 ? 'addressErr' : 'addressHelp'}
              />
              <span id="addressHelp" className="pe-field-help">
                Complete address of the property.
              </span>
              {validationResults.address?.length > 0 && (
                <span id="addressErr" className="pe-validation-msg" role="alert">
                  {validationResults.address.join(' ')}
                </span>
              )}
            </div>

            {/* City & State row */}
            <div className="pe-row-group">
              <div className="pe-group">
                <label htmlFor="editCity" className="pe-field-label">City</label>
                <input id="editCity" className="pe-input pe-input--half" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              </div>
              <div className="pe-group">
                <label htmlFor="editState" className="pe-field-label">State</label>
                <input id="editState" className="pe-input pe-input--half" type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
              </div>
            </div>

            {/* Rent + Property Type */}
            <div className="pe-row-group">
              <div className="pe-group">
                <label htmlFor="editRent" className="pe-field-label">
                  <DollarSign size={18} />
                  Rent (MYR)
                </label>
                <input
                  id="editRent"
                  className={`pe-input ${validationResults.rent?.length > 0 ? 'pe-input--error' : ''}`}
                  type="text"
                  inputMode="decimal"
                  value={rent}
                  onChange={(e) => {
                    setRent(e.target.value);
                    setValidationResults((prev) => ({ ...prev, rent: validateField('rent', e.target.value) }));
                  }}
                  placeholder="e.g. 2,500"
                  aria-required="true"
                  aria-describedby={validationResults.rent?.length > 0 ? 'rentErr' : 'rentHelp'}
                />
                <span id="rentHelp" className="pe-field-help">Monthly rent in MYR.</span>
                {validationResults.rent?.length > 0 && (
                  <span id="rentErr" className="pe-validation-msg" role="alert">
                    {validationResults.rent.join(' ')}
                  </span>
                )}
              </div>
              <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
            </div>

            {/* Status */}
            <StatusPicker value={status} onChange={setStatus} />

            {/* Available From / To */}
            <DateRangePicker label="Available Period" fromValue={availableFrom} fromChange={setAvailableFrom} toValue={availableTo} toChange={setAvailableTo} />

            {/* Description */}
            <div className="pe-group">
              <label htmlFor="editDesc" className="pe-field-label">
                <Info size={18} />
                Description
              </label>
              <textarea id="editDesc" className="pe-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your property..." rows={4} />
            </div>
          </section>

          {/* --- Media Section --- */}
          <section className="pe-section" aria-labelledby="media-heading">
            <div className="pe-section-header">
              <div className="pe-section-title-row" id="media-heading">
                <ImageIcon size={20} />
                Images
                <span className="pe-section-count">{images.length}</span>
              </div>
              <button className="pe-btn-icon" onClick={() => setShowMediaModal('image')} aria-label="Add new images">
                <Plus size={20} />
                Add
              </button>
            </div>

            {/* Image gallery grid */}
            <div className="pe-media-grid" role="list" aria-label="Images">
              {images.length === 0 && (
                <div className="pe-media-empty" aria-live="polite">
                  <ImageIcon size={32} />
                  <p>No images yet. Add photos of your property.</p>
                  <button className="pe-btn-secondary" onClick={() => setShowMediaModal('image')}>
                    <Plus size={16} />
                    Upload Images
                  </button>
                </div>
              )}
              {images.map((img) => (
                <MediaItem
                  key={img.id}
                  item={img}
                  type="image"
                  onUpdate={(item, updates) => {
                    setImages((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updates } : i)));
                  }}
                  onRemove={removeImage}
                />
              ))}
              <button className="pe-media-add-btn" onClick={() => setShowMediaModal('image')} aria-label="Add another image">
                <Plus size={24} />
              </button>
            </div>

            {/* Videos */}
            <div className="pe-section-header pe-section-vid-header">
              <div className="pe-section-title-row">
                <Video size={20} />
                Videos
                <span className="pe-section-count">{videos.length}</span>
              </div>
              <button className="pe-btn-icon" onClick={() => setShowMediaModal('video')} aria-label="Add new videos">
                <Plus size={20} />
                Add
              </button>
            </div>
            <div className="pe-media-grid" role="list" aria-label="Videos">
              {videos.length === 0 && (
                <div className="pe-media-empty">
                  <Video size={32} />
                  <p>No videos yet. Add a video tour.</p>
                  <button className="pe-btn-secondary" onClick={() => setShowMediaModal('video')}>
                    <Plus size={16} />
                    Upload Video
                  </button>
                </div>
              )}
              {videos.map((vid) => (
                <MediaItem
                  key={vid.id}
                  item={vid}
                  type="video"
                  onUpdate={(item, updates) => {
                    setVideos((prev) => prev.map((v) => (v.id === item.id ? { ...v, ...updates } : v)));
                  }}
                  onRemove={removeVideo}
                />
              ))}
              <button className="pe-media-add-btn" onClick={() => setShowMediaModal('video')} aria-label="Add another video">
                <Plus size={24} />
              </button>
            </div>
          </section>

          {/* --- Documents --- */}
          <section className="pe-section" aria-labelledby="document-heading">
            <div className="pe-section-header">
              <div className="pe-section-title-row" id="document-heading">
                <FileText size={20} />
                Documents
                <span className="pe-section-count">{documents.length}</span>
              </div>
              <button className="pe-btn-icon" onClick={() => setShowMediaModal('document')} aria-label="Add new documents">
                <Plus size={20} />
                Add
              </button>
            </div>
            {documents.length === 0 ? (
              <div className="pe-documents-empty">
                <FileText size={32} />
                <p>No documents yet. Upload property documents here.</p>
                <button className="pe-btn-secondary" onClick={() => setShowMediaModal('document')}>
                  <Plus size={16} />
                  Upload Document
                </button>
              </div>
            ) : (
              <div className="pe-documents-list">
                {documents.map((doc) => (
                  <div key={doc.id} className="pe-document-item">
                    <div className="pe-document-info">
                      <FileText size={18} className="pe-document-icon" />
                      <span className="pe-document-name" title={doc.documentName || doc.url}>{doc.documentName || doc.url}</span>
                      <span className="pe-document-size">{doc.url}</span>
                    </div>
                    <div className="pe-document-actions">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="pe-document-download" aria-label="Download document">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                      <button onClick={() => removeDocument(doc.id)} className="pe-document-remove" aria-label="Remove document">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* --- Amenities --- */}
          <section className="pe-section" aria-labelledby="amenity-heading">
            <div className="pe-section-header">
              <div className="pe-section-title-row" id="amenity-heading">
                <Tag size={20} />
                Amenities
                <span className="pe-section-count">{amenities.length}</span>
              </div>
              <button className="pe-btn-icon" onClick={() => setShowAmenityModal(true)} aria-label="Manage amenities">
                <Plus size={20} />
                Manage
              </button>
            </div>
            {amenities.length === 0 ? (
              <div className="pe-section-empty">
                <Layers size={32} />
                <p>Click &apos;Manage&apos; to add amenities.</p>
              </div>
            ) : (
              <div className="pe-amenity-list" role="list">
                {amenities.map((amenity) => (
                  <AmenityItem key={amenity.id} amenity={amenity} onEdit={editAmenity} onRemove={removeAmenity} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <div className="pe-right" data-customize-id="edit.right">
          {/* Summary card */}
          <div className="pe-sidebar-card">
            <h3 className="pe-sidebar-title">Saving Preview</h3>
            <div className="pe-summary-list">
              <div className="pe-summary-row">
                <span className="pe-summary-label">Title</span>
                <span className="pe-summary-value">{title || '(empty)'}</span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Address</span>
                <span className="pe-summary-value">{address || '(empty)'}</span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Rent</span>
                <span className="pe-summary-value">
                  {rent ? `${Number(rent).toLocaleString()} MYR/mo` : '---'}
                </span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Status</span>
                <span className="pe-summary-value">{status}</span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Type</span>
                <span className="pe-summary-value">{propertyType || 'Not set'}</span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Images</span>
                <span className="pe-summary-value">{images.length}</span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Videos</span>
                <span className="pe-summary-value">{videos.length}</span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Documents</span>
                <span className="pe-summary-value">{documents.length}</span>
              </div>
              <div className="pe-summary-row">
                <span className="pe-summary-label">Amenities</span>
                <span className="pe-summary-value">{amenities.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Add Modal */}
      <AddMediaModal isOpen={!!showMediaModal} onClose={() => setShowMediaModal(null)} type={showMediaModal} propertyId={id} onAdd={showMediaModal === 'image' ? addImage : showMediaModal === 'video' ? addVideo : addDocument} categories={categories} />

      {/* Amenity Add Modal */}
      {showAmenityModal && (
        <div className="pe-modal-overlay" role="dialog" aria-modal="true" aria-label="Add amenity">
          <div className="pe-modal pe-amenity-modal">
            <div className="pe-modal-header">
              <h2 className="pe-modal-title">Add Amenity</h2>
              <button className="pe-modal-close" onClick={() => setShowAmenityModal(false)} aria-label="Close amenity dialog">
                <X size={20} />
              </button>
            </div>
            <div className="pe-modal-body">
              <div className="pe-add-amenity-form">
                <input className="pe-input" type="text" placeholder="Enter amenity name..." value={newAmenityName} onChange={(e) => setNewAmenityName(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter') addAmenity();
                }} aria-label="Amenity name" />
                <button className="pe-btn-primary" onClick={addAmenity} disabled={!newAmenityName.trim()}>
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <p className="pe-amenity-tip">
                Tip: Add common amenities like Wi-Fi, Air Conditioning, Parking, Pool, etc.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default PropertyEdit;
