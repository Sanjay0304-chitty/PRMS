import { useEffect, useRef, useState } from 'react'
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
import { userApi } from '../api/user'
import { propertyApi } from '../api/property'
import './AdminLayout.css'

function getTopbarTitle(activePage) {
  const titles = {
    dashboard: 'Admin Dashboard',
    notifications: 'Notification Center',
    users: 'User Management',
    properties: 'Property Management',
    bookings: 'Rental Applications',
    viewings: 'Viewing Appointments',
    finance: 'Finance Console',
    maintenance: 'Maintenance Center',
    messages: 'Admin Messages',
    reports: 'Reports & Audit',
    categories: 'Category Management',
    'audit-logs': 'Audit Logs',
    settings: 'Admin Settings',
    customizer: 'System Preferences',
    privacy: 'Privacy & Personal Data',
    'privacy-requests': 'Privacy Requests',
    retention: 'Data Retention',
    'breach-register': 'Data Breach Register',
    help: 'Admin Help Center',
  }
  return titles[activePage] || 'Admin Dashboard'
}

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { name: brandName, logoUrl: brandLogo } = useBranding()

  const role = user?.role || 'Admin'
  const navItems = buildNavItems(role)
  const activePage = resolveActivePage(location.pathname, role)

  function safeNavigate(path) {
    if (location.pathname !== path) navigate(path)
  }

  const [globalSearch, setGlobalSearch] = useState('')
  const [searchResults, setSearchResults] = useState({ users: [], properties: [] })
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchBoxRef = useRef(null)

  useEffect(() => {
    const q = globalSearch.trim()
    if (!q) {
      setSearchResults({ users: [], properties: [] })
      setSearchOpen(false)
      return
    }
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const [usersRes, propsRes] = await Promise.all([
          userApi.list({ search: q, limit: 4 }),
          propertyApi.list({ search: q, limit: 4 }),
        ])
        setSearchResults({
          users: usersRes?.data?.data ?? [],
          properties: propsRes?.data?.data ?? [],
        })
        setSearchOpen(true)
      } catch {
        setSearchResults({ users: [], properties: [] })
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [globalSearch])

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function goToUser(user) {
    setSearchOpen(false)
    setGlobalSearch('')
    navigate(`/admin/users?search=${encodeURIComponent(user.email || user.full_name || '')}`)
  }

  function goToProperty(property) {
    setSearchOpen(false)
    setGlobalSearch('')
    navigate(`/admin/properties/edit/${property.id}`)
  }

  function handleLogout() {
    logout(navigate)
  }

  return (
    <main className="admin-layout-shell" data-customize-id="global.page">
      <aside className="admin-layout-sidebar" data-customize-id="global.sidebar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.key
          return (
            <motion.button
              type="button"
              key={item.key}
              className={`admin-layout-side-btn ${isActive ? 'active' : ''}`}
              onClick={() => safeNavigate(item.path)}
              title={item.label}
              whileTap={{ scale: 0.96 }}
            >
              <Icon size={25} />
              <span>{item.label}</span>
            </motion.button>
          )
        })}

        <div className="admin-layout-side-spacer"></div>

        <motion.button
          type="button"
          className={`admin-layout-side-btn ${activePage === 'help' ? 'active' : ''}`}
          onClick={() => safeNavigate('/admin/help')}
          title="Help"
          whileTap={{ scale: 0.96 }}
        >
          <CircleHelp size={24} />
          <span>Help</span>
        </motion.button>

        <motion.button
          type="button"
          className="admin-layout-side-btn logout"
          onClick={handleLogout}
          title="Logout"
          whileTap={{ scale: 0.96 }}
        >
          <LogOut size={24} />
          <span>Logout</span>
        </motion.button>
      </aside>

      <section className="admin-layout-main" data-customize-id="global.content">
        <header className="admin-layout-topbar" data-customize-id="global.header">
          <div className="admin-layout-brand" onClick={() => safeNavigate('/admin')} data-customize-id="global.brand">
            {brandLogo && <img src={brandLogo} alt="" className="admin-layout-brand-logo" />}
            <h2 data-customize-id="global.brand.title">{brandName}</h2>
            <span></span>
            <p data-customize-id="global.brand.subtitle">{getTopbarTitle(activePage)}</p>
          </div>

          <div className="admin-layout-search" data-customize-id="global.search" ref={searchBoxRef}>
            <Search size={22} />
            <input
              type="text"
              placeholder="Search users, properties..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => { if (globalSearch.trim()) setSearchOpen(true) }}
            />
            {searchOpen && (
              <div className="admin-layout-search-dropdown">
                {searchLoading ? (
                  <div className="admin-layout-search-empty">Searching...</div>
                ) : !searchResults.users.length && !searchResults.properties.length ? (
                  <div className="admin-layout-search-empty">No results for "{globalSearch}"</div>
                ) : (
                  <>
                    {searchResults.users.length > 0 && (
                      <div className="admin-layout-search-group">
                        <span className="admin-layout-search-label">Users</span>
                        {searchResults.users.map((u) => (
                          <button key={u.id} type="button" onClick={() => goToUser(u)}>
                            <span className="admin-layout-search-title">{u.full_name || 'Unnamed'}</span>
                            <span className="admin-layout-search-sub">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.properties.length > 0 && (
                      <div className="admin-layout-search-group">
                        <span className="admin-layout-search-label">Properties</span>
                        {searchResults.properties.map((p) => (
                          <button key={p.id} type="button" onClick={() => goToProperty(p)}>
                            <span className="admin-layout-search-title">{p.title}</span>
                            <span className="admin-layout-search-sub">{p.address}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="admin-layout-top-actions" data-customize-id="global.top-actions">
            <NotificationDropdown />
            <ThemeSwitcher />
            <ProfileDropdown prefix="/admin" />
          </div>
        </header>

        <div className="admin-layout-content" data-customize-id="global.body">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </section>
    </main>
  )
}

export default AdminLayout
