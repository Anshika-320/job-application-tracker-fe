import { describe, expect, it } from 'vitest'
import { decodeTokenPayload, isTokenExpired, subjectOf } from './token.js'

function makeToken(payload) {
  const encode = (value) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`
}

describe('token helpers', () => {
  it('reads the subject and expiry from a token', () => {
    const token = makeToken({ sub: 'user@example.com', exp: 2000000000 })

    expect(subjectOf(token)).toBe('user@example.com')
    expect(decodeTokenPayload(token).exp).toBe(2000000000)
  })

  it('treats a past expiry as expired', () => {
    const token = makeToken({ sub: 'user@example.com', exp: 1000 })

    expect(isTokenExpired(token, 2000 * 1000)).toBe(true)
  })

  it('treats a future expiry as valid', () => {
    const token = makeToken({ sub: 'user@example.com', exp: 5000 })

    expect(isTokenExpired(token, 1000 * 1000)).toBe(false)
  })

  it('returns null for values that are not tokens', () => {
    expect(decodeTokenPayload('not-a-token')).toBeNull()
    expect(decodeTokenPayload(null)).toBeNull()
    expect(subjectOf('not-a-token')).toBeNull()
  })

  it('does not report a malformed token as expired', () => {
    expect(isTokenExpired('not-a-token')).toBe(false)
  })
})
