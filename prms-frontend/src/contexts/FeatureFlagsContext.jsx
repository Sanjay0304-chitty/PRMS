import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/ApiClient';

const FeatureFlagsContext = createContext(null);

const DEFAULT_FLAGS = {
  bookingSystem: true,
  paymentsEnabled: true,
  maintenanceEnabled: true,
  reportsEnabled: true,
  chatEnabled: true,
  notificationsEnabled: true,
  maintenanceMode: false,
};

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const loadFlags = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/settings/public');
      if (res.data?.data) {
        const backendFlags = {};
        for (const s of res.data.data) {
          backendFlags[s.key] = parseValue(s.value, s.type);
        }
        setFlags(prev => ({ ...prev, ...backendFlags }));
      }
    } catch (e) {
      console.warn('Feature flags load failed, using defaults:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const isFeatureEnabled = useCallback((flagName) => {
    const val = flags[flagName];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val !== 'false' && val !== '';
    return true;
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, isFeatureEnabled, loadFlags }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return ctx;
}

function parseValue(raw, type) {
  if (type === 'boolean') return raw === 'true' || raw === true;
  if (type === 'number' || type === 'integer') return Number(raw);
  return raw;
}