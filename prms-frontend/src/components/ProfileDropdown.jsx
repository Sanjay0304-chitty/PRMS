import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFullUrl } from '../config/apiBaseUrl';
import './ProfileDropdown.css';

function ProfileDropdown({ prefix }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.full_name || user?.name || user?.email || 'User';

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : displayName.slice(0, 2).toUpperCase();

  // Resolve profile image URL to backend public path
  const profileImgUrl = user?.profile_img_url ? getFullUrl(user.profile_img_url) : null;

  function safeNavigate(path) {
    setOpen(false);
    navigate(path);
  }

  function handleLogout() {
    setOpen(false);
    logout(navigate);
  }

  const menuItems = [
    { label: 'Profile', icon: User, path: `${prefix}/profile` },
    { label: 'Settings', icon: Settings, path: `${prefix}/settings` },
  ];

  return (
    <div className={`profile-dropdown-wrap${open ? ' open' : ''}`}>
      <button
        type="button"
        className="profile-dropdown-toggle"
        onClick={() => setOpen((v) => !v)}
        title="Account menu"
      >
        <div className="profile-dropdown-info">
          <span className="profile-dropdown-name">{displayName}</span>
          <span className="profile-dropdown-role">{user?.role || 'Tenant'}</span>
        </div>
        <div className="profile-dropdown-avatar-box">
          {profileImgUrl ? (
            <img
              src={profileImgUrl}
              alt={displayName}
              className="profile-dropdown-avatar"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          {!profileImgUrl && initials}
          <ChevronDown size={14} className="profile-chevron" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="profile-dropdown-menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="profile-dropdown-item"
                  onClick={() => safeNavigate(item.path)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="profile-dropdown-divider" />
            <button
              type="button"
              className="profile-dropdown-item logout-item"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfileDropdown;
