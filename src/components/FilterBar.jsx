import { APPLICATION_STATUSES } from '../constants/statuses.js'

export function FilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  location,
  onLocationChange,
  locations,
  onClear,
  filtersActive,
}) {
  return (
    <section className="filter-bar" aria-label="Search and filter applications">
      <div className="field field-grow">
        <label htmlFor="filter-query">Search</label>
        <input
          id="filter-query"
          type="search"
          value={query}
          placeholder="Company, role or location"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="filter-status">Status</label>
        <select
          id="filter-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filter-location">Location</label>
        <select
          id="filter-location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="button button-quiet"
        onClick={onClear}
        disabled={!filtersActive}
      >
        Clear filters
      </button>
    </section>
  )
}
