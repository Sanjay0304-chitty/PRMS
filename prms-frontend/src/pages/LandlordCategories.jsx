import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { categoryApi } from '../api/categories'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import {
  FolderOpen,
  Plus,
  Globe,
  Lock,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Power,
} from 'lucide-react'
import './LandlordCategories.css'

function LandlordCategories() {
  const [sharedCats, setSharedCats] = useState([])
  const [personalCats, setPersonalCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setError('')
    try {
      const [sharedRes, personalRes] = await Promise.all([
        categoryApi.shared(),
        categoryApi.personalList(),
      ])
      setSharedCats(sharedRes.data?.data ?? [])
      // Filter out disabled personal categories
      const personal = (personalRes.data?.data ?? []).filter(c => !c.isDisabled)
      setPersonalCats(personal)
    } catch (e) {
      setError(e.message || 'Failed to load categories')
      console.error('Failed to load categories', e)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  function startCreate() {
    setEditingId(null)
    setFormName('')
    setFormDesc('')
    setShowForm(true)
  }

  function startEdit(cat) {
    setEditingId(cat.id)
    setFormName(cat.name)
    setFormDesc(cat.description ?? '')
    setShowForm(true)
  }

  async function submitForm() {
    if (!formName.trim()) return showToast('Name is required', 'error')
    try {
      if (editingId) {
        await categoryApi.updatePersonal(editingId, {
          name: formName.trim(),
          description: formDesc.trim(),
        })
        showToast('Category updated')
      } else {
        await categoryApi.createPersonal({
          name: formName.trim(),
          description: formDesc.trim(),
        })
        showToast('Category created')
      }
      setShowForm(false)
      setEditingId(null)
      loadData()
    } catch (e) {
      showToast(e.message || 'Operation failed', 'error')
    }
  }

  async function toggleDisabled(id) {
    try {
      await categoryApi.togglePersonal(id)
      showToast('Category toggled')
      loadData()
    } catch (e) {
      showToast(e.message || 'Toggle failed', 'error')
    }
  }

  async function remove(id) {
    try {
      await categoryApi.removePersonal(id)
      showToast('Category deleted')
      loadData()
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error')
    }
  }

  function renderSharedSection(cats) {
    if (!cats.length) return null
    return (
      <div className="landlord-categories-section">
        <h2 className="landlord-categories-section-title">
          <Globe size={18} />
          Shared Categories
        </h2>
        <div className="landlord-categories-grid">
          {cats.map((cat, i) => (
            <motion.div
              key={cat.id}
              className="landlord-category-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="landlord-category-icon">
                <Globe size={18} />
              </div>
              <div className="landlord-category-info">
                <h3>{cat.name}</h3>
                {cat.description && <p>{cat.description}</p>}
                <span className="landlord-badge shared">
                  <Globe size={11} /> Shared
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  function renderPersonalSection(cats) {
    if (!cats.length) return null
    return (
      <div className="landlord-categories-section">
        <h2 className="landlord-categories-section-title">
          <Lock size={18} />
          My Categories
        </h2>
        <div className="landlord-categories-list">
          {cats.map((cat, i) => (
            <motion.div
              key={cat.id}
              className="landlord-category-card-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="landlord-category-main">
                <div className="landlord-category-icon">
                  <FolderOpen size={18} />
                </div>
                <div className="landlord-category-info">
                  <h3>{cat.name}</h3>
                  {cat.description && <p>{cat.description}</p>}
                  <span className="landlord-badge personal">
                    <Lock size={11} /> Personal
                  </span>
                </div>
              </div>
              <div className="landlord-category-actions">
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
                    <button
                      className="action-btn save"
                      onClick={submitForm}
                      title="Save"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                    <button
                      className="action-btn cancel"
                      onClick={() => { setShowForm(false); setEditingId(null) }}
                      title="Cancel"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="action-btn"
                      onClick={() => startEdit(cat)}
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="action-btn toggle"
                      onClick={() => toggleDisabled(cat.id)}
                      title="Disable"
                    >
                      <EyeOff size={15} />
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => remove(cat.id)}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="landlord-categories">
        <div className="landlord-categories-loading">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="landlord-categories">
      <div className="landlord-categories-header">
        <div>
          <h1>Categories</h1>
          <p>Manage your personal property categories and browse shared system categories.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="landlord-categories-add-btn"
          onClick={startCreate}
        >
          <Plus size={17} /> Add Category
        </motion.button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}{' '}
          <button className="btn btn-sm" onClick={loadData}>Retry</button>
        </div>
      )}

      {sharedCats.length === 0 && personalCats.length === 0 ? (
        <div className="landlord-categories-empty">
          <FolderOpen size={42} />
          <p>No categories available yet. Create one to get started.</p>
        </div>
      ) : (
        <>
          {renderSharedSection(sharedCats)}
          {renderPersonalSection(personalCats)}
        </>
      )}

      <Modal
        isOpen={showForm && editingId === null}
        onOpenChange={setShowForm}
        title="New Personal Category"
        footer={
          <>
            <button className="action-btn cancel" onClick={() => setShowForm(false)}>
              <X size={15} /> Cancel
            </button>
            <button className="action-btn save" onClick={submitForm}>
              <CheckCircle2 size={15} /> Create
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
      </Modal>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`landlord-toast ${toast.type}`}
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

export default LandlordCategories
