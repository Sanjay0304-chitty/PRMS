import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { intendedPublicRole } from '../utils/publicJourney';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Home,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRegistration } from '../contexts/RegistrationContext';
import { PRIVACY_NOTICE_ACK_TEXT, PRIVACY_NOTICE_VERSION } from '../config/legalContent';

function RoleSelection() {
  const navigate = useNavigate();
  const { completeGoogleSignup } = useAuth();
  const [googleSignup] = useState(() => !!sessionStorage.getItem('googleRegistrationToken'));
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { setSelectedRole: setContextRole } = useRegistration();
  /* Issue #4: Default to null so user must explicitly pick a role */
  const [params] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState(() => intendedPublicRole(params.get('role'))?.toLowerCase() || null);

  const roles = [
    {
      key: 'tenant',
      title: 'Tenant',
      description: 'Looking for a home to rent.',
      icon: User,
      path: '/tenant',
    },
    {
      key: 'landlord',
      title: 'Landlord',
      description: 'I want to manage my properties.',
      icon: Home,
      path: '/landlord',
    },
    {
      key: 'agent',
      title: 'Agent',
      description: 'I represent landlords and help tenants find homes.',
      icon: Building2,
      path: '/agent',
    },
  ]
  // Admin is deliberately not a self-service option here — Admin accounts
  // must be provisioned by an existing Admin, never picked by a public signup.

  async function handleContinue() {
    /* Issue #4: Guard — don't proceed without role selection */
    if (!selectedRole) return;

    const role = roles.find((item) => item.key === selectedRole);
    const title = role?.title || 'Tenant';

    // A first-time Google identity holds a short-lived registration grant.
    if (googleSignup) {
      if (!privacyAccepted || submitting) return;
      setSubmitting(true);
      setError('');
      const result = await completeGoogleSignup({ role: title, consents: [{ type: 'PRIVACY_NOTICE', wording: PRIVACY_NOTICE_ACK_TEXT, version: PRIVACY_NOTICE_VERSION, consented: true }] }, navigate);
      if (!result.success) { setError(result.error); setSubmitting(false); }
    } else {
      /* Regular registration flow: save role to context (syncs to sessionStorage) and go to Register */
      setContextRole(title);
      navigate('/register');
    }
  }

  return (
    <main className="role-page" data-customize-id="global.page">
      <motion.section
        className="role-left"
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <Link to="/" className="role-brand" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          <motion.div
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <Building2 size={44} />
          </motion.div>
          <motion.span
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            PRMS
          </motion.span>
        </Link>

        <div className="role-left-content">
          <motion.h1
            initial={{ y: 34, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.55 }}
          >
            Choose how you want to use PRMS.
          </motion.h1>

          <motion.p
            initial={{ y: 34, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.55 }}
          >
            Explore rental listings, manage your properties, or help landlords as an assigned agent. PRMS is a development project with simulated payments.
          </motion.p>
        </div>
      </motion.section>

      <motion.section
        className="role-right"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <motion.div
          className="role-card"
          initial={{ y: 34, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.55, ease: 'easeOut' }}
        >
          <motion.div
            className="steps"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.35 }}
          >
            <div className="step active">
              <span>1</span>
              <p>Role</p>
            </div>

            <div className="step-line"></div>

            <div className="step">
              <span>2</span>
              <p>{googleSignup ? 'Ready' : 'Account'}</p>
            </div>
          </motion.div>

          <motion.h2
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.35 }}
          >
            Who are you?
          </motion.h2>

          <motion.p
            className="role-subtitle"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.52, duration: 0.35 }}
          >
            Choose your role to customize your experience.
          </motion.p>

          <div className="role-options">
            {roles.map((role, index) => {
              const Icon = role.icon
              const isSelected = selectedRole === role.key

              return (
                <motion.button
                  type="button"
                  key={role.key}
                  className={isSelected ? 'role-option selected' : 'role-option'}
                  onClick={() => setSelectedRole(role.key)}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.62 + index * 0.1, duration: 0.35 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="role-icon">
                    <Icon size={28} />
                  </div>

                  <div>
                    <h3>{role.title}</h3>
                    <p>{role.description}</p>
                  </div>

                  <div className="radio-circle">{isSelected && <span></span>}</div>
                </motion.button>
              )
            })}
          </div>

          {googleSignup && (
            <div className="role-consent">
              <label>
                <input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} />
                <span>{PRIVACY_NOTICE_ACK_TEXT} Read the <Link to="/privacy-notice" target="_blank" rel="noreferrer">Privacy Notice</Link>. By creating an account I agree to the <Link to="/terms" target="_blank" rel="noreferrer">Terms and Conditions</Link>.</span>
              </label>
            </div>
          )}
          {error && <p role="alert" style={{ color: 'var(--error-state, #b91c1c)' }}>{error} <Link to="/login" onClick={() => sessionStorage.removeItem('googleRegistrationToken')}>Try Google sign-in again</Link></p>}
          <motion.button
            type="button"
            className="continue-btn"
            onClick={handleContinue}
            disabled={!selectedRole || submitting || (googleSignup && !privacyAccepted)}
            style={selectedRole ? {} : { opacity: 0.5, cursor: 'not-allowed' }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.02, duration: 0.35 }}
            whileHover={selectedRole ? { y: -3, scale: 1.01 } : {}}
            whileTap={selectedRole ? { scale: 0.97 } : {}}
          >
            {submitting ? 'Creating account…' : googleSignup ? 'Create account' : 'Continue'} <ArrowRight size={24} />
          </motion.button>

          <motion.p
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.12, duration: 0.35 }}
            style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary, #64748b)' }}
          >
            Already have an account?{' '}
            <Link to="/login" onClick={() => sessionStorage.removeItem('googleRegistrationToken')} style={{ color: 'var(--accent, #2563eb)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </motion.section>
    </main>
  )
}

export default RoleSelection
