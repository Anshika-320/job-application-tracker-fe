export function Pagination({ page, pageCount, total, rangeStart, rangeEnd, onPageChange }) {
  if (pageCount <= 1) {
    return null
  }

  return (
    <nav className="pagination" aria-label="Application pages">
      <p aria-live="polite">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="button button-quiet button-small"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span>
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="button button-quiet button-small"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
