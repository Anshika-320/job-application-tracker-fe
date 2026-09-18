import { useState } from 'react'
import { ApiError } from '../api/client.js'
import { APPLICATION_STATUSES } from '../constants/statuses.js'
import { Modal } from './Modal.jsx'
import { Spinner } from './Spinner.jsx'

const MAX_TEXT_LENGTH = 150

function initialValues(application) {
  return {
    companyName: application?.companyName ?? '',
    role: application?.role ?? '',
    status: application?.status ?? APPLICATION_STATUSES[0].value,
    location: application?.location ?? '',
  }
}

function validate(values) {
  const errors = {}

  if (values.companyName.trim() === '') {
    errors.companyName = 'Company name is required.'
  } else if (values.companyName.trim().length > MAX_TEXT_LENGTH) {
    errors.companyName = `Company name must be ${MAX_TEXT_LENGTH} characters or fewer.`
  }

  if (values.role.trim() === '') {
    errors.role = 'Role is required.'
  } else if (values.role.trim().length > MAX_TEXT_LENGTH) {
    errors.role = `Role must be ${MAX_TEXT_LENGTH} characters or fewer.`
  }

  if (values.location.trim().length > MAX_TEXT_LENGTH) {
    errors.location = `Location must be ${MAX_TEXT_LENGTH} characters or fewer.`
  }

  return errors
}

export function ApplicationFormDialog({ application, onClose, onSubmit }) {
  const isEditing = Boolean(application)
  const [values, setValues] = useState(() => initialValues(application))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationErrors = validate(values)
    setErrors(validationErrors)
    setFormError(null)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    const payload = {
      companyName: values.companyName.trim(),
      role: values.role.trim(),
      status: values.status,
      location: values.location.trim() === '' ? null : values.location.trim(),
    }

    setSubmitting(true)
    try {
      await onSubmit(payload)
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors) {
        setErrors(caught.fieldErrors)
      } else {
        setFormError(caught?.message ?? 'Unable to save this application.')
      }
      setSubmitting(false)
    }
  }

  const fields = [
    { name: 'companyName', label: 'Company name', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: false },
  ]

  return (
    <Modal
      title={isEditing ? 'Edit application' : 'Add application'}
      description={
        isEditing
          ? `Update the details for ${application.companyName}.`
          : 'Record a new job application.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        ) : null}

        {fields.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={`application-${field.name}`}>
              {field.label}
              {field.required ? null : <span className="field-optional"> (optional)</span>}
            </label>
            <input
              id={`application-${field.name}`}
              name={field.name}
              type={field.type}
              value={values[field.name]}
              maxLength={MAX_TEXT_LENGTH}
              onChange={(event) => update(field.name, event.target.value)}
              aria-invalid={errors[field.name] ? 'true' : undefined}
              aria-describedby={errors[field.name] ? `application-${field.name}-error` : undefined}
            />
            {errors[field.name] ? (
              <p className="field-error" id={`application-${field.name}-error`}>
                {errors[field.name]}
              </p>
            ) : null}
          </div>
        ))}

        <div className="field">
          <label htmlFor="application-status">Status</label>
          <select
            id="application-status"
            name="status"
            value={values.status}
            onChange={(event) => update('status', event.target.value)}
            aria-invalid={errors.status ? 'true' : undefined}
            aria-describedby={errors.status ? 'application-status-error' : undefined}
          >
            {APPLICATION_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status ? (
            <p className="field-error" id="application-status-error">
              {errors.status}
            </p>
          ) : null}
        </div>

        <footer className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? <Spinner label="Saving" /> : isEditing ? 'Save changes' : 'Add application'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
