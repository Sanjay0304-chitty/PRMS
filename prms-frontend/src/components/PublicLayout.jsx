import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Building2, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { roleToPath } from '../config/routes';
import ThemeSwitcher from './ThemeSwitcher';
import { getImageUrl } from '../config/imageHelper';
import './PublicLayout.css';

export function PublicHeader({ showBuildingMark = false }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { settings } = useSettings();
  return <header className="public-header" data-customize-id="global.header">
    <Link className="public-brand" to="/">{showBuildingMark ? <Building2 className="public-brand-building" size={28} aria-hidden="true" /> : settings?.branding_logo_url && <img src={getImageUrl(settings.branding_logo_url)} alt="" />}<span>{settings?.branding_site_name || 'PRMS'}</span></Link>
    <button className="public-menu-button" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav id="public-navigation" aria-label="Main navigation" className={open ? 'is-open' : ''} onClick={() => setOpen(false)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
      <NavLink to="/properties">Browse Properties</NavLink>
      <a href="/#landlords">For Landlords</a>
      <NavLink to="/help">Help</NavLink>
      {user ? <Link className="public-primary" to={roleToPath(user.role)}>My Dashboard</Link> : <><Link to="/login">Sign In</Link><Link className="public-primary" to="/role-selection">Create Account</Link></>}
    </nav>
    <ThemeSwitcher />
  </header>;
}

export function PublicFooter() {
  return <footer className="public-footer" data-customize-id="global.footer">
    <div><strong>PRMS</strong><p>Property rentals and management in one place.</p></div>
    <nav aria-label="Footer navigation"><Link to="/properties">Browse Properties</Link><Link to="/help">Help</Link><Link to="/privacy-notice">Privacy Notice</Link><Link to="/terms">Terms and Conditions</Link></nav>
    <small>© {new Date().getFullYear()} PRMS. All rights reserved.</small>
  </footer>;
}
