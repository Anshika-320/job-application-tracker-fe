import { useEffect, useState } from 'react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import { Modal } from './Modal.jsx'
import { Spinner } from './Spinner.jsx'
import { StateMessage } from './StateMessage.jsx'

const MAX_NOTE_LENGTH = 500

export function NotesDialog({ application, onClose, onNotesChanged }) {
  const { api } = useAuth()
  const [notes, setNotes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [content, setContent] = useState('')
  const [contentError, setContentError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const applicationId = application.id

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function load() {
      try {
        const result = await api.listNotes(applicationId, { signal: controller.signal })
        if (!active) return
        setNotes(Array.isArray(result) ? result : [])
        setLoadError(null)
      } catch (caught) {
        if (!active || caught?.name === 'AbortError') return
        setNotes(null)
        setLoadError(caught)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [api, applicationId])

  async function handleAdd(event) {
    event.preventDefault()

    const trimmed = content.trim()
    setSubmitError(null)

    if (trimmed === '') {
      setContentError('Write a note before saving.')
      return
    }
    if (trimmed.length > MAX_NOTE_LENGTH) {
      setContentError(`Notes must be ${MAX_NOTE_LENGTH} characters or fewer.`)
      return
    }

    setContentError(null)
    setSubmitting(true)

    try {
      const created = await api.createNote(applicationId, { content: trimmed })
      setNotes((current) => [...(current ?? []), created])
      setContent('')
      onNotesChanged()
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors?.content) {
        setContentError(caught.fieldErrors.content)
      } else {
        setSubmitError(caught?.message ?? 'Unable to save this note.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(noteId) {
    setDeletingId(noteId)
    setSubmitError(null)

    try {
      await api.deleteNote(applicationId, noteId)
      setNotes((current) => (current ?? []).filter((note) => note.id !== noteId))
      onNotesChanged()
    } catch (caught) {
      setSubmitError(caught?.message ?? 'Unable to delete this note.')
    } finally {
      setDeletingId(null)
    }
  }

  const remaining = MAX_NOTE_LENGTH - content.length

  return (
    <Modal
      title={`Notes — ${application.companyName}`}
      description={`${application.role}${application.location ? ` · ${application.location}` : ''}`}
      onClose={onClose}
    >
      <div className="modal-body">
        {loading ? (
          <div className="centered-block">
            <Spinner label="Loading notes" />
          </div>
        ) : null}

        {!loading && loadError ? (
          <StateMessage tone="error" title="Could not load notes">
            {loadError.message}
          </StateMessage>
        ) : null}

        {!loading && !loadError && notes?.length === 0 ? (
          <StateMessage title="No notes yet">
            Add interview details, contacts or follow-up reminders here.
          </StateMessage>
        ) : null}

        {!loading && !loadError && notes?.length > 0 ? (
          <ul className="note-list">
            {notes.map((note) => (
              <li key={note.id} className="note-item">
                <p>{note.content}</p>
                <button
                  type="button"
                  className="button button-danger-quiet button-small"
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  aria-label="Delete note"
                >
                  {deletingId === note.id ? <Spinner label="Deleting note" /> : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {submitError ? (
          <p className="alert alert-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <form onSubmit={handleAdd} noValidate className="note-form">
          <div className="field">
            <label htmlFor="note-content">Add a note</label>
            <textarea
              id="note-content"
              name="content"
              rows={3}
              value={content}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => setContent(event.target.value)}
              aria-invalid={contentError ? 'true' : undefined}
              aria-describedby={contentError ? 'note-content-error' : 'note-content-hint'}
            />
            {contentError ? (
              <p className="field-error" id="note-content-error">
                {contentError}
              </p>
            ) : (
              <p className="field-hint" id="note-content-hint">
                {remaining} characters remaining
              </p>
            )}
          </div>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? <Spinner label="Saving note" /> : 'Add note'}
          </button>
        </form>
      </div>
    </Modal>
  )
}
