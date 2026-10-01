import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { propertyApi } from '../api';
import { agentApi } from '../api/agents';
import { PROPERTY_TYPES } from '../config/propertyTypes';
import './PropertyEdit.css';

export default function AgentPropertyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [property, setProperty] = useState(null);
  const [form, setForm] = useState({ title: '', address: '', property_type: 'apartment', city: '', state: '', description: '', amenities: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [propertyRes, assignedRes] = await Promise.all([
          propertyApi.getById(id),
          agentApi.myProperties({ limit: 100 }),
        ]);
        const assigned = assignedRes.data?.data || [];
        if (!assigned.some((item) => item.id === id)) throw new Error('You are not assigned to this property');
        const item = propertyRes.data?.data;
        if (!cancelled) {
          setProperty(item);
          setForm({
            title: item.title || '',
            address: item.address || '',
            property_type: item.property_type || 'apartment',
            city: item.city || '',
            state: item.state || '',
            description: item.description || '',
            amenities: (item.amenities || []).map((amenity) => amenity.name).join(', '),
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || err.message || 'Failed to load property');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function save() {
    setError('');
    setSuccess('');
    if (form.title.trim().length < 3 || form.address.trim().length < 5) {
      setError('Enter a title of at least 3 characters and an address of at least 5 characters.');
      return;
    }
    setSaving(true);
    try {
      const existingAmenities = new Map((property.amenities || []).map((amenity) => [amenity.name.toLowerCase(), amenity]));
      const amenities = form.amenities.split(',').map((name) => name.trim()).filter(Boolean).map((name) => {
        const existing = existingAmenities.get(name.toLowerCase());
        return existing || { name, description: `Amenity: ${name}` };
      });
      await propertyApi.updateOperational(id, {
        title: form.title.trim(),
        address: form.address.trim(),
        property_type: form.property_type,
        city: form.city.trim(),
        state: form.state.trim(),
        description: form.description.trim(),
        amenities,
      });
      setSuccess('Operational property details updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="pe-page"><div className="pe-loading"><Loader2 className="pe-spinner" size={32} /><p>Loading property…</p></div></main>;
  if (error && !property) return <main className="pe-page"><div className="pe-error"><p>{error}</p><button className="pe-btn-secondary" onClick={() => navigate('/agent/properties')}>Back</button></div></main>;

  return (
    <main className="pe-page">
      <header className="pe-topbar">
        <button className="pe-back-btn" onClick={() => navigate(`/agent/properties/${id}`)}><ArrowLeft size={20} />Back</button>
        <div className="pe-topbar-center">
          <h1 className="pe-topbar-title">Manage Listing Content</h1>
          <span className="pe-topbar-sub">Rent, status, availability and ownership remain Landlord-controlled.</span>
        </div>
        <button className="pe-btn-primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="pe-spinner" size={16} /> : <Save size={16} />} {saving ? 'Saving…' : 'Save Changes'}</button>
      </header>

      <div className="pe-body">
        <div className="pe-left">
          {error && <div className="form-alert-error">{error}</div>}
          {success && <div className="form-alert-ok"><CheckCircle size={16} />{success}</div>}
          <section className="pe-section">
            <h2 className="pe-section-title">Operational Listing Information</h2>
            <div className="pe-group"><label className="pe-field-label">Title</label><input className="pe-input" value={form.title} onChange={(e) => update('title', e.target.value)} maxLength={150} /></div>
            <div className="pe-group"><label className="pe-field-label">Address</label><input className="pe-input" value={form.address} onChange={(e) => update('address', e.target.value)} /></div>
            <div className="pe-row-group">
              <div className="pe-group"><label className="pe-field-label">City</label><input className="pe-input" value={form.city} onChange={(e) => update('city', e.target.value)} /></div>
              <div className="pe-group"><label className="pe-field-label">State</label><input className="pe-input" value={form.state} onChange={(e) => update('state', e.target.value)} /></div>
            </div>
            <div className="pe-group"><label className="pe-field-label">Property type</label><select className="pe-input" value={form.property_type} onChange={(e) => update('property_type', e.target.value)}>{PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
            <div className="pe-group"><label className="pe-field-label">Description</label><textarea className="pe-textarea" rows={6} value={form.description} onChange={(e) => update('description', e.target.value)} /></div>
            <div className="pe-group"><label className="pe-field-label">Amenities</label><input className="pe-input" value={form.amenities} onChange={(e) => update('amenities', e.target.value)} placeholder="WiFi, Parking, Gym" /><span className="pe-field-help">Separate amenities with commas.</span></div>
          </section>
        </div>
        <aside className="pe-right">
          <section className="pe-section">
            <h2 className="pe-section-title">Landlord-controlled fields</h2>
            <p><strong>Rent:</strong> RM {Number(property?.rent || 0).toLocaleString()}</p>
            <p><strong>Status:</strong> {property?.status}</p>
            <p><strong>Available from:</strong> {property?.availableFrom ? new Date(property.availableFrom).toLocaleDateString('en-MY') : 'Not set'}</p>
            <p><strong>Available to:</strong> {property?.availableTo ? new Date(property.availableTo).toLocaleDateString('en-MY') : 'Not set'}</p>
            <p>Contact the property owner when one of these values needs to change.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
