import { formatDate, toIsoDateAttribute } from '../utils/formatDate.js'
import { StatusBadge } from './StatusBadge.jsx'

const COLUMNS = [
  { field: 'companyName', label: 'Company' },
  { field: 'role', label: 'Role' },
  { field: 'status', label: 'Status' },
  { field: 'location', label: 'Location' },
  { field: 'createdAt', label: 'Added' },
  { field: 'updatedAt', label: 'Updated' },
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

export function ApplicationTable({
  applications,
  noteCounts,
  sort,
  onSortChange,
  onEdit,
  onDelete,
  onOpenNotes,
}) {
  function handleSort(field) {
    if (sort.field === field) {
      onSortChange({ field, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ field, direction: 'asc' })
    }
  }

  return (
    <div className="table-wrapper">
      <table className="application-table">
        <caption className="sr-only">Job applications</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.field}
                scope="col"
                aria-sort={sort.field === column.field ? ARIA_SORT[sort.direction] : 'none'}
              >
                <button
                  type="button"
                  className="sort-button"
                  onClick={() => handleSort(column.field)}
                >
                  {column.label}
                  <span aria-hidden="true" className="sort-indicator">
                    {sort.field === column.field ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
                  </span>
                </button>
              </th>
            ))}
            <th scope="col">Notes</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const noteCount = noteCounts.get(application.id) ?? 0

            return (
              <tr key={application.id}>
                <td data-label="Company" className="cell-strong">
                  {application.companyName}
                </td>
                <td data-label="Role">{application.role}</td>
                <td data-label="Status">
                  <StatusBadge status={application.status} />
                </td>
                <td data-label="Location">{application.location || '—'}</td>
                <td data-label="Added">
                  <time dateTime={toIsoDateAttribute(application.createdAt)}>
                    {formatDate(application.createdAt)}
                  </time>
                </td>
                <td data-label="Updated">
                  <time dateTime={toIsoDateAttribute(application.updatedAt)}>
                    {formatDate(application.updatedAt)}
                  </time>
                </td>
                <td data-label="Notes">
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    onClick={() => onOpenNotes(application)}
                    aria-label={`${noteCount === 1 ? '1 note' : `${noteCount} notes`} for ${application.companyName}`}
                  >
                    {noteCount === 1 ? '1 note' : `${noteCount} notes`}
                  </button>
                </td>
                <td data-label="Actions" className="cell-actions">
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    onClick={() => onEdit(application)}
                    aria-label={`Edit ${application.companyName}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button-danger-quiet button-small"
                    onClick={() => onDelete(application)}
                    aria-label={`Delete ${application.companyName}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
