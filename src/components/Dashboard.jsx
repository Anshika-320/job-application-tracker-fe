import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { INTERVIEW_STAGE_STATUSES } from '../constants/statuses.js'
import { useApplications } from '../hooks/useApplications.js'
import { ApplicationFormDialog } from './ApplicationFormDialog.jsx'
import { ApplicationTable } from './ApplicationTable.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'
import { FilterBar } from './FilterBar.jsx'
import { NotesDialog } from './NotesDialog.jsx'
import { Pagination } from './Pagination.jsx'
import { Spinner } from './Spinner.jsx'
import { StateMessage } from './StateMessage.jsx'
import { SummaryCards } from './SummaryCards.jsx'

const PAGE_SIZE = 10
const DATE_FIELDS = new Set(['createdAt', 'updatedAt'])

function matchesQuery(application, query) {
  if (query === '') {
    return true
  }

  const haystack = [application.companyName, application.role, application.location]
  return haystack.some((value) => value?.toLowerCase().includes(query))
}

function compareApplications(first, second, field) {
  if (DATE_FIELDS.has(field)) {
    return new Date(first[field] ?? 0).getTime() - new Date(second[field] ?? 0).getTime()
  }

  return String(first[field] ?? '').localeCompare(String(second[field] ?? ''), undefined, {
    sensitivity: 'base',
  })
}

export function Dashboard() {
  const { api, accountEmail, logout } = useAuth()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState('')
  const [sort, setSort] = useState({ field: 'createdAt', direction: 'desc' })
  const [page, setPage] = useState(1)

  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [notesTarget, setNotesTarget] = useState(null)
  const [flash, setFlash] = useState(null)

  const { allApplications, results, noteCounts, loading, refreshing, error, reload } =
    useApplications({ status, location })

  useEffect(() => {
    if (!flash) {
      return undefined
    }

    const timer = window.setTimeout(() => setFlash(null), 4000)
    return () => window.clearTimeout(timer)
  }, [flash])

  const summary = useMemo(() => {
    const source = allApplications ?? []
    return {
      total: source.length,
      interviewing: source.filter((item) => INTERVIEW_STAGE_STATUSES.includes(item.status)).length,
      offers: source.filter((item) => item.status === 'OFFERED').length,
    }
  }, [allApplications])

  const locations = useMemo(() => {
    const unique = new Set(
      (allApplications ?? []).map((item) => item.location?.trim()).filter(Boolean),
    )
    return Array.from(unique).sort((first, second) => first.localeCompare(second))
  }, [allApplications])

  const visible = useMemo(() => {
    if (!results) {
      return []
    }

    const normalisedQuery = query.trim().toLowerCase()
    const filtered = results.filter((application) => matchesQuery(application, normalisedQuery))
    const direction = sort.direction === 'asc' ? 1 : -1

    return [...filtered].sort(
      (first, second) => compareApplications(first, second, sort.field) * direction,
    )
  }, [results, query, sort])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const filtersActive = query !== '' || status !== '' || location !== ''

  function changeQuery(value) {
    setQuery(value)
    setPage(1)
  }

  function changeStatus(value) {
    setStatus(value)
    setPage(1)
  }

  function changeLocation(value) {
    setLocation(value)
    setPage(1)
  }

  function changeSort(value) {
    setSort(value)
    setPage(1)
  }

  function clearFilters() {
    setQuery('')
    setStatus('')
    setLocation('')
    setPage(1)
  }

  async function handleCreate(payload) {
    await api.createApplication(payload)
    setEditing(null)
    setFlash('Application added.')
    reload()
  }

  async function handleUpdate(payload) {
    await api.updateApplication(editing.application.id, payload)
    setEditing(null)
    setFlash('Application updated.')
    reload()
  }

  async function handleDelete() {
    await api.deleteApplication(deleteTarget.id)
    setDeleteTarget(null)
    setFlash('Application deleted.')
    reload()
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1>Job Application Tracker</h1>
            {accountEmail ? <p className="app-account">Signed in as {accountEmail}</p> : null}
          </div>
          <div className="app-header-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => setEditing({ application: null })}
            >
              Add application
            </button>
            <button type="button" className="button button-quiet" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {flash ? (
          <p className="alert alert-success" role="status">
            {flash}
          </p>
        ) : null}

        <SummaryCards
          total={summary.total}
          interviewing={summary.interviewing}
          offers={summary.offers}
        />

        <FilterBar
          query={query}
          onQueryChange={changeQuery}
          status={status}
          onStatusChange={changeStatus}
          location={location}
          onLocationChange={changeLocation}
          locations={locations}
          onClear={clearFilters}
          filtersActive={filtersActive}
        />

        {loading ? (
          <div className="centered-block">
            <Spinner label="Loading applications" />
          </div>
        ) : null}

        {!loading && error ? (
          <StateMessage
            tone="error"
            title="Could not load your applications"
            action={
              <button type="button" className="button button-primary" onClick={reload}>
                Try again
              </button>
            }
          >
            {error.message}
          </StateMessage>
        ) : null}

        {!loading && !error && summary.total === 0 ? (
          <StateMessage
            title="No applications yet"
            action={
              <button
                type="button"
                className="button button-primary"
                onClick={() => setEditing({ application: null })}
              >
                Add your first application
              </button>
            }
          >
            Track a role you have applied for and its progress will show up here.
          </StateMessage>
        ) : null}

        {!loading && !error && !refreshing && summary.total > 0 && visible.length === 0 ? (
          <StateMessage
            title="No matching applications"
            action={
              <button type="button" className="button button-quiet" onClick={clearFilters}>
                Clear filters
              </button>
            }
          >
            Adjust your search or filters to see more results.
          </StateMessage>
        ) : null}

        {!loading && !error && visible.length > 0 ? (
          <section className={refreshing ? 'results is-refreshing' : 'results'}>
            {refreshing ? (
              <p className="results-status" role="status">
                Updating results
              </p>
            ) : null}
            <ApplicationTable
              applications={pageItems}
              noteCounts={noteCounts}
              sort={sort}
              onSortChange={changeSort}
              onEdit={(application) => setEditing({ application })}
              onDelete={setDeleteTarget}
              onOpenNotes={setNotesTarget}
            />
            <Pagination
              page={safePage}
              pageCount={pageCount}
              total={visible.length}
              rangeStart={(safePage - 1) * PAGE_SIZE + 1}
              rangeEnd={Math.min(safePage * PAGE_SIZE, visible.length)}
              onPageChange={setPage}
            />
          </section>
        ) : null}
      </main>

      {editing ? (
        <ApplicationFormDialog
          application={editing.application}
          onClose={() => setEditing(null)}
          onSubmit={editing.application ? handleUpdate : handleCreate}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete application"
          description={`This deletes the ${deleteTarget.role} application at ${deleteTarget.companyName} and every note on it.`}
          confirmLabel="Delete application"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      {notesTarget ? (
        <NotesDialog
          application={notesTarget}
          onClose={() => setNotesTarget(null)}
          onNotesChanged={reload}
        />
      ) : null}
    </div>
  )
}
