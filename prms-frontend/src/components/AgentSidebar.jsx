import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Settings,
  Wrench,
  CalendarDays,
  User,
  Tag,
  Bell,
} from 'lucide-react';
import { clsx } from 'clsx';
import './AgentSidebar.css';

const AgentSidebar = () => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/agent/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: 'Assigned Properties',
      path: '/agent/properties',
      icon: <Home size={20} />,
    },
    {
      name: 'Bookings',
      path: '/agent/bookings',
      icon: <CalendarDays size={20} />,
    },
    {
      name: 'Maintenance',
      path: '/agent/maintenance',
      icon: <Wrench size={20} />,
    },
    {
      name: 'My Categories',
      path: '/agent/categories',
      icon: <Tag size={20} />,
    },
    {
      name: 'Notifications',
      path: '/agent/notifications',
      icon: <Bell size={20} />,
    },
    {
      name: 'Profile',
      path: '/agent/profile',
      icon: <User size={20} />,
    },
    {
      name: 'Settings',
      path: '/agent/settings',
      icon: <Settings size={20} />,
    },
  ];

  return (
    <div className="agent-sidebar">
      <div className="sidebar-header">
        <h2>Agent Portal</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={clsx(
                  'sidebar-link',
                  location.pathname.startsWith(item.path) && 'active'
                )}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-text">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default AgentSidebar;
