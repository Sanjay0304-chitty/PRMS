import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Flag, Search, MapPin } from 'lucide-react';
import { propertyApi } from '../api';
import { favoritesApi } from '../api/favorites';
import { useAuth } from '../contexts/AuthContext';
import { PROPERTY_TYPES, propertyTypeLabel } from '../config/propertyTypes';
import { propertyStatusInfo } from '../config/propertyStatus';
import { getImageUrl } from '../config/imageHelper';
import { rememberPropertyReturn } from '../utils/publicJourney';
import PrivateImage from '../components/PrivateImage';
import ReportListingModal from '../components/ReportListingModal';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';
import './GuestProperties.css';

export default function GuestProperties() {
  const [params, setParams] = useSearchParams();
  const queryString = params.toString();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({total:0,totalPages:0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [report, setReport] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [busy, setBusy] = useState('');
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const search = params.get('search') || params.get('q') || '';
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [page]);
  const status = ['AVAILABLE','RENTED','MAINTENANCE','ALL'].includes(params.get('status')) ? params.get('status') : 'AVAILABLE';
  const update = values => {
    const next = new URLSearchParams(params);
    next.delete('q'); next.delete('page');
    Object.entries(values).forEach(([key,value]) => value === '' ? next.delete(key) : next.set(key,String(value)));
    setParams(next);
  };
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(queryString);
    Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true); setError('');
      try {
        const selected = query.get('status') || 'AVAILABLE';
        const res = await propertyApi.list({page:Math.max(1,Number.parseInt(query.get('page'),10)||1),limit:12,publicOnly:true,
          search:query.get('search') || query.get('q') || undefined, type:query.get('type') || undefined,
          status:selected === 'ALL' ? undefined : selected,
          minRent:query.get('minRent') || undefined,maxRent:query.get('maxRent') || undefined});
        if (active) { setProperties(res.data.data || []); setPagination(res.data.pagination); }
      } catch (e) { if (active) { setProperties([]); setError(e.response?.data?.error?.message || 'Unable to load properties. Please try again.'); } }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [queryString, retry]);
  useEffect(() => {
    let active = true;
    if (!user) { setFavorites(new Set()); return; }
    if (user) favoritesApi.list().then(res => { if (active) setFavorites(new Set((res.data?.data || []).map(f => f.propertyId || f.property?.id || f.id))); }).catch(() => {});
    return () => { active = false; };
  }, [user]);
  async function favorite(property) {
    if (!user) { rememberPropertyReturn(`/properties/${property.id}`); navigate('/login'); return; }
    setBusy(property.id);
    try {
      if (favorites.has(property.id)) await favoritesApi.removeFavorite(property.id);
      else await favoritesApi.addFavorite(property.id);
      setFavorites(previous => { const next = new Set(previous); if(next.has(property.id)) next.delete(property.id); else next.add(property.id); return next; });
    } catch { setError('Unable to update favorites. Please try again.'); }
    finally { setBusy(''); }
  }
  return <div className="guest-properties-page"><PublicHeader /><main className="public-catalogue">
    <h1>Rental properties</h1><p>Browse available homes or explore other published listings.</p>
    <form className="public-search-form" key={search} onSubmit={e => { e.preventDefault(); update({search:new FormData(e.currentTarget).get('search').trim()}); }}>
      <label htmlFor="catalogue-search">Location, property name or type</label><div><input id="catalogue-search" type="search" name="search" defaultValue={search} placeholder="Search properties" /><button className="public-primary" type="submit"><Search size={18} /> Search</button></div>
    </form>
    <details className="public-filter-panel" open><summary>Filter properties</summary><div className="public-filter-fields">
      <label>Availability<select value={status} onChange={e => update({status:e.target.value})}><option value="AVAILABLE">Available</option><option value="ALL">All published listings</option><option value="RENTED">Rented</option><option value="MAINTENANCE">Maintenance</option></select></label>
      <label>Property type<select value={params.get('type') || ''} onChange={e => update({type:e.target.value})}><option value="">All types</option>{PROPERTY_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label>Minimum monthly rent (RM)<input type="number" min="0" step="100" value={params.get('minRent') || ''} onChange={e => update({minRent:e.target.value})} /></label>
      <label>Maximum monthly rent (RM)<input type="number" min="0" step="100" value={params.get('maxRent') || ''} onChange={e => update({maxRent:e.target.value})} /></label>
    </div><button type="button" className="btn btn-outline" onClick={() => setParams({})}>Reset filters</button></details>
    {error && <div role="alert"><p>{error}</p><button type="button" className="public-primary" onClick={() => setRetry(retry+1)}>Try Again</button></div>}
    {loading ? <p role="status">Loading properties…</p> : <><p role="status">{pagination.total} properties found{pagination.total ? ` · Page ${page} of ${pagination.totalPages}` : ''}</p>
      {!properties.length && !error && <p>No properties match your filters. Try another location or reset the filters.</p>}
      <div className="guest-property-grid">{properties.map(property => {
        const info = propertyStatusInfo(property.status);
        return <article className="guest-property-card" key={property.id}><div className="guest-property-image">
          <Link to={`/properties/${property.id}`} aria-label={`View ${property.title}`}><PrivateImage src={getImageUrl(property.images?.[0]?.url)} fallbackSources={(property.images||[]).slice(1).map(image => getImageUrl(image.url))} alt={property.title} loading="lazy" /></Link>
          <button type="button" className="heart-btn" aria-label={`${favorites.has(property.id) ? 'Remove from' : 'Save to'} favorites: ${property.title}`} aria-pressed={favorites.has(property.id)} disabled={busy===property.id} onClick={() => favorite(property)}><Heart size={20} fill={favorites.has(property.id) ? 'currentColor' : 'none'} /></button>
        </div><div className="guest-property-body"><h2><Link to={`/properties/${property.id}`}>{property.title}</Link></h2>
          <p>{property.reviewsCount ? `★ ${Number(property.rating).toFixed(1)} (${property.reviewsCount} reviews)` : 'No reviews yet'}</p>
          <p><MapPin size={15} /> {[property.city,property.state].filter(Boolean).join(', ') || property.address}</p><p>{propertyTypeLabel(property.property_type)}</p><p className="public-listing-status">{info.label}</p>
          <div className="guest-property-footer"><strong>RM {Number(property.rent).toLocaleString()} / month</strong><button type="button" className="guest-card-report-link" onClick={() => setReport(property)}><Flag size={14} /> Report</button></div>
        </div></article>;
      })}</div>
      <nav className="public-pagination" aria-label="Property pages"><button type="button" className="btn btn-outline" disabled={page<=1} onClick={() => update({page:page-1})}>Previous</button><span>Page {page} of {Math.max(1,pagination.totalPages)}</span><button type="button" className="btn btn-outline" disabled={page>=pagination.totalPages} onClick={() => update({page:page+1})}>Next</button></nav>
    </>}
    <ReportListingModal isOpen={!!report} onClose={() => setReport(null)} property={report} />
  </main><PublicFooter /></div>;
}
