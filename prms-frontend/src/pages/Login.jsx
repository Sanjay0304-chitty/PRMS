import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../firebase';
import ThemeSwitcher from '../components/ThemeSwitcher';

function Login() {
  const navigate = useNavigate();
  const { login, googleLogin, error, clearError, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (submitting) return;

    clearError();
    setSubmitting(true);

    const result = await login({ email, password }, navigate);

    /* Remember-me: persist refresh token to localStorage longer */
    if (result.success && remember) {
      /* token already stored by login() — kept in localStorage */
    }

    setSubmitting(false);
  }

  /* AUTH-009: Google OAuth login handler */
  async function handleGoogleLogin() {
    clearError();
    try {
      const googleAuth = await signInWithGoogle();
      await googleLogin(googleAuth,navigate);
    } 
    catch (err) {
      console.error('Google login failed', err);
    }
  }

  return (
    <main className="login-page" data-customize-id="global.page">
      <motion.section
        className="login-left"
        initial={false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <motion.div
          className="brand-small"
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        >
          <Building2 size={28} />
          <span>PRMS</span>
        </motion.div>

        <div className="login-hero-content">
          <motion.div
            className="purple-line"
            initial={false}
            animate={{ width: 150, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.55, ease: 'easeOut' }}
          ></motion.div>

          <motion.h1
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.55 }}
          >
            Master Your Real Estate Ecosystem.
          </motion.h1>

          <motion.p
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.55 }}
          >
            Join over 5,000 property managers and investors who trust PRMS for
            secure, automated, and high-yield property management across Southeast Asia.
          </motion.p>

          <motion.div
            className="trusted-card"
            initial={false}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <div className="avatar-group">
              <motion.div className="avatar" whileHover={{ y: -4 }}>
                JD
              </motion.div>

              <motion.div className="avatar" whileHover={{ y: -4 }}>
                MC
              </motion.div>

              <motion.div className="avatar" whileHover={{ y: -4 }}>
                SA
              </motion.div>
            </div>

            <span>Trusted by regional leaders</span>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="login-right"
        initial={false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <div className="login-theme-toggle">
          <ThemeSwitcher />
        </div>

        <motion.div
          className="login-form-box"
          initial={false}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.55, ease: 'easeOut' }}
        >
          <motion.h2
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.35 }}
          >
            Welcome Back
          </motion.h2>

          <motion.p
            className="form-subtitle"
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.35 }}
          >
            Log in to manage your property portfolio.
          </motion.p>

          <form onSubmit={handleSubmit}>
            <motion.div
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.46, duration: 0.35 }}
            >
              <label>Email Address</label>

              <div className="input-box">
                <Mail size={22} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </motion.div>

            <motion.div
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.54, duration: 0.35 }}
            >
              <label>Password</label>

              <div className="input-box">
                <LockKeyhole size={22} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <span
                  className="input-right-icon"
                  onClick={() => setShowPassword((v) => !v)}
                  role="button"
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </span>
              </div>
            </motion.div>

            <motion.div
              className="form-row"
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.62, duration: 0.35 }}
            >
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>

              <Link to="/forgot-password">Forgot Password?</Link>
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                className="login-error"
                role="alert"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="primary-btn"
              disabled={submitting || loading}
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.35 }}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              {submitting ? 'Signing in...' : 'Sign In'} <LogIn size={20} />
            </motion.button>

            <motion.div
              className="divider"
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.35 }}
            >
              <span></span>
              <p>OR CONTINUE WITH</p>
              <span></span>
            </motion.div>

            <motion.div
              className="social-row"
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.88, duration: 0.35 }}
            >
              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                Google
              </motion.button>
            </motion.div>

            <motion.p
              className="signup-text"
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.96, duration: 0.35 }}
            >
              Don&apos;t have an account? <Link to="/register">Sign up for free</Link>
            </motion.p>
          </form>
        </motion.div>
      </motion.section>
    </main>
  );
}

export default Login;
