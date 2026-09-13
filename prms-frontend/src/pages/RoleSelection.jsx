import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Home,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRegistration } from '../contexts/RegistrationContext';
import { roleToPath } from '../config/routes';

function RoleSelection() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const { setSelectedRole: setContextRole } = useRegistration();
  /* Issue #4: Default to null so user must explicitly pick a role */
  const [selectedRole, setSelectedRole] = useState(null);

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

    /* Issue #3: Check if this is a Google onboarding flow (already authenticated) */
    const isOnboarding = localStorage.getItem('prmsOnboarding') === 'true';

    if (isOnboarding) {
      /* Update user's role from default Tenant to selected role */
      await updateProfile({ role: title });
      /* Clear onboarding flags */
      localStorage.removeItem('prmsOnboarding');
      /* Navigate to the selected role's dashboard */
      navigate(roleToPath(title));
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
            Join Malaysia&apos;s most trusted property platform.
          </motion.h1>

          <motion.p
            initial={{ y: 34, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.55 }}
          >
            Join thousands of landlords, tenants, and agents simplifying property
            management with secure workflows and seamless automation.
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
              <p>Account</p>
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

          <motion.button
            type="button"
            className="continue-btn"
            onClick={handleContinue}
            disabled={!selectedRole}
            style={selectedRole ? {} : { opacity: 0.5, cursor: 'not-allowed' }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.02, duration: 0.35 }}
            whileHover={selectedRole ? { y: -3, scale: 1.01 } : {}}
            whileTap={selectedRole ? { scale: 0.97 } : {}}
          >
            Continue <ArrowRight size={24} />
          </motion.button>

          <motion.p
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.12, duration: 0.35 }}
            style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary, #64748b)' }}
          >
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent, #2563eb)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </motion.section>
    </main>
  )
}

export default RoleSelection