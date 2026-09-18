import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, createApiClient } from '../api/client.js'
import { createApi } from '../api/endpoints.js'
import { AuthContext } from './authContext.js'
import {
  decodeTokenPayload,
  isTokenExpired,
  readStoredToken,
  subjectOf,
  writeStoredToken,
} from './token.js'

function readInitialToken() {
  const stored = readStoredToken()
  if (!stored || isTokenExpired(stored)) {
    writeStoredToken(null)
    return null
  }
  return stored
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readInitialToken)
  const [sessionExpired, setSessionExpired] = useState(false)

  const clearSession = useCallback((expired) => {
    writeStoredToken(null)
    setSessionExpired(expired)
    setToken(null)
  }, [])

  const api = useMemo(
    () =>
      createApi(
        createApiClient({
          getToken: () => token,
          onUnauthorized: () => {
            if (token) {
              clearSession(true)
            }
          },
        }),
      ),
    [token, clearSession],
  )

  const login = useCallback(
    async (email, password) => {
      const response = await api.login({ email, password })
      const nextToken = response?.token

      if (typeof nextToken !== 'string' || nextToken === '') {
        throw new ApiError('The server did not return a session token.', { status: 0 })
      }

      writeStoredToken(nextToken)
      setSessionExpired(false)
      setToken(nextToken)
    },
    [api],
  )

  const logout = useCallback(() => {
    clearSession(false)
  }, [clearSession])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const expiresAt = decodeTokenPayload(token)?.exp
    if (typeof expiresAt !== 'number') {
      return undefined
    }

    const millisecondsRemaining = Math.max(0, expiresAt * 1000 - Date.now())
    const timer = window.setTimeout(() => clearSession(true), millisecondsRemaining)
    return () => window.clearTimeout(timer)
  }, [token, clearSession])

  const value = useMemo(
    () => ({
      api,
      token,
      isAuthenticated: Boolean(token),
      accountEmail: subjectOf(token),
      sessionExpired,
      login,
      logout,
    }),
    [api, token, sessionExpired, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
