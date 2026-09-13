import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { agentApi } from '../api/agents';
import { getImageUrl } from '../config/imageHelper';
import './SharedPageShell.css';

function formatAmount(amount) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount ? `RM ${amount}` : 'N/A';
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 0 }).format(value);
}

export default function AgentProperties() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchTerm = (searchParams.get('search') || '').trim().toLowerCase();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await agentApi.myProperties({ limit: 100 });
      setProperties(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleProperties = searchTerm
    ? properties.filter((p) =>
        (p.title || '').toLowerCase().includes(searchTerm) ||
        (p.address || '').toLowerCase().includes(searchTerm))
    : properties;

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Assigned Properties</h1>
        <p>Properties you manage on behalf of their landlords.</p>
      </div>

      <div className="card-table">
        {error && <div className="alert alert-danger mt-2">{error} <button className="btn btn-sm" onClick={load}>Retry</button></div>}

        {loading ? (
          <p>Loading...</p>
        ) : visibleProperties.length ? (
          <div className="booking-property-grid">
            {visibleProperties.map((p) => (
              <div key={p.id} className="booking-property-card" onClick={() => navigate(`/agent/properties/${p.id}`)} style={{ cursor: 'pointer' }}>
                <div className="booking-property-card-header">
                  {p.images?.[0]?.url ? (
                    <img className="booking-property-card-img" src={getImageUrl(p.images[0].url)} alt={p.title} />
                  ) : (
                    <div className="booking-property-card-img-placeholder">
                      <Building2 size={32} />
                    </div>
                  )}
                  <span className={`shell-status-badge status-${(p.status || '').toLowerCase()}`}>{p.status}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.address || '—'}</p>
                <p className="price">{formatAmount(p.rent)} / month</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bookings-empty-state">
            <p>{searchTerm ? `No properties match "${searchParams.get('search')}".` : 'No properties assigned to you yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
