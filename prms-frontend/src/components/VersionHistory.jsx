import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { adminApi } from '../api/admin';
import './VersionHistory.css';

export default function VersionHistory({ themeId, currentVersion, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

   
  useEffect(() => {
    if (!themeId || !expanded) return;
    setLoading(true);
    adminApi.getVersions(themeId)
      .then(res => setVersions(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [themeId, expanded]);

  return (
    <div className="version-history">
      <button className="version-history-toggle" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        <Clock size={16} />
        Version History ({versions.length})
      </button>

      {expanded && (
        <div className="version-history-list">
          {loading && <p>Loading...</p>}
          {versions.map(v => (
            <div key={v.id} className={`version-item ${v.version === currentVersion ? 'current' : ''}`}>
              <span>V{v.version} — {new Date(v.createdAt).toLocaleDateString()}</span>
              <button onClick={() => onRestore(v.version)}>
                <RotateCcw size={14} /> Restore
              </button>
            </div>
          ))}
          {versions.length === 0 && !loading && <p>No published versions yet.</p>}
        </div>
      )}
    </div>
  );
}
