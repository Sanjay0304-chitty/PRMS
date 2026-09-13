import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { userApi } from '../api/user'
import Modal from '../components/Modal'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  X,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserX,
  UserCheck,
  Shield,
  Save,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import './UserManagement.css'

/* ── Roles & filter defaults ── */
const ROLES = ['Admin', 'Tenant', 'Landlord', 'Agent']

const roleColors = {
  Admin: '#6366f1',
  Landlord: '#f59e0b',
  Tenant: '#10b981',
  Agent: '#8b5cf6',
}

/* ── Page ── */
export default function UserManagement() {
  /* List state */
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  /* Filters */
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [roleFilter, setRoleFilter] = useState('')
  // Default to Active — deactivated/test accounts otherwise clutter the
  // list by default (suspending a user, e.g. via cleanup after testing,
  // never removes them from view). Admin can still switch to "All Status".
  const [statusFilter, setStatusFilter] = useState('true')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  /* Cards */
  const [cards, setCards] = useState([])

  /* Toast */
  const [toast, setToast] = useState(null)

  /* Modal state */
  const [mode, setMode] = useState(null)       // 'add' | 'view' | 'edit' | null
  const [selectedUser, setSelectedUser] = useState(null)

  /* Form fields */
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formFullName, setFormFullName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRole, setFormRole] = useState('Tenant')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  /* ── Helpers ── */
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  /* ── Load users ── */
  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (debouncedSearch) params.search = debouncedSearch
      if (roleFilter) params.role = roleFilter
      if (statusFilter) params.is_active = statusFilter

      const { data } = await userApi.list(params)
      const items = data?.data ?? []
      const pag = data?.pagination ?? {}

      // Flatten role
      const flat = items.map((u) => ({
        ...u,
        role: u.UserRole?.[0]?.role?.name || u.role || 'Tenant',
        is_kyc_verified: !!u.kyc_document_url || !!u.kyc_verified || false,
      }))

      setUsers(flat)
      setPagination({
        page: pag.page ?? page,
        limit: pag.limit ?? 20,
        total: pag.total ?? items.length,
        totalPages: pag.totalPages ?? Math.ceil(items.length / 20),
      })

      // Cards
      setCards([
        { label: 'Total Users', value: pag.total ?? items.length, color: '#6366f1' },
        { label: 'Tenants', value: flat.filter((u) => u.role === 'Tenant').length, color: '#10b981' },
        { label: 'Landlords', value: flat.filter((u) => u.role === 'Landlord').length, color: '#f59e0b' },
        { label: 'Active', value: flat.filter((u) => u.is_active).length, color: '#166534' },
      ])
    } catch (e) {
      showToast(e.message || 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, roleFilter, statusFilter])

  useEffect(() => {
    loadUsers(1)
  }, [debouncedSearch, roleFilter, statusFilter])

  /* ── Modal openers ── */
  function openEdit(user) {
    setSelectedUser(user)
    setFormEmail(user.email)
    setFormFullName(user.full_name || '')
    setFormPhone(user.phone || '')
    setFormRole(user.role || 'Tenant')
    setFormActive(user.is_active)
    setFormPassword('')
    setFormError('')
    setMode('edit')
  }

  function openView(user) {
    setSelectedUser(user)
    setMode('view')
  }

  function openAdd() {
    setSelectedUser(null)
    setFormEmail('')
    setFormPassword('')
    setFormFullName('')
    setFormPhone('')
    setFormRole('Tenant')
    setFormActive(true)
    setFormError('')
    setMode('add')
  }

  function closeModal() {
    setMode(null)
    setSelectedUser(null)
  }

  /* ── Form submit ── */
  async function handleSubmit() {
    setFormError('')
    if (!formEmail.trim()) { setFormError('Email is required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) { setFormError('Invalid email'); return }
    if (mode === 'add' && !formPassword) { setFormError('Password is required'); return }
    if (mode === 'add' && formPassword.length < 6) { setFormError('Password must be at least 6 characters'); return }

    setSaving(true)
    try {
      if (mode === 'add') {
        await userApi.create({
          email: formEmail.trim(),
          password: formPassword,
          full_name: formFullName.trim() || undefined,
          phone: formPhone.trim() || undefined,
          role: formRole,
        })
        showToast('User created successfully')
      } else {
        const payload = {
          full_name: formFullName.trim(),
          phone: formPhone.trim(),
          is_active: formActive,
        }
        await userApi.update(selectedUser.id, payload)
        showToast('User updated successfully')
      }
      closeModal()
      loadUsers(pagination.page)
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message || 'Operation failed'
      setFormError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── Actions ── */
  async function handleToggleActive(user) {
    try {
      if (user.is_active) {
        await userApi.suspend(user.id)
        showToast('User suspended', 'error')
      } else {
        await userApi.activate(user.id)
        showToast('User activated')
      }
      loadUsers(pagination.page)
    } catch (e) {
      showToast(e.message || 'Action failed', 'error')
    }
  }

  async function handleDelete(user) {
    if (!confirm(`Delete user "${user.full_name || user.email}"? This will deactivate their account.`)) return
    try {
      await userApi.remove(user.id)
      showToast('User deactivated')
      loadUsers(pagination.page)
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error')
    }
  }

  async function handleChangeRole(user, newRole) {
    if (!confirm(`Change role to ${newRole}?`)) return
    try {
      await userApi.changeRole(user.id, { role: newRole })
      showToast(`Role changed to ${newRole}`)
      loadUsers(pagination.page)
    } catch (e) {
      showToast(e.message || 'Role change failed', 'error')
    }
  }

  /* ── Pagination ── */
  function goToPage(page) {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return
    loadUsers(page)
  }

  /* ── Render ── */
  return (
    <div className="user-mgmt" data-customize-id="global.content">
      {/* Hero */}
      <section className="user-mgmt-hero">
        <div>
          <h1>User Management</h1>
          <p>Manage tenants, landlords, agents and admins. Control access, roles and account status.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="user-mgmt-add-btn"
          onClick={openAdd}
        >
          <UserPlus size={18} />
          Add User
        </motion.button>
      </section>

      {/* Cards */}
      <section className="user-mgmt-cards">
        {cards.map((c) => (
          <article className="user-mgmt-card" key={c.label}>
            <div className="user-mgmt-card-icon" style={{ color: c.color }}>
              <Users size={22} />
            </div>
            <span>{c.label}</span>
            <strong>{loading ? '...' : c.value}</strong>
          </article>
        ))}
      </section>

      {/* Filters & search */}
      <div className="user-mgmt-toolbar">
        <div className="user-mgmt-search">
          <Search size={16} style={{ color: 'var(--text-secondary-light, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <X size={14} onClick={() => setSearch('')} style={{ cursor: 'pointer', color: 'var(--text-secondary-light, #94a3b8)' }} />
          )}
        </div>

        <div className="user-mgmt-filters">
          <div className="user-mgmt-filter-group">
            <Filter size={14} />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="user-mgmt-filter-group">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="user-mgmt-table-wrap">
        {loading ? (
          <div className="user-mgmt-loading">
            <Loader2 size={20} className="spin" />
            <span>Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="user-mgmt-empty">
            <Users size={36} color="var(--text-secondary-light, #cbd5e1)" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="user-mgmt-table">
            {/* Head */}
            <div className="user-mgmt-th">
              <span className="th-user">User</span>
              <span className="th-role">Role</span>
              <span className="th-kyc">KYC</span>
              <span className="th-status">Status</span>
              <span className="th-actions">Actions</span>
            </div>

            {/* Rows */}
            {users.map((u) => (
              <div className="user-mgmt-tr" key={u.id}>
                {/* User cell */}
                <div className="user-cell">
                  <div className="user-avatar">{(u.full_name || u.email || '?').charAt(0).toUpperCase()}</div>
                  <div className="user-info">
                    <span className="user-name">{u.full_name || '—'}</span>
                    <span className="user-email">{u.email}</span>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <span className="role-badge" style={{ background: roleColors[u.role] + '22', color: roleColors[u.role] }}>
                    <Shield size={12} />
                    {u.role}
                  </span>
                </div>

                {/* KYC */}
                <div>
                  {u.is_kyc_verified ? (
                    <span className="kyc-badge verified">
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  ) : (
                    <span className="kyc-badge pending">
                      <AlertCircle size={11} /> Pending
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  {u.is_active ? (
                    <span className="user-status-badge active"><UserCheck size={11} /> Active</span>
                  ) : (
                    <span className="user-status-badge suspended"><UserX size={11} /> Suspended</span>
                  )}
                </div>

                {/* Actions */}
                <div className="action-group">
                  <button title="View" onClick={() => openView(u)}>
                    <Eye size={15} />
                  </button>
                  <button title="Edit" onClick={() => openEdit(u)}>
                    <Edit2 size={15} />
                  </button>
                  <button title={u.is_active ? 'Suspend' : 'Activate'} onClick={() => handleToggleActive(u)}>
                    {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                  </button>
                  <button title="Delete" onClick={() => handleDelete(u)} className="danger">
                    <Trash2 size={15} />
                  </button>
                  {/* Role changer dropdown */}
                  <select
                    className="role-select"
                    value={u.role}
                    onChange={(e) => handleChangeRole(u, e.target.value)}
                    title="Change role"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div className="user-mgmt-pagination">
              <div>
                Showing {((pagination.page - 1) * pagination.limit) + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="page-btns">
                <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}>
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let p
                  if (pagination.totalPages <= 5) {
                    p = i + 1
                  } else if (pagination.page <= 3) {
                    p = i + 1
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    p = pagination.totalPages - 4 + i
                  } else {
                    p = pagination.page - 2 + i
                  }
                  return (
                    <button
                      key={p}
                      className={p === pagination.page ? 'active' : ''}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Add/View/Edit popup ── */}
      <Modal
        isOpen={!!mode}
        onOpenChange={(open) => !open && closeModal()}
        title={mode === 'add' ? 'Add New User' : mode === 'view' ? 'User Details' : 'Edit User'}
      >
        {mode && (
              <div className="panel-body">
                {mode === 'view' && selectedUser && (
                  <ViewUserView user={selectedUser} onEdit={() => openEdit(selectedUser)} />
                )}

                {(mode === 'add' || mode === 'edit') && (
                  <div className="user-form">
                    {formError && (
                      <div className="form-error-banner">
                        <AlertCircle size={15} />
                        {formError}
                      </div>
                    )}

                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        className="form-input"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        disabled={mode === 'edit'}
                        placeholder="user@example.com"
                      />
                    </label>

                    <label>
                      <span>{mode === 'add' ? 'Password' : 'New Password (optional)'}</span>
                      <input
                        type="password"
                        className="form-input"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder={mode === 'add' ? 'Min 6 characters' : 'Leave blank to keep current'}
                      />
                    </label>

                    <label>
                      <span>Full Name</span>
                      <input
                        type="text"
                        className="form-input"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </label>

                    <label>
                      <span>Phone</span>
                      <input
                        type="tel"
                        className="form-input"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+60 12-3456789"
                      />
                    </label>

                    <label>
                      <span>Role</span>
                      <select className="form-input" value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </label>

                    {mode === 'edit' && (
                      <label className="form-toggle">
                        <span>Account Active</span>
                        <div className="toggle-track" onClick={() => setFormActive((a) => !a)}>
                          <div className={`toggle-knob ${formActive ? 'on' : 'off'}`} />
                        </div>
                      </label>
                    )}

                    <div className="form-submit-row">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="form-submit-btn"
                        disabled={saving}
                        onClick={handleSubmit}
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            {mode === 'add' ? 'Create User' : 'Save Changes'}
                          </>
                        )}
                      </motion.button>
                      <button className="form-cancel-btn" onClick={closeModal}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
        )}
      </Modal>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast ${toast.type}`}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── View User detail ── */
function ViewUserView({ user, onEdit }) {
  return (
    <div className="view-user">
      <div className="view-card">
        <div className="view-avatar-lg">
          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="view-details">
          <div className="view-row">
            <label>Name</label>
            <span>{user.full_name || '—'}</span>
          </div>
          <div className="view-row">
            <label>Email</label>
            <span>{user.email}</span>
          </div>
          <div className="view-row">
            <label>Phone</label>
            <span>{user.phone || '—'}</span>
          </div>
          <div className="view-row">
            <label>Role</label>
            <span className="role-badge" style={{ background: roleColors[user.role] + '22', color: roleColors[user.role] }}>
              <Shield size={12} />
              {user.role}
            </span>
          </div>
          <div className="view-row">
            <label>KYC Status</label>
            <span>
              {user.is_kyc_verified ? (
                <span className="kyc-badge verified"><CheckCircle2 size={11} /> Verified</span>
              ) : (
                <span className="kyc-badge pending"><AlertCircle size={11} /> Pending</span>
              )}
            </span>
          </div>
          <div className="view-row">
            <label>Account</label>
            <span>
              {user.is_active ? (
                <span className="user-status-badge active"><UserCheck size={11} /> Active</span>
              ) : (
                <span className="user-status-badge suspended"><UserX size={11} /> Suspended</span>
              )}
            </span>
          </div>
          <div className="view-row">
            <label>Created</label>
            <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </div>
      <div className="view-actions">
        <motion.button whileTap={{ scale: 0.96 }} className="view-edit-btn" onClick={onEdit}>
          <Edit2 size={15} />
          Edit User
        </motion.button>
      </div>
    </div>
  )
}
