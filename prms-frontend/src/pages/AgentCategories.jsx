import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { categoryApi } from '../api/categories'
import {
  FolderOpen,
  Plus,
  Globe,
  User,
  Star,
  AlertCircle,
} from 'lucide-react'
import './AgentCategories.css'

function AgentCategories() {
  const [sharedCats, setSharedCats] = useState([])
  const [personalCats, setPersonalCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      setPersonalCats((personalRes.data?.data ?? []).filter(c => !c.isDisabled))
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Failed to load categories')
      console.error('Failed to load categories', e)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function createPersonal() {
    if (!formName.trim()) return showToast('Name is required', 'error')
    try {
      await categoryApi.createPersonal({
        name: formName.trim(),
        description: formDesc.trim(),
      })
      showToast('Personal category created')
      setShowForm(false)
      setFormName('')
      setFormDesc('')
      loadData()
    } catch (e) {
      showToast(e.response?.data?.error?.message || e.message || 'Failed', 'error')
    }
  }

  function renderSection(title, cats, icon) {
    if (!cats.length) return null
    return (
      <div className="agent-categories-section">
        <h2>{title}</h2>
        <div className="agent-categories-grid">
          {cats.map((cat, i) => (
            <motion.div
              key={cat.id}
              className="agent-category-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="agent-category-icon">
                {icon}
              </div>
              <div>
                <h3>{cat.name}</h3>
                {cat.description && <p>{cat.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="agent-categories">
      <div className="agent-categories-header">
        <div>
          <h1>My Categories</h1>
          <p>Browse shared categories and manage your own personal ones.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="agent-categories-add-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} /> Add Personal
        </motion.button>
      </div>

      {loading ? (
        <div className="agent-categories-loading">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger">{error} <button className="btn btn-sm" onClick={loadData}>Retry</button></div>
      ) : (
        <>
          {renderSection('Shared Categories', sharedCats, <Globe size={18} />)}
          {renderSection('My Personal Categories', personalCats, <User size={18} />)}

          {(sharedCats.length === 0 && personalCats.length === 0) && (
            <div className="agent-categories-empty">
              <AlertCircle size={36} />
              <p>No categories available yet.</p>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="agent-categories-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="agent-categories-backdrop" onClick={() => setShowForm(false)}></div>
            <div className="agent-categories-form-inner">
              <h3>New Personal Category</h3>
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
                placeholder="Description"
              />
              <div className="form-actions">
                <button className="btn-primary" onClick={createPersonal}>
                  Create
                </button>
                <button className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default AgentCategories
