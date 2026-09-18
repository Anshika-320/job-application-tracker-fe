import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, createApiClient } from './client.js'

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
}

function emptyResponse(status) {
  return { ok: status >= 200 && status < 300, status, text: async () => '' }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('sends the bearer token on authenticated requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    const client = createApiClient({ getToken: () => 'token-123' })
    await client.request('/applications')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/applications')
    expect(init.headers.Authorization).toBe('Bearer token-123')
  })

  it('omits the bearer token on unauthenticated requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ token: 'abc' }))
    vi.stubGlobal('fetch', fetchMock)

    const client = createApiClient({ getToken: () => 'token-123' })
    await client.request('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.com', password: 'secret' },
      authenticated: false,
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'secret' })
  })

  it('returns null for a 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(emptyResponse(204)))

    const client = createApiClient({ getToken: () => 'token' })
    await expect(client.request('/applications/1', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('exposes field errors from the validation response shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ companyName: 'Company name is required' }, 400),
      ),
    )

    const client = createApiClient({ getToken: () => 'token' })
    const error = await client.request('/applications', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({ companyName: 'Company name is required' })
  })

  it('uses the message field from the handled error shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            timestamp: '2026-09-18T10:00:00',
            status: 404,
            error: 'Not Found',
            message: 'Job application not found with id: 9',
          },
          404,
        ),
      ),
    )

    const client = createApiClient({ getToken: () => 'token' })
    const error = await client.request('/applications/9').catch((e) => e)

    expect(error.message).toBe('Job application not found with id: 9')
    expect(error.fieldErrors).toBeNull()
  })

  it('does not treat the HTTP reason phrase as a user facing message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { timestamp: '2026-09-18T10:00:00', status: 401, error: 'Unauthorized', path: '/api/applications' },
          401,
        ),
      ),
    )

    const client = createApiClient({ getToken: () => 'token' })
    const error = await client.request('/applications').catch((e) => e)

    expect(error.message).not.toBe('Unauthorized')
    expect(error.message).toMatch(/session has expired/i)
    expect(error.fieldErrors).toBeNull()
  })

  it('signals an expired session for authenticated 401 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(emptyResponse(401)))
    const onUnauthorized = vi.fn()

    const client = createApiClient({ getToken: () => 'token', onUnauthorized })
    await client.request('/applications').catch(() => {})

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not sign the user out when the login request is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(emptyResponse(401)))
    const onUnauthorized = vi.fn()

    const client = createApiClient({ getToken: () => null, onUnauthorized })
    await client
      .request('/auth/login', { method: 'POST', body: {}, authenticated: false })
      .catch(() => {})

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports unreachable servers as a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const client = createApiClient({ getToken: () => 'token' })
    const error = await client.request('/applications').catch((e) => e)

    expect(error).toBeInstanceOf(NetworkError)
    expect(error.message).toMatch(/unable to reach the server/i)
  })

  it('propagates aborts instead of masking them as network errors', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    const client = createApiClient({ getToken: () => 'token' })
    const error = await client.request('/applications').catch((e) => e)

    expect(error.name).toBe('AbortError')
  })
})
