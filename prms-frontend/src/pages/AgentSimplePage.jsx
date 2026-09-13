import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import './AgentSimplePage.css';

const AgentSimplePage = ({ label }) => {
  const navigate = useNavigate();

  const agentPages = [
    { name: 'Dashboard', path: '/agent/dashboard' },
    { name: 'Assigned Properties', path: '/agent/properties' },
    { name: 'Bookings', path: '/agent/bookings' },
    { name: 'Maintenance', path: '/agent/maintenance' },
    { name: 'My Categories', path: '/agent/categories' },
  ];

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="agent-simple-page" data-customize-id="global.content">
      <div className="agent-simple-topbar">
        <h2>{label}</h2>
        <div className="agent-simple-search">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="agent-simple-info-box">
        <p>Loading {label}...</p>
        <p className="agent-simple-muted">
          Connect this page to the backend API to display live data.
        </p>
      </div>

      <div className="agent-simple-quick-links">
        <h3>Quick Navigation</h3>
        <div className="agent-simple-quick-links-grid">
          {agentPages.map((page) => (
            <button
              key={page.path}
              type="button"
              className="agent-simple-quick-link-btn"
              onClick={() => navigate(page.path)}
            >
              {page.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

AgentSimplePage.propTypes = {
  label: PropTypes.string.isRequired,
};

export default AgentSimplePage;
