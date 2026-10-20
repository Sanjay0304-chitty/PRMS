import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { useAuth } from './AuthContext';

const UserPreferencesContext = createContext(null);
const DEFAULT_PREFERENCES = {
  appearance: 'system',
  notificationsEnabled: true,
  viewingNotifications: true,
  applicationNotifications: true,
  maintenanceNotifications: true,
  messageNotifications: true,
};

export function UserPreferencesProvider({ children }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES);
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.getPreferences();
      if (response.data?.data) setPreferences((current) => ({ ...current, ...response.data.data }));
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = useCallback(async (updates) => {
    try {
      const res = await authApi.updatePreferences(updates);
      if (res.data?.data) setPreferences(prev => ({ ...prev, ...res.data.data }));
      return res;
    } catch (e) {
      console.error('Failed to update preferences:', e);
      throw e;
    }
  }, []);

  return (
    <UserPreferencesContext.Provider value={{ preferences, loading, updatePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return ctx;
}
