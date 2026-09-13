import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { authApi, getApiError } from '../api';
import { roleToPath } from '../config/routes';

/* ------ Actions ------ */

const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOGOUT: 'LOGOUT',
};

/* ------ Reducer ------ */

const initialState = {
  loading: true,
  user: null,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_USER:
      return { ...state, loading: false, user: action.payload, error: null };
    case ACTIONS.SET_ERROR:
      return { ...state, loading: false, error: action.payload };
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case ACTIONS.LOGOUT:
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

/* ------ Context ------ */

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /* ------ Normalize user object ------ */

  function normalizeUser(raw) {
    // Login returns: data.data.user (successResponse wraps in {data})
    // getMe returns: data.data (successResponse wraps in {data})
    // Both backend endpoints now return flat {id, email, full_name, role, ...}
    const user = raw?.data?.user || raw?.data || raw;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      profile_img_url: user.profile_img_url,
      firebase_uid: user.firebase_uid,
      role: user.role || 'Tenant',
      hasPassword: user.hasPassword ?? true,
    };
  }

  /* ------ Register ------ */

  const register = useCallback(
    async (data) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: ACTIONS.CLEAR_ERROR });
      try {
        await authApi.register(data);
        // Success path never went through SET_USER or SET_ERROR (the only
        // two reducer cases that clear loading), so it stayed stuck at the
        // `true` set above forever - App.jsx gates its entire route tree on
        // this flag, so the whole app was left frozen on the loading splash
        // after a successful registration.
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        // Navigating to /login is the caller's job (Register.jsx), and must
        // happen AFTER it clears RegistrationContext's pendingRegistration -
        // LoginGuard sends /login back to /role-selection while that flag is
        // still true, so navigating from here (before the caller has a
        // chance to clear it) bounced every successful registration back to
        // the role picker instead of showing the login page.
        return { success: true };
      } catch (err) {
        const msg = getApiError(err);
        dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
        return { success: false, error: msg };
      }
    },
    []
  );

  /* ------ Login ------ */

  const login = useCallback(
    async ({ email, password }, navigate) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: ACTIONS.CLEAR_ERROR });
      try {
        const { data } = await authApi.login({ email, password });

        // Store tokens — successResponse wraps in {success, message, data: {user, tokens}}
        const tokens = data?.data?.tokens;
        if (tokens) {
          sessionStorage.setItem('accessToken', tokens.accessToken);
          sessionStorage.setItem('refreshToken', tokens.refreshToken);
        }

        // Fetch current user with normalized shape
        const { data: meData } = await authApi.getMe();
        const user = normalizeUser(meData);

        dispatch({ type: ACTIONS.SET_USER, payload: user });

        // Redirect based on role — NO localStorage dashboard path
        if (navigate && user) {
          const path = roleToPath(user.role);
          navigate(path);
        }

        return { success: true, user };
      } catch (err) {
        const msg = getApiError(err);
        dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
        return { success: false, error: msg };
      }
    },
    []
  );

  /* ------ Google Login (AUTH-009) ------ */

  const googleLogin = useCallback(
    async (googleAuth, navigate) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: ACTIONS.CLEAR_ERROR });
      try {
        const { data } = await authApi.googleLogin(googleAuth);

        // Store tokens — successResponse wraps in {success, message, data: {user, tokens, isNewUser}}
        const tokens = data?.data?.tokens || data?.tokens;
        if (tokens) {
          sessionStorage.setItem('accessToken', tokens.accessToken);
          sessionStorage.setItem('refreshToken', tokens.refreshToken);
        }

        // Issue #3: isNewUser flag from backend
        const isNewUser = !!data?.data?.isNewUser;

        // Fetch current user with normalized shape
        const { data: meData } = await authApi.getMe();
        const user = normalizeUser(meData);

        dispatch({ type: ACTIONS.SET_USER, payload: user });

        if (navigate && user) {
          // Issue #3: New Google users go to role-selection for onboarding
          if (isNewUser) {
            localStorage.setItem('prmsOnboarding', 'true');
            navigate('/role-selection');
          } else {
            const path = roleToPath(user.role);
            navigate(path);
          }
        }

        return { success: true, user, isNewUser };
      } catch (err) {
        const msg = getApiError(err);
        dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
        return { success: false, error: msg };
      }
    },
    []
  );

  /* ------ Logout (AUTH-008) ------ */

  const logout = useCallback(
    async (navigate) => {
      try {
        await authApi.logout();
      } catch {
        /* best-effort */
      }
      // Clear ALL auth-related storage
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      localStorage.removeItem('prmsDashboardPath');
      sessionStorage.removeItem('prmsSelectedRole');
      localStorage.removeItem('prmsOnboarding');
      navigate?.('/login');
      dispatch({ type: ACTIONS.LOGOUT });
    },
    []
  );

  /* ------ Update profile ------ */

  const updateProfile = useCallback(async (data) => {
    try {
      const { data: res } = await authApi.updateMe(data);
      const updated = normalizeUser(res);
      dispatch({ type: ACTIONS.SET_USER, payload: updated });
      return { success: true, user: updated };
    } catch (err) {
      const msg = getApiError(err);
      dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  }, []);

  /* ------ Change password ------ */

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      const msg = getApiError(err);
      dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  }, []);

  /* ------ Set password (Google-only accounts with no password yet) ------ */

  const setPassword = useCallback(async ({ newPassword }) => {
    try {
      await authApi.setPassword({ newPassword });
      dispatch({ type: ACTIONS.SET_USER, payload: { ...state.user, hasPassword: true } });
      return { success: true };
    } catch (err) {
      const msg = getApiError(err);
      dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  }, [state.user]);

  /* ------ Upload profile image ------ */

  const uploadProfileImage = useCallback(async (file) => {
    try {
      const { data: res } = await authApi.uploadProfileImage(file);
      const img = res?.data?.profile_img_url ?? res?.profile_img_url;
      const updated = normalizeUser({ ...state.user, profile_img_url: img });
      dispatch({ type: ACTIONS.SET_USER, payload: updated });
      return { success: true, profile_img_url: img };
    } catch (err) {
      const msg = getApiError(err);
      dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  }, [state.user]);

  /* ------ Hydration — restore session (AUTH-003/004) ------ */

  useEffect(() => {
    if (!sessionStorage.getItem('accessToken')) {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      return;
    }

    // Mark hydration flag so the Axios interceptor skips logout during this call
    window.__prmsHydrating = true;
    authApi
      .getMe()
      .then(({ data }) => {
        const user = normalizeUser(data);
        if (user) {
          dispatch({ type: ACTIONS.SET_USER, payload: user });
        } else {
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
      })
      .catch(() => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      })
      .finally(() => {
        window.__prmsHydrating = false;
      });
  }, []);

  /* ------ Clear error ------ */

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  /* ------ Value ------ */

  const value = {
    loading: state.loading,
    user: state.user,
    error: state.error,
    isAuthenticated: !!state.user,
    register,
    login,
    googleLogin,
    logout,
    updateProfile,
    changePassword,
    setPassword,
    uploadProfileImage,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------ Hook ------ */

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuth, AuthContext };
