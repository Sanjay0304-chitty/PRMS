import { useEffect, useState, useMemo } from 'react'
import { Check, X, Bell } from 'lucide-react'
import { adminApi } from '../api/admin'
import './NotificationDropdown.css'

export default function NotificationDropdown() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadNotifs() {
      try {
        const { data } = await adminApi.getNotifications()
        const items = data?.data || data || []
        if (!cancelled) setNotifs(items)
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadNotifs()
    return () => { cancelled = true }
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      adminApi.getNotifications()
        .then(res => {
          const items = res?.data?.data || res?.data || []
          setNotifs(items)
        })
        .catch(() => { /* ignore */ })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh when dropdown is opened
  useEffect(() => {
    if (!opened) return
    const timeout = setTimeout(() => {
      adminApi.getNotifications()
        .then(res => {
          const items = res?.data?.data || res?.data || []
          setNotifs(items)
        })
        .catch(() => { /* ignore */ })
    }, 500)
    return () => clearTimeout(timeout)
  }, [opened])

  async function handleMarkAsRead(id) {
    try {
      await adminApi.markAsRead(id)
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await adminApi.markAllAsRead()
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true }) ))
    } catch {
      for (const n of notifs) handleMarkAsRead(n.id)
    }
  }

  async function handleDismiss(id) {
    try {
      await adminApi.dismiss(id)
      setNotifs((prev) => prev.filter((n) => n.id !== id))
    } catch {
      setNotifs((prev) => prev.filter((n) => n.id !== id))
    }
  }

  const unread = notifs.filter((n) => !n.isRead).length

  // Stable keys derived from notification id; fallback to index for safety
  const notifsWithKey = useMemo(() => notifs.map((n, i) => ({ ...n, _key: n.id || `notif-${i}` })), [notifs])

  return (
    <div className="notification-dropdown-root">
      <button
        type="button"
        className="notification-toggle"
        onClick={() => setOpened((v) => !v)}
        title={opened ? 'Close notifications' : 'Open notifications'}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: unread > 0 ? 'var(--error-state, #ef4444)' : 'transparent',
            position: 'absolute',
            top: -2,
            right: -2,
          }}
        />
        <Bell size={18} />
      </button>

      {opened && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span>Notifications</span>
            <span className="notification-badge">{unread}</span>
          </div>

          {loading && notifs.length === 0 ? (
            <p className="notification-empty">Loading...</p>
          ) : notifs.length === 0 ? (
            <p className="notification-empty">All caught up!</p>
          ) : (
            <>
              <button className="notification-mark-all" type="button" onClick={handleMarkAllRead}>
                Mark all as read
              </button>

              <ul className="notification-list">
                {notifsWithKey.slice(0, 10).map((n) => (
                  <li
                    className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                    key={n._key}
                  >
                    <div className="notification-item-main">
                      {n.title && <strong>{n.title}</strong>}
                      {n.message && <p>{n.message}</p>}
                      {n.created_at && (
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                      )}
                    </div>

                    <div className="notification-item-actions">
                      {!n.isRead && (
                        <button type="button" title="Mark read" onClick={() => handleMarkAsRead(n.id)}>
                          <Check size={16} />
                        </button>
                      )}
                      <button type="button" title="Dismiss" onClick={() => handleDismiss(n.id)}>
                        <X size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
