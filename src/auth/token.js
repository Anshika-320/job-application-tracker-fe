const STORAGE_KEY = 'jobApplicationTracker.token'

function decodeSegment(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeTokenPayload(token) {
  if (typeof token !== 'string') {
    return null
  }

  const segments = token.split('.')
  if (segments.length !== 3) {
    return null
  }

  try {
    const payload = JSON.parse(decodeSegment(segments[1]))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

export function isTokenExpired(token, now = Date.now()) {
  const payload = decodeTokenPayload(token)
  if (!payload || typeof payload.exp !== 'number') {
    return false
  }

  return payload.exp * 1000 <= now
}

export function subjectOf(token) {
  const payload = decodeTokenPayload(token)
  return typeof payload?.sub === 'string' ? payload.sub : null
}

export function readStoredToken() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeStoredToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* storage unavailable; the token stays in memory for this session */
  }
}
