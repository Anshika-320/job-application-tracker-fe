export const API_BASE_URL = '/api'

const MESSAGE_KEYS = ['message', 'detail']
const PROBLEM_METADATA_KEYS = [
  'timestamp',
  'status',
  'path',
  'type',
  'title',
  'instance',
  'error',
]

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export class NetworkError extends ApiError {
  constructor() {
    super('Unable to reach the server. Check that the API is running and try again.')
    this.name = 'NetworkError'
  }
}

function parseErrorPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  for (const key of MESSAGE_KEYS) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return { message: value }
    }
  }

  const hasProblemMetadata = PROBLEM_METADATA_KEYS.some((key) => key in payload)
  if (hasProblemMetadata) {
    return {}
  }

  const fieldErrors = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value === 'string'),
  )

  return Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}
}

function fallbackMessage(status) {
  if (status === 400) return 'The request was rejected. Review the highlighted fields.'
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'That record no longer exists.'
  if (status >= 500) return 'The server ran into a problem. Try again in a moment.'
  return 'Something went wrong. Try again.'
}

async function readBody(response) {
  const text = await response.text()
  if (text.trim() === '') {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function createApiClient({ getToken, onUnauthorized } = {}) {
  async function request(path, { method = 'GET', body, authenticated = true, signal } = {}) {
    const headers = {}
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const token = authenticated && typeof getToken === 'function' ? getToken() : null
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    let response
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error
      }
      throw new NetworkError()
    }

    if (response.status === 204) {
      return null
    }

    const payload = await readBody(response)

    if (!response.ok) {
      if (response.status === 401 && authenticated && typeof onUnauthorized === 'function') {
        onUnauthorized()
      }

      const parsed = typeof payload === 'string' ? {} : parseErrorPayload(payload)
      throw new ApiError(parsed.message ?? fallbackMessage(response.status), {
        status: response.status,
        fieldErrors: parsed.fieldErrors ?? null,
      })
    }

    return payload
  }

  return { request }
}
