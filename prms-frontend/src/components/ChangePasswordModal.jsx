import { useState } from 'react'
import Modal from './Modal'
import { useAuth } from '../contexts/AuthContext'

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function reset() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setSubmitting(true)
    const result = await changePassword({ currentPassword, newPassword })
    setSubmitting(false)

    if (result.success) {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setError(result.error || 'Failed to change password.')
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={handleClose} title="Change Password">
      {success ? (
        <div>
          <p>Your password has been changed successfully.</p>
          <div className="flex mt-4" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn-primary" onClick={handleClose}>Done</button>
          </div>
        </div>
      ) : (
        <form className="security-modal-form" onSubmit={handleSubmit}>
          {error && <div className="security-modal-error">{error}</div>}

          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <label className="mt-2">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <label className="mt-2">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn-outline" onClick={handleClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
