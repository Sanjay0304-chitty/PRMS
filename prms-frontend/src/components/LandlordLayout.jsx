import { useState } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CircleHelp,
  LogOut,
  Search,
} from 'lucide-react'
import PageTransition from './PageTransition'
import { useAuth } from '../contexts/AuthContext'
import { useBranding } from '../contexts/BrandingContext'
import { buildNavItems, resolveActivePage } from './NavigationConfig'
import NotificationDropdown from './NotificationDropdown'
import ProfileDropdown from './ProfileDropdown'
import ThemeSwitcher from './ThemeSwitcher'
import './LandlordLayout.css'

function getTopbarTitle(activePage) {
  const titles = {
    dashboard: 'Portfolio Overview',
    notifications: 'Notification Center',
    properties: 'Property Management',
    bookings: 'Rental Applications',
    viewings: 'Viewing Appointments',
    finance: 'Finance Console',
    heatmap: 'Market Heatmap',
    categories: 'Category Management',
    maintenance: 'Maintenance Center',
    messages: 'Messages',
    profile: 'Profile',
    settings: 'Settings',
    customizer: 'System Preferences',
    privacy: 'Privacy & Personal Data',
    help: 'Help Center',
  }
  return titles[activePage] || 'Landlord Portal'
}

function LandlordLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { name: brandName, logoUrl: brandLogo } = useBranding()
  const [searchTerm, setSearchTerm] = useState('')

  const role = user?.role || 'Landlord'
  const navItems = buildNavItems(role)
  const activePage = resolveActivePage(location.pathname, role)

  function safeNavigate(path) {
    if (location.pathname !== path) navigate(path)
  }

  function handleSearch(event) {
    event.preventDefault()
    const query = searchTerm.trim()
    if (!query) return
    navigate(`/landlord/properties?search=${encodeURIComponent(query)}`)
  }

  function handleLogout() {
    logout(navigate)
  }

  return (
    <main className="landlord-layout-shell" data-customize-id="global.page">
      <aside className="landlord-layout-sidebar" data-customize-id="global.sidebar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.key
          return (
            <motion.button
              type="button"
              key={item.key}
              className={`landlord-layout-side-btn ${isActive ? 'active' : ''}`}
              onClick={() => safeNavigate(item.path)}
              title={item.label}
              whileTap={{ scale: 0.96 }}
            >
              <Icon size={25} />
              <span>{item.label}</span>
            </motion.button>
          )
        })}

        <div className="landlord-layout-side-spacer"></div>

        <motion.button
          type="button"
          className={`landlord-layout-side-btn ${activePage === 'help' ? 'active' : ''}`}
          onClick={() => safeNavigate('/landlord/help')}
          title="Help"
          whileTap={{ scale: 0.96 }}
        >
          <CircleHelp size={24} />
          <span>Help</span>
        </motion.button>

        <motion.button
          type="button"
          className="landlord-layout-side-btn logout"
          onClick={handleLogout}
          title="Logout"
          whileTap={{ scale: 0.96 }}
        >
          <LogOut size={24} />
          <span>Logout</span>
        </motion.button>
      </aside>

      <section className="landlord-layout-main" data-customize-id="global.content">
        <header className="landlord-layout-topbar" data-customize-id="global.header">
          <div className="landlord-layout-brand" onClick={() => safeNavigate('/landlord')} data-customize-id="global.brand">
            {brandLogo && <img src={brandLogo} alt="" className="landlord-layout-brand-logo" />}
            <h2 data-customize-id="global.brand.title">{brandName}</h2>
            <span></span>
            <p data-customize-id="global.brand.subtitle">{getTopbarTitle(activePage)}</p>
          </div>

          <form className="landlord-layout-search" data-customize-id="global.search" onSubmit={handleSearch}>
            <Search size={22} />
            <input
              type="search"
              placeholder="Search portfolios..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Search properties"
            />
          </form>

          <div className="landlord-layout-actions" data-customize-id="global.top-actions">
            <NotificationDropdown />
            <ThemeSwitcher />
            <ProfileDropdown prefix="/landlord" />
          </div>
        </header>

        <div className="landlord-layout-content" data-customize-id="global.body">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </section>
    </main>
  )
}

export default LandlordLayout
