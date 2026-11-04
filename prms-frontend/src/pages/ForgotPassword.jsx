import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, LockKeyhole, CheckCircle2, Building2, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { isPasswordStrong } from '../utils/validators';
import './ForgotPassword.css';

function ForgotPassword() {
  const navigate = useNavigate();

  /** Step state: 1 = email form, 2 = otp form, 3 = password form, 4 = success toast */
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const [loading, setLoading] = useState(false);

  /* ── Step 1: submit email → get OTP code ── */
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      const res = await authApi.forgotPassword({ email: normalized });
      if (res.data.success) {
        setEmail(normalized); setResetToken(''); setOtpInput(''); setCooldown(30);
        setNotice('If this address belongs to an active account, a code has been sent.');
        setStep(2);
      } else {
        setError(res.data.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: verify OTP only ── */
  async function resendCode() {
    if (loading || cooldown) return;
    setLoading(true); setError(''); setNotice('');
    try {
      await authApi.forgotPassword({ email });
      setOtpInput(''); setResetToken(''); setCooldown(30);
      setNotice('If this address belongs to an active account, a new code has been sent. Use only the latest code.');
    } catch (err) { setError(err.response?.data?.error?.message || 'Unable to resend the code. Please try again.'); }
    finally { setLoading(false); }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email, otp: otpInput });
      if (res.data.success && res.data.data?.resetToken) {
        setNotice('');
        setResetToken(res.data.data.resetToken);
        setStep(3);
      } else {
        setError(res.data.message || 'Invalid OTP.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 3: set new password ── */
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong(newPassword)) {
      setError('Password must be strong. It must include at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email,
        resetToken,
        newPassword,
        confirmPassword,
      });
      if (res.data.success) {
        setStep(4);
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(res.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="forgot-page" data-customize-id="global.page">
      <motion.section
        className="forgot-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Link to="/" className="recovery-brand"><Building2 size={26} aria-hidden="true" /> PRMS</Link>
        <Link to="/login" className="back-link">
          <ArrowLeft size={18} />
          Back to Login
        </Link>

        <div className="recovery-symbol"><ShieldCheck size={30} aria-hidden="true" /></div>
        <ol className="recovery-steps" aria-label="Password recovery progress">{['Email', 'Verify code', 'New password'].map((label, index) => <li key={label} className={step >= index + 1 ? 'is-active' : ''} aria-current={step === index + 1 ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
        <motion.h1 className="forgot-title">{step === 1 ? 'Reset your password' : step === 2 ? 'Check your inbox' : step === 3 ? 'Choose a new password' : 'You’re ready to sign in'}</motion.h1>
        <motion.p className="forgot-subtitle">
          {step === 1 && "Enter your email and we'll send you a verification code."}
          {step === 2 && "Enter your latest 6-digit code. Codes expire 5 minutes after they are requested."}
          {step === 3 && "Set your new password."}
          {step === 4 && "Your password has been reset successfully."}
        </motion.p>

        {notice && <p className="recovery-notice" role="status">{notice}</p>}
        <AnimatePresence mode="wait">
          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <motion.form
              key="step1"
              onSubmit={handleEmailSubmit}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
            >
              <label htmlFor="recovery-email">Email Address</label>
              <div className="input-box">
                <Mail size={22} />
                <input
                  id="recovery-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
            </motion.form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{ textAlign: 'center', padding: '16px 12px', background: 'var(--surface-container-low, #f8fafc)', borderRadius: 12, marginBottom: 16 }}>
                <Mail size={32} style={{ color: 'var(--primary-color, #4f46e5)', marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: '0 0 4px' }}>
                  Recovery email address:
                </p>
                <strong style={{ fontSize: 15, color: 'var(--on-surface, #1e293b)' }}>{email}</strong>
              </div>
              <p className="otp-hint" style={{ marginBottom: 14 }}>
                Check your inbox and spam folder. Requesting a new code invalidates the previous code.
              </p>

              <form onSubmit={handleOtpSubmit}>
                <label htmlFor="recovery-code">Verification Code</label>
                <div className="input-box">
                  <LockKeyhole size={22} />
                  <input
                    type="text"
                    id="recovery-code"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify code'}
                </button>
              </form>
              <div className="recovery-secondary"><button type="button" disabled={loading || cooldown > 0} onClick={resendCode}>{cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}</button><button type="button" disabled={loading} onClick={() => { setStep(1); setError(''); setNotice(''); setResetToken(''); setOtpInput(''); }}>Use another email</button></div>
            </motion.div>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 3 && (
            <motion.form
              key="step3"
              onSubmit={handlePasswordSubmit}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <label htmlFor="recovery-password">New Password</label>
              <div className="input-box">
                <LockKeyhole size={22} />
                <input
                  type="password"
                  id="recovery-password"
                  placeholder="Strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <PasswordStrengthMeter password={newPassword} />

              <label htmlFor="recovery-confirm">Confirm Password</label>
              <div className="input-box">
                <LockKeyhole size={22} />
                <input
                  type="password"
                  id="recovery-confirm"
                  placeholder="Re-enter strong password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className="primary-btn"
                disabled={loading || !isPasswordStrong(newPassword)}
                title={!isPasswordStrong(newPassword) ? 'Password must be strong' : 'Reset Password'}
              >
                {loading ? 'Saving...' : 'Reset Password'}
              </button>
            </motion.form>
          )}

          {/* ── Step 4: Success ── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="success-box">
                <CheckCircle2 size={48} className="success-icon" />
                <p>Password changed.</p>
                <p className="redirect-text">Redirecting to login...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 1 && <aside className="recovery-help"><strong>Using a demonstration account?</strong><p>Demo addresses such as @prms.com may not have an inbox. Use the supplied test credentials or ask the project administrator for help. There is no password-reset bypass for demo accounts.</p></aside>}
        {/* Error banner */}
        {error && (
          <motion.div
            className="login-error"
            role="alert"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}
      </motion.section>
    </main>
  );
}

export default ForgotPassword;
