import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { categoryApi } from '../api/categories'
import Modal from '../components/Modal'
import {
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import './AdminCategories.css'

function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formShared, setFormShared] = useState(true)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const { data } = await categoryApi.list()
      setCategories(data?.data ?? [])
    } catch (e) {
      console.error('Failed to load categories', e)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  function startEdit(cat) {
    setEditingId(cat.id)
    setFormName(cat.name)
    setFormDesc(cat.description ?? '')
    setFormShared(cat.isShared)
    setShowForm(true)
  }

  function startCreate() {
    setEditingId(null)
    setFormName('')
    setFormDesc('')
    setFormShared(true)
    setShowForm(true)
  }

  async function submitForm() {
    if (!formName.trim()) return showToast('Name is required', 'error')
    try {
      if (editingId) {
        await categoryApi.update(editingId, {
          name: formName.trim(),
          description: formDesc.trim(),
          isShared: formShared,
        })
        showToast('Category updated')
      } else {
        await categoryApi.create({
          name: formName.trim(),
          description: formDesc.trim(),
          isShared: formShared,
        })
        showToast('Category created')
      }
      setShowForm(false)
      setEditingId(null)
      loadCategories()
    } catch (e) {
      showToast(e.message || 'Operation failed', 'error')
    }
  }

  async function toggleDisabled(id) {
    try {
      await categoryApi.toggle(id)
      showToast('Category toggled')
      loadCategories()
    } catch (e) {
      showToast(e.message || 'Toggle failed', 'error')
    }
  }

  async function remove(id, name) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return
    try {
      await categoryApi.remove(id)
      showToast('Category deleted')
      loadCategories()
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error')
    }
  }

  return (
    <div className="admin-categories">
      <div className="admin-categories-header">
        <div>
          <h1>Property Categories</h1>
          <p>Manage shared and personal property categories for listing classification.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="admin-categories-add-btn"
          onClick={startCreate}
        >
          <Plus size={17} /> Add Category
        </motion.button>
      </div>

      {loading ? (
        <div className="admin-categories-loading">Loading categories...</div>
      ) : (
        <div className="admin-categories-list">
          {categories.length === 0 && (
            <div className="admin-categories-empty">
              <FolderOpen size={42} />
              <p>No categories yet. Create one to get started.</p>
            </div>
          )}

          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              className="admin-categories-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="admin-categories-card-main">
                <div className="admin-categories-card-icon">
                  <FolderOpen size={22} />
                </div>
                <div className="admin-categories-card-info">
                  <h3>{cat.name}</h3>
                  {cat.description && <p>{cat.description}</p>}
                  <div className="admin-categories-badges">
                    {cat.isShared ? (
                      <span className="badge shared">
                        <Globe size={12} /> Shared
                      </span>
                    ) : (
                      <span className="badge personal">
                        <Lock size={12} /> Personal
                      </span>
                    )}
                    {cat.isDisabled && (
                      <span className="badge disabled">
                        <AlertCircle size={12} /> Disabled
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-categories-card-actions">
                {editingId === cat.id ? (
                  <>
                    <input
                      className="edit-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Category name"
                    />
                    <input
                      className="edit-desc"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Description"
                    />
                    <label className="edit-shared">
                      <input
                        type="checkbox"
                        checked={formShared}
                        onChange={(e) => setFormShared(e.target.checked)}
                      />{' '}
                      Shared
                    </label>
                    <button className="action-btn save" onClick={submitForm}>
                      <Save size={15} />
                    </button>
                    <button className="action-btn cancel" onClick={() => { setShowForm(false); setEditingId(null) }}>
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="action-btn" onClick={() => startEdit(cat)} title="Edit">
                      <Edit2 size={15} />
                    </button>
                    <button className="action-btn toggle" onClick={() => toggleDisabled(cat.id)} title="Toggle">
                      <CheckCircle2 size={15} />
                    </button>
                    <button className="action-btn danger" onClick={() => remove(cat.id, cat.name)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm && editingId === null}
        onOpenChange={setShowForm}
        title="Add Category"
        footer={
          <>
            <button className="action-btn cancel" onClick={() => setShowForm(false)}>
              <X size={15} /> Cancel
            </button>
            <button className="action-btn save" onClick={submitForm}>
              <Save size={15} /> Create
            </button>
          </>
        }
      >
        <input
          className="form-input"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Category name *"
        />
        <input
          className="form-input"
          value={formDesc}
          onChange={(e) => setFormDesc(e.target.value)}
          placeholder="Description (optional)"
          style={{ marginTop: 12 }}
        />
        <label className="form-checkbox" style={{ marginTop: 12, display: 'block' }}>
          <input
            type="checkbox"
            checked={formShared}
            onChange={(e) => setFormShared(e.target.checked)}
          />{' '}
          Shared across system
        </label>
      </Modal>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast ${toast.type}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminCategories
