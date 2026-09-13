import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, LockKeyhole, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import './ForgotPassword.css';

function ForgotPassword() {
  const navigate = useNavigate();

  /** Step state: 1 = email form, 2 = otp form, 3 = password form, 4 = success toast */
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Step 1: submit email → get OTP code ── */
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      if (res.data.success) {
        setGeneratedOtp(res.data.data.code);
        setStep(2);
      } else {
        setError(res.data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: verify OTP only ── */
  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email, otp: otpInput });
      if (res.data.success) {
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
    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email,
        otp: otpInput,
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
        <Link to="/login" className="back-link">
          <ArrowLeft size={18} />
          Back to Login
        </Link>

        <motion.h1 className="forgot-title">Forgot Password</motion.h1>
        <motion.p className="forgot-subtitle">
          {step === 1 && "Enter your email and we'll send you a verification code."}
          {step === 2 && "Enter the 6-digit code shown below."}
          {step === 3 && "Set your new password."}
          {step === 4 && "Your password has been reset successfully."}
        </motion.p>

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
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Continue'}
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
              {/* Show generated OTP as large spaced digits */}
              <div className="otp-display">
                {generatedOtp.split('').map((d, i) => (
                  <motion.span
                    key={i}
                    className="otp-digit"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.2 }}
                  >
                    {d}
                  </motion.span>
                ))}
              </div>
              <p className="otp-hint">Enter the code above to verify</p>

              <form onSubmit={handleOtpSubmit}>
                <label>Verification Code</label>
                <div className="input-box">
                  <LockKeyhole size={22} />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </form>
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
              <label>New Password</label>
              <div className="input-box">
                <LockKeyhole size={22} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <label>Confirm Password</label>
              <div className="input-box">
                <LockKeyhole size={22} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="primary-btn" disabled={loading}>
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
