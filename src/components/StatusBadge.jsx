import { statusLabel } from '../constants/statuses.js'

export function StatusBadge({ status }) {
  const modifier = typeof status === 'string' ? status.toLowerCase() : 'unknown'

  return <span className={`status-badge status-${modifier}`}>{statusLabel(status)}</span>
}
