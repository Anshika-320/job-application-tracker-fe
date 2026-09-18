import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { Spinner } from './Spinner.jsx'

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)

    try {
      await onConfirm()
    } catch (caught) {
      setError(caught?.message ?? 'That action could not be completed.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} description={description} onClose={onClose} width="small">
      <div className="modal-body">
        {error ? (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <footer className="modal-footer">
        <button type="button" className="button button-quiet" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="button button-danger"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? <Spinner label="Working" /> : confirmLabel}
        </button>
      </footer>
    </Modal>
  )
}
