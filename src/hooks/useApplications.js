import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'

function toNoteCountMap(entries) {
  if (!Array.isArray(entries)) {
    return new Map()
  }

  return new Map(entries.map((entry) => [entry.applicationId, entry.noteCount ?? 0]))
}

function isAbort(error) {
  return error?.name === 'AbortError'
}

function serverFilterKeyFor(status, location) {
  if (status) return `status:${status}`
  if (location) return `location:${location}`
  return ''
}

export function useApplications({ status, location }) {
  const { api } = useAuth()

  const [base, setBase] = useState({ data: null, noteCounts: new Map(), error: null, loaded: false })
  const [filtered, setFiltered] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1)
  }, [])

  const serverFilterKey = serverFilterKeyFor(status, location)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function load() {
      try {
        const [applications, counts] = await Promise.all([
          api.listApplications({ signal: controller.signal }),
          api.listNoteCounts({ signal: controller.signal }),
        ])

        if (!active) return
        setBase({
          data: Array.isArray(applications) ? applications : [],
          noteCounts: toNoteCountMap(counts),
          error: null,
          loaded: true,
        })
      } catch (caught) {
        if (!active || isAbort(caught)) return
        setBase({ data: null, noteCounts: new Map(), error: caught, loaded: true })
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [api, reloadCount])

  useEffect(() => {
    if (!serverFilterKey) {
      return undefined
    }

    const controller = new AbortController()
    let active = true

    async function load() {
      try {
        const options = { signal: controller.signal }
        const results = status
          ? await api.listApplicationsByStatus(status, options)
          : await api.listApplicationsByLocation(location, options)

        if (!active) return
        setFiltered({
          key: serverFilterKey,
          data: Array.isArray(results) ? results : [],
          error: null,
        })
      } catch (caught) {
        if (!active || isAbort(caught)) return
        setFiltered({ key: serverFilterKey, data: null, error: caught })
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [api, status, location, serverFilterKey, reloadCount])

  const refreshing = Boolean(serverFilterKey) && filtered?.key !== serverFilterKey

  const results = useMemo(() => {
    if (!serverFilterKey) {
      return base.data
    }

    const fromServer = filtered?.key === serverFilterKey ? filtered.data : undefined
    if (fromServer === null) {
      return null
    }

    const source = fromServer ?? base.data
    if (!source) {
      return null
    }

    const applyStatus = Boolean(status) && fromServer === undefined
    const applyLocation = Boolean(location) && (fromServer === undefined || Boolean(status))
    const wantedLocation = location?.toLowerCase()

    if (!applyStatus && !applyLocation) {
      return source
    }

    return source.filter(
      (application) =>
        (!applyStatus || application.status === status) &&
        (!applyLocation || application.location?.toLowerCase() === wantedLocation),
    )
  }, [serverFilterKey, filtered, base.data, status, location])

  const error = base.error ?? (serverFilterKey ? (filtered?.error ?? null) : null)

  return {
    allApplications: base.data,
    results,
    noteCounts: base.noteCounts,
    loading: !base.loaded,
    refreshing,
    error,
    reload,
  }
}
