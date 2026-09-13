import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'prmsSelectedRole';

/* ------ Context ------ */

const RegistrationContext = createContext(null);

/* ------ Provider ------ */

export function RegistrationProvider({ children }) {
  /* Restore from sessionStorage on mount */
  const storedRole =
    (typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(STORAGE_KEY)
      : null) ?? null;

  const [selectedRole, setSelectedRoleState] = useState(storedRole);
  const [pendingRegistration, setPendingRegistration] = useState(!!storedRole);

  /* Persist every change to sessionStorage */
  useEffect(() => {
    if (selectedRole) {
      sessionStorage.setItem(STORAGE_KEY, selectedRole);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedRole]);

  const setSelectedRole = useCallback((role) => {
    setSelectedRoleState(role);
    setPendingRegistration(!!role);
  }, []);

  const clearRegistration = useCallback(() => {
    setSelectedRoleState(null);
    setPendingRegistration(false);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = {
    selectedRole,
    pendingRegistration,
    setSelectedRole,
    clearRegistration,
  };

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
}

/* ------ Hook ------ */

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
