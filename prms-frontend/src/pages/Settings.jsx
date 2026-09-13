import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../config/routes'
import ChangePasswordModal from '../components/ChangePasswordModal'
import {
  Bell,
  Building2,
  Settings as SettingsIcon,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import './Settings.css'

function getProfilePath(role) {
  if (!role) return ROUTES.admin.profile
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return ROUTES.admin.profile
  if (lower.includes('landlord')) return ROUTES.landlord.profile
  if (lower.includes('tenant')) return ROUTES.tenant.profile
  if (lower.includes('agent')) return ROUTES.agent.profile
  return ROUTES.admin.profile
}

function getNotificationsPath(role) {
  if (!role) return ROUTES.admin.notifications
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return ROUTES.admin.notifications
  if (lower.includes('landlord')) return ROUTES.landlord.notifications
  if (lower.includes('tenant')) return ROUTES.tenant.notifications
  if (lower.includes('agent')) return ROUTES.agent.notifications
  return ROUTES.admin.notifications
}

function getCustomizerPath(role) {
  if (!role) return ROUTES.admin.customizer
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return ROUTES.admin.customizer
  if (lower.includes('landlord')) return ROUTES.landlord.customizer
  if (lower.includes('tenant')) return ROUTES.tenant.customizer
  if (lower.includes('agent')) return ROUTES.agent.customizer
  return ROUTES.admin.customizer
}

function getPrivacyPath(role) {
  if (!role) return '/admin/privacy'
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return '/admin/privacy'
  if (lower.includes('landlord')) return '/landlord/privacy'
  if (lower.includes('tenant')) return '/tenant/privacy'
  if (lower.includes('agent')) return '/agent/privacy'
  return '/admin/privacy'
}

function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [securityOpen, setSecurityOpen] = useState(false)

  const profilePath = getProfilePath(user?.role)
  const notificationsPath = getNotificationsPath(user?.role)
  const customizerPath = getCustomizerPath(user?.role)
  const privacyPath = getPrivacyPath(user?.role)

  return (
    <div className="admin-content" data-customize-id="global.content">
      <div className="admin-title-row">
        <div>
          <h1>Settings</h1>
          <p>Manage account preferences, security, notifications, and system options.</p>
        </div>
      </div>

      <section className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-icon purple">
            <SettingsIcon size={28} />
          </div>

          <h2>Account Settings</h2>
          <p>Update profile details, contact number, and profile photo.</p>

          <button type="button" onClick={() => navigate(profilePath)}>Manage Account</button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon blue">
            <Bell size={28} />
          </div>

          <h2>Notification Settings</h2>
          <p>Control alerts for rent, bookings, maintenance updates, and reminders.</p>

          <button type="button" onClick={() => navigate(notificationsPath)}>Manage Notifications</button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon red">
            <ShieldCheck size={28} />
          </div>

          <h2>Security Settings</h2>
          <p>Change your password to keep your account secure.</p>

          <button type="button" onClick={() => setSecurityOpen(true)}>Manage Security</button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon green">
            <Building2 size={28} />
          </div>

          <h2>System Preferences</h2>
          <p>Personalize your own colors, logo, and company name.</p>

          <button type="button" onClick={() => navigate(customizerPath)}>Manage Preferences</button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon red">
            <Lock size={28} />
          </div>

          <h2>Privacy & Personal Data</h2>
          <p>View your stored data, manage consent, and request access, correction or deletion.</p>

          <button type="button" onClick={() => navigate(privacyPath)}>Manage Privacy</button>
        </div>
      </section>

      <ChangePasswordModal isOpen={securityOpen} onClose={() => setSecurityOpen(false)} />
    </div>
  )
}

export default Settings
