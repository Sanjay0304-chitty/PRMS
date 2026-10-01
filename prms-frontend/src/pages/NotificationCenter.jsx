import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Mail,
  MailOpen,
  CalendarClock,
  Wrench,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Search,
} from 'lucide-react';
import { communicationApi } from '../api/communication';
import './NotificationCenter.css';

const TYPE_ICONS = {
  maintenance: Wrench,
  payment: DollarSign,
  message: MessageSquare,
  system: Bell,
  alert: AlertTriangle,
  booking: CalendarClock,
  default: Bell,
};

const TYPE_COLORS = {
  maintenance: '#3b82f6',
  payment: '#10b981',
  message: '#8b5cf6',
  system: '#6b7280',
  alert: '#ef4444',
  booking: '#f59e0b',
};

function NotificationCenter() {
  const tabs = [
    { key: 'all', label: 'All', icon: Bell },
    { key: 'unread', label: 'Unread', icon: Mail },
    { key: 'read', label: 'Read', icon: MailOpen },
  ];
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    const filterMap = {
      all: {},
      unread: { isRead: false },
      read: { isRead: true },
    };
    const loadNotifications = () => {
      communicationApi.getNotifications(filterMap[activeTab] || {})
        .then((res) => {
          const items = res.data?.data || res.data || [];
          if (!cancelled) setNotifications(Array.isArray(items) ? items : []);
        })
        .catch(() => { /* ignore */ })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeTab]);

  const handleMarkAsRead = async (id) => {
    try {
      await communicationApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await communicationApi.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id) => {
    try {
      await communicationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    }
  };

  const filtered = notifications.filter(
    (n) =>
      !search ||
      (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.message || '').toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (not) => {
    const Icon = TYPE_ICONS[not.type] || TYPE_ICONS.default;
    return <Icon size={18} style={{ color: TYPE_COLORS[not.type] || '#6b7280' }} />;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="notif-center-loading">
        <Bell size={32} className="notif-loading-icon" />
        <p>Loading notifications…</p>
      </div>
    );
  }

  return (
    <div className="notification-center">
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-left">
          <Bell size={24} />
          <h2>Notification Center</h2>
          {unreadCount > 0 && (
            <span className="notif-unread-count">{unreadCount}</span>
          )}
        </div>
        <button
          className="notif-mark-all-btn"
          onClick={handleMarkAllAsRead}
          type="button"
          title="Mark all as read"
        >
          <CheckCheck size={16} />
          Mark All Read
        </button>
      </div>

      {/* Tabs */}
      <div className="notif-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`notif-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="notif-search-row">
        <Search size={16} className="notif-search-icon" />
        <input
          type="text"
          className="notif-search"
          placeholder="Search notifications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="notif-list">
        {filtered.length === 0 ? (
          <div className="notif-empty">
            <Bell size={48} className="notif-empty-icon" />
            <p>No notifications found</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((not) => {
              const IconComp = getNotificationIcon(not);
              return (
                <motion.div
                  key={not.id}
                  className={`notif-item ${not.isRead ? 'notif-read' : 'notif-unread'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {/* Left indicator */}
                  {!not.isRead && <div className="notif-unread-bar" />}

                  {/* Type icon */}
                  <div className="notif-type-icon">{IconComp}</div>

                  {/* Content */}
                  <div className="notif-content" onClick={() => !not.isRead && handleMarkAsRead(not.id)}>
                    <div className="notif-title-row">
                      <span className="notif-title">{not.title}</span>
                      <span className="notif-time">{formatTime(not.created_at)}</span>
                    </div>
                    <div className="notif-message">{not.message}</div>
                    <div className="notif-meta">
                      <span className="notif-type-badge">
                        {not.type || 'system'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="notif-actions">
                    {!not.isRead && (
                      <button
                        type="button"
                        className="notif-action-btn notif-read-btn"
                        onClick={() => handleMarkAsRead(not.id)}
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="notif-action-btn notif-delete-btn"
                      onClick={() => handleDelete(not.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default NotificationCenter;
