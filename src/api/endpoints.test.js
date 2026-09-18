import { describe, expect, it, vi } from 'vitest'
import { createApi } from './endpoints.js'

function stubClient() {
  return { request: vi.fn().mockResolvedValue(null) }
}

describe('api endpoints', () => {
  it('encodes the status filter query', async () => {
    const client = stubClient()
    await createApi(client).listApplicationsByStatus('INTERVIEW_SCHEDULED')

    expect(client.request).toHaveBeenCalledWith(
      '/applications/status?status=INTERVIEW_SCHEDULED',
      undefined,
    )
  })

  it('encodes location values that contain separators', async () => {
    const client = stubClient()
    await createApi(client).listApplicationsByLocation('Pune, India')

    expect(client.request).toHaveBeenCalledWith(
      '/applications/location?location=Pune%2C%20India',
      undefined,
    )
  })

  it('encodes company search terms', async () => {
    const client = stubClient()
    await createApi(client).searchApplicationsByCompanyName('A&B Corp')

    expect(client.request).toHaveBeenCalledWith(
      '/applications/search?companyName=A%26B%20Corp',
      undefined,
    )
  })

  it('posts notes to the nested note route', async () => {
    const client = stubClient()
    await createApi(client).createNote(12, { content: 'Call scheduled' })

    expect(client.request).toHaveBeenCalledWith('/applications/12/notes', {
      method: 'POST',
      body: { content: 'Call scheduled' },
    })
  })

  it('deletes notes through the nested note route', async () => {
    const client = stubClient()
    await createApi(client).deleteNote(12, 5)

    expect(client.request).toHaveBeenCalledWith('/applications/12/notes/5', {
      method: 'DELETE',
    })
  })

  it('sends the login request without authentication', async () => {
    const client = stubClient()
    await createApi(client).login({ email: 'a@b.com', password: 'secret' })

    expect(client.request).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.com', password: 'secret' },
      authenticated: false,
    })
  })
})
