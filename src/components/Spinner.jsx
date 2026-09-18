export function Spinner({ label = 'Loading' }) {
  return (
    <span className="spinner" role="status" aria-live="polite">
      <span className="spinner-circle" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
