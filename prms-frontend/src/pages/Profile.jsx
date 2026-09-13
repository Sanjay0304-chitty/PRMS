import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import {
  Camera, X, User, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader2, Pencil, Save,
} from 'lucide-react';
import './Profile.css';

function AvatarFallback({ name, size = 96 }) {
  const letter = (name || '?')[0].toUpperCase();
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div className="avatar-fallback" style={{ width: size, height: size, background: colors[idx] }}>
      {letter}
    </div>
  );
}

/* ------ Helpers ------ */

function StatusBadge({ type, message }) {
  const ok = type === 'success';
  return message ? (
    <div className={`profile-status ${ok ? 'profile-status--success' : 'profile-status--error'}`}>
      {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span>{message}</span>
    </div>
  ) : null;
}

function PwdToggle({ show, onToggle }) {
  return (
    <button type="button" className="password-toggle" onClick={onToggle}>
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

function PwdStrength({ value }) {
  if (!value) return null;
  const s = [value.length >= 8, /[A-Z]/.test(value), /[a-z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)]
    .filter(Boolean).length;
  const cls = s <= 2 ? 'weak' : s <= 3 ? 'fair' : s <= 4 ? 'good' : 'strong';
  return <div className={`password-strength ${cls}`}>{s * 20}%</div>;
}

/* ------ Avatar upload ------ */

function SectionAvatar({ user, uploadImg }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const ref = useRef();

  const url = user?.profile_img_url ? `${getApiBaseUrl()}${user.profile_img_url}` : null;

  const pick = (file) => {
    if (!file) return;
    const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
    if (!ok) return setMsg({ type: 'error', text: 'Only JPEG / PNG / GIF / WebP allowed' });
    if (file.size > 5 * 1024 * 1024) return setMsg({ type: 'error', text: 'File must be under 5 MB' });
    setMsg({ type: '', text: '' });
    const r = new FileReader();
    r.onload = () => setPreview(r.result);
    r.readAsDataURL(file);
    setLoading(true);
    uploadImg(file)
      .then(() => setMsg({ type: 'success', text: 'Profile picture updated' }))
      .catch((e) => setMsg({ type: 'error', text: e || 'Upload failed' }))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onAvatarChange = useCallback((file) => pick(file), [uploadImg]);

  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); pick(e.dataTransfer.files[0]); };

  return (
    <div className="profile-section" onDragOver={(e) => { e.preventDefault(); }} onDrop={onDrop}>
      <h3 className="section-title">Profile Picture</h3>
      <div className="avatar-upload" onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <input
          ref={ref}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="avatar-upload--input"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <div className="avatar-upload--preview">
          {preview || url ? (
            <img src={preview || url} alt="Preview" className="avatar-upload--img" />
          ) : (
            <AvatarFallback name={user?.full_name} size={96} />
          )}
          <div className="avatar-upload--overlay">
            <Camera size={20} /><span>{loading ? 'Uploading…' : 'Change'}</span>
          </div>
          {loading && <Loader2 size={16} className="avatar-upload--spinner spin" />}
        </div>
      </div>
      <StatusBadge type={msg.type} message={msg.text} />
    </div>
  );
}

/* ====== Main Page ====== */

export default function ProfilePage() {
  const { user, updateProfile, uploadProfileImage, changePassword, setPassword } = useAuth();

  /* --- Edit fields --- */
  const [field, setField] = useState(null); // 'name' | 'phone'
  const [tmp, setTmp] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const start = (f) => {
    setTmp({ full_name: user?.full_name || '', phone: user?.phone || '' });
    setField(f);
    setMsg({ type: '', text: '' });
  };
  const save = async (f) => {
    const body = f === 'name' ? { full_name: tmp.full_name } : { phone: tmp.phone };
    setSaving(true);
    const r = await updateProfile(body);
    setSaving(false);
    setField(null);
    setMsg(r.success ? { type: 'success', text: 'Updated' } : { type: 'error', text: r.error || 'Failed' });
  };

  /* --- Password --- */
  const hasPwd = user?.hasPassword;
  const [step, setStep] = useState(1); // 1 = current, 2 = new+confirm (only when hasPwd)
  const [cur, setCur] = useState('');
  const [nwd, setNwd] = useState('');
  const [cwd, setCwd] = useState('');
  const [vis, setVis] = useState({ cur: false, nwd: false, cwd: false });
  const [pdl, setPdl] = useState(false);
  const [pmsg, setPmsg] = useState({ type: '', text: '' });

  const doPwd = async () => {
    setPdl(true);
    setPmsg({ type: '', text: '' });
    try {
      if (!hasPwd) {
        // Firebase-only: set password
        if (nwd.length < 6) throw 'Password must be at least 6 characters';
        if (nwd !== cwd) throw 'Passwords do not match';
        const r = await setPassword({ newPassword: nwd });
        if (!r.success) throw r.error;
        setPmsg({ type: 'success', text: 'Password set. You can now log in with email & password.' });
        setNwd(''); setCwd('');
      } else if (step === 1) {
        // Verify current — set to itself to validate without changing
        if (!cur.trim()) throw 'Current password required';
        const r = await changePassword({ currentPassword: cur, newPassword: cur });
        if (!r.success) throw r.error;
        setStep(2);
        setCur('');
        setPmsg({ type: 'success', text: 'Verified. Enter your new password.' });
      } else {
        // Step 2: actual change
        if (!cur.trim()) throw 'Current password required';
        if (nwd.length < 6) throw 'New password must be at least 6 characters';
        if (nwd !== cwd) throw 'Passwords do not match';
        const r = await changePassword({ currentPassword: cur, newPassword: nwd });
        if (!r.success) throw r.error;
        setPmsg({ type: 'success', text: 'Password changed successfully' });
        setCur(''); setNwd(''); setCwd(''); setStep(1);
      }
    } catch (e) {
      setPmsg({ type: 'error', text: e || 'Failed' });
    } finally {
      setPdl(false);
    }
  };

  const resetPwd = () => { setStep(1); setCur(''); setNwd(''); setCwd(''); setPmsg({ type: '', text: '' }); };

  /* ---- Render ---- */
  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Avatar */}
        <SectionAvatar user={user} uploadImg={uploadProfileImage} />

        {/* Account info */}
        <div className="profile-section">
          <h3 className="section-title">Account Information</h3>
          <div className="info-grid">

            <div className="info-field">
              <label className="info-label"><Mail size={16} /> Email</label>
              <div className="info-value info-value--readonly">{user?.email || '—'}</div>
              <span className="info-hint">Email cannot be changed</span>
            </div>

            <div className="info-field">
              <label className="info-label"><User size={16} /> Username</label>
              {field === 'name' ? (
                <div className="info-edit">
                  <input type="text" className="info-input" value={tmp.full_name}
                    onChange={(e) => setTmp({ ...tmp, full_name: e.target.value })} />
                  <div className="info-edit-actions">
                    <button className="info-btn info-btn--save" onClick={() => save('name')} disabled={saving}>
                      {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    </button>
                    <button className="info-btn info-btn--cancel" onClick={() => setField(null)}><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="info-value info-value--editable" onClick={() => start('name')}>
                  <span>{user?.full_name || '—'}</span>
                  <Pencil size={14} className="info-edit-icon" />
                </div>
              )}
            </div>

            <div className="info-field">
              <label className="info-label"><Phone size={16} /> Phone Number</label>
              {field === 'phone' ? (
                <div className="info-edit">
                  <input type="tel" className="info-input" value={tmp.phone}
                    onChange={(e) => setTmp({ ...tmp, phone: e.target.value })}
                    placeholder="Enter phone number" />
                  <div className="info-edit-actions">
                    <button className="info-btn info-btn--save" onClick={() => save('phone')} disabled={saving}>
                      {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    </button>
                    <button className="info-btn info-btn--cancel" onClick={() => setField(null)}><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="info-value info-value--editable" onClick={() => start('phone')}>
                  <span>{user?.phone || '—'}</span>
                  <Pencil size={14} className="info-edit-icon" />
                </div>
              )}
            </div>
          </div>
          <StatusBadge type={msg.type} message={msg.text} />
        </div>

        {/* Password */}
        <div className="profile-section">
          <h3 className="section-title"><Lock size={18} /> {hasPwd ? 'Change Password' : 'Set Password'}</h3>
          <div className="password-card">

            {!hasPwd ? (
              <>
                <p className="password-intro">
                  You signed in with Google. Set a password so you can also log in with email &amp; password.
                </p>
                <div className="pwd-field">
                  <input type={vis.nwd ? 'text' : 'password'} className="info-input"
                    placeholder="New password" value={nwd} onChange={(e) => setNwd(e.target.value)} />
                  <PwdToggle show={vis.nwd} onToggle={() => setVis(s => ({ ...s, nwd: !s.nwd }))} />
                </div>
                <PwdStrength value={nwd} />
                <div className="pwd-field">
                  <input type={vis.cwd ? 'text' : 'password'} className="info-input"
                    placeholder="Repeat new password" value={cwd} onChange={(e) => setCwd(e.target.value)} />
                  <PwdToggle show={vis.cwd} onToggle={() => setVis(s => ({ ...s, cwd: !s.cwd }))} />
                </div>
              </>
            ) : step === 1 ? (
              <>
                <p className="password-intro">Enter your current password to continue.</p>
                <div className="pwd-field">
                  <input type={vis.cur ? 'text' : 'password'} className="info-input"
                    placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />
                  <PwdToggle show={vis.cur} onToggle={() => setVis(s => ({ ...s, cur: !s.cur }))} />
                </div>
              </>
            ) : (
              <>
                <p className="password-intro">Enter your current password again, then choose a new one.</p>
                <div className="pwd-field">
                  <input type={vis.cur ? 'text' : 'password'} className="info-input"
                    placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />
                  <PwdToggle show={vis.cur} onToggle={() => setVis(s => ({ ...s, cur: !s.cur }))} />
                </div>
                <div className="pwd-field">
                  <input type={vis.nwd ? 'text' : 'password'} className="info-input"
                    placeholder="New password" value={nwd} onChange={(e) => setNwd(e.target.value)} />
                  <PwdToggle show={vis.nwd} onToggle={() => setVis(s => ({ ...s, nwd: !s.nwd }))} />
                </div>
                <PwdStrength value={nwd} />
                <div className="pwd-field">
                  <input type={vis.cwd ? 'text' : 'password'} className="info-input"
                    placeholder="Repeat new password" value={cwd} onChange={(e) => setCwd(e.target.value)} />
                  <PwdToggle show={vis.cwd} onToggle={() => setVis(s => ({ ...s, cwd: !s.cwd }))} />
                </div>
              </>
            )}

            <div className="pwd-actions">
              <button className="pwd-btn" onClick={doPwd} disabled={pdl}>
                {pdl ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                {!hasPwd ? 'Set Password' : step === 1 ? 'Verify Password' : 'Change Password'}
              </button>
              {step === 2 && <button className="pwd-btn pwd-btn--secondary" onClick={resetPwd}>Reset</button>}
            </div>
            <StatusBadge type={pmsg.type} message={pmsg.text} />
          </div>
        </div>

      </div>
    </div>
  );
}
