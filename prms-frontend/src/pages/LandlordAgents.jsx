import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Phone, Search, UserRoundCheck, X } from 'lucide-react';
import { agentApi } from '../api/agents';
import { propertyApi } from '../api/property';
import { getApiError } from '../api';
import './LandlordAgents.css';

export default function LandlordAgents() {
  const [agents, setAgents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProperties, setSelectedProperties] = useState({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchResources = useCallback(async () => {
    const [agentResponse, propertyResponse] = await Promise.all([
        agentApi.list({ limit: 100 }),
        propertyApi.myProperties({ limit: 100 }),
    ]);
    return {
      agents: agentResponse.data?.data || [],
      properties: propertyResponse.data?.data || [],
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resources = await fetchResources();
      setAgents(resources.agents);
      setProperties(resources.properties);
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to load agents and properties.'));
    } finally {
      setLoading(false);
    }
  }, [fetchResources]);

  useEffect(() => {
    let active = true;
    fetchResources()
      .then((resources) => {
        if (!active) return;
        setAgents(resources.agents);
        setProperties(resources.properties);
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError, 'Unable to load agents and properties.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchResources]);

  const filteredAgents = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return agents;
    return agents.filter((agent) => [agent.user?.full_name, agent.user?.email, agent.user?.phone]
      .some((field) => String(field || '').toLowerCase().includes(value)));
  }, [agents, search]);

  function assignedIds(agent) {
    return new Set((agent.agentProperties || []).map((item) => item.property.id));
  }

  async function assign(agent) {
    const propertyId = selectedProperties[agent.id];
    if (!propertyId) {
      setError('Choose one of your properties before assigning the agent.');
      return;
    }
    const key = `assign:${agent.id}:${propertyId}`;
    setPending(key);
    setError('');
    setMessage('');
    try {
      await agentApi.assignProperty(agent.id, propertyId);
      setSelectedProperties((current) => ({ ...current, [agent.id]: '' }));
      setMessage(`${agent.user?.full_name || 'Agent'} was assigned successfully.`);
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to assign this property.'));
    } finally {
      setPending('');
    }
  }

  async function unassign(agent, property) {
    const confirmed = window.confirm(`Remove ${agent.user?.full_name || 'this agent'} from ${property.title}?`);
    if (!confirmed) return;
    const key = `remove:${agent.id}:${property.id}`;
    setPending(key);
    setError('');
    setMessage('');
    try {
      await agentApi.unassignProperty(agent.id, property.id);
      setMessage(`${agent.user?.full_name || 'Agent'} was removed from ${property.title}.`);
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to remove this assignment.'));
    } finally {
      setPending('');
    }
  }

  return (
    <div className="landlord-agents-page">
      <header className="landlord-agents-heading">
        <div>
          <p className="landlord-agents-eyebrow">Property team</p>
          <h1>Manage Agents</h1>
          <p>Assign registered agents to your properties and review their current responsibilities.</p>
        </div>
        <div className="landlord-agents-summary">
          <UserRoundCheck size={22} />
          <div><strong>{agents.filter((agent) => agent.agentProperties?.length).length}</strong><span>Assigned agents</span></div>
        </div>
      </header>

      <div className="landlord-agents-toolbar">
        <Search size={19} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search agents by name, email, or phone"
          aria-label="Search agents"
        />
      </div>

      {error && <div className="landlord-agents-alert error" role="alert">{error}</div>}
      {message && <div className="landlord-agents-alert success" role="status">{message}</div>}

      {loading ? <div className="landlord-agents-state">Loading agents...</div> : (
        <div className="landlord-agents-grid">
          {filteredAgents.map((agent) => {
            const assignments = agent.agentProperties || [];
            const currentIds = assignedIds(agent);
            const availableProperties = properties.filter((property) => !currentIds.has(property.id));
            const displayName = agent.user?.full_name || 'Unnamed agent';
            return (
              <article className="landlord-agent-card" key={agent.id}>
                <div className="landlord-agent-profile">
                  {agent.user?.profile_img_url
                    ? <img src={agent.user.profile_img_url} alt="" />
                    : <div className="landlord-agent-avatar">{displayName.charAt(0).toUpperCase()}</div>}
                  <div>
                    <h2>{displayName}</h2>
                    <span>{assignments.length} {assignments.length === 1 ? 'property' : 'properties'} assigned</span>
                  </div>
                </div>

                <div className="landlord-agent-contact">
                  <p><Mail size={16} /><span>{agent.user?.email || 'No email provided'}</span></p>
                  <p><Phone size={16} /><span>{agent.user?.phone || 'No phone provided'}</span></p>
                </div>

                <div className="landlord-agent-assignments">
                  <h3>Assigned properties</h3>
                  {assignments.length ? assignments.map(({ property }) => (
                    <div className="landlord-agent-property" key={property.id}>
                      <Building2 size={17} />
                      <div><strong>{property.title}</strong><span>{property.address || 'Address unavailable'}</span></div>
                      <button
                        type="button"
                        onClick={() => unassign(agent, property)}
                        disabled={pending === `remove:${agent.id}:${property.id}`}
                        aria-label={`Remove ${displayName} from ${property.title}`}
                        title="Remove assignment"
                      ><X size={17} /></button>
                    </div>
                  )) : <p className="landlord-agent-empty">Not assigned to any of your properties.</p>}
                </div>

                <div className="landlord-agent-action">
                  <select
                    value={selectedProperties[agent.id] || ''}
                    onChange={(event) => setSelectedProperties((current) => ({ ...current, [agent.id]: event.target.value }))}
                    disabled={!availableProperties.length || pending.startsWith('assign:')}
                    aria-label={`Property to assign to ${displayName}`}
                  >
                    <option value="">{availableProperties.length ? 'Select a property' : 'All properties assigned'}</option>
                    {availableProperties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => assign(agent)}
                    disabled={!selectedProperties[agent.id] || pending.startsWith('assign:')}
                  >{pending.startsWith(`assign:${agent.id}:`) ? 'Assigning...' : 'Assign'}</button>
                </div>
              </article>
            );
          })}
          {!filteredAgents.length && (
            <div className="landlord-agents-state">{search ? 'No agents match your search.' : 'No registered agents are available.'}</div>
          )}
        </div>
      )}
    </div>
  );
}
