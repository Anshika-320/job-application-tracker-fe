import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../api/client.js'
import { renderWithAuth } from '../test/renderWithAuth.jsx'
import { NotesDialog } from './NotesDialog.jsx'

const APPLICATION = {
  id: 4,
  companyName: 'Acme Corp',
  role: 'Backend Engineer',
  location: 'Remote',
}

function buildApi(overrides = {}) {
  return {
    listNotes: vi.fn().mockResolvedValue([
      { id: 11, content: 'Phone screen booked', jobApplicationId: 4 },
    ]),
    createNote: vi.fn().mockResolvedValue({
      id: 12,
      content: 'Take home sent',
      jobApplicationId: 4,
    }),
    deleteNote: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('NotesDialog', () => {
  it('lists the notes returned by the nested note route', async () => {
    const api = buildApi()
    renderWithAuth(
      <NotesDialog application={APPLICATION} onClose={() => {}} onNotesChanged={() => {}} />,
      { api },
    )

    expect(await screen.findByText('Phone screen booked')).toBeInTheDocument()
    expect(api.listNotes).toHaveBeenCalledWith(4, expect.anything())
  })

  it('shows an empty state when there are no notes', async () => {
    const api = buildApi({ listNotes: vi.fn().mockResolvedValue([]) })
    renderWithAuth(
      <NotesDialog application={APPLICATION} onClose={() => {}} onNotesChanged={() => {}} />,
      { api },
    )

    expect(await screen.findByText('No notes yet')).toBeInTheDocument()
  })

  it('refuses to send a blank note', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(
      <NotesDialog application={APPLICATION} onClose={() => {}} onNotesChanged={() => {}} />,
      { api },
    )

    await screen.findByText('Phone screen booked')
    await user.type(screen.getByLabelText('Add a note'), '    ')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    expect(await screen.findByText('Write a note before saving.')).toBeInTheDocument()
    expect(api.createNote).not.toHaveBeenCalled()
  })

  it('adds a note and reports the change', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    const onNotesChanged = vi.fn()
    renderWithAuth(
      <NotesDialog application={APPLICATION} onClose={() => {}} onNotesChanged={onNotesChanged} />,
      { api },
    )

    await screen.findByText('Phone screen booked')
    await user.type(screen.getByLabelText('Add a note'), '  Take home sent  ')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    await waitFor(() => expect(api.createNote).toHaveBeenCalledWith(4, { content: 'Take home sent' }))
    expect(await screen.findByText('Take home sent')).toBeInTheDocument()
    expect(onNotesChanged).toHaveBeenCalled()
  })

  it('shows the backend validation message for note content', async () => {
    const user = userEvent.setup()
    const api = buildApi({
      createNote: vi.fn().mockRejectedValue(
        new ApiError('Bad request', {
          status: 400,
          fieldErrors: { content: 'Note content must be 500 characters or fewer' },
        }),
      ),
    })
    renderWithAuth(
      <NotesDialog application={APPLICATION} onClose={() => {}} onNotesChanged={() => {}} />,
      { api },
    )

    await screen.findByText('Phone screen booked')
    await user.type(screen.getByLabelText('Add a note'), 'A note')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    expect(
      await screen.findByText('Note content must be 500 characters or fewer'),
    ).toBeInTheDocument()
  })

  it('deletes a note through the nested note route', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    const onNotesChanged = vi.fn()
    renderWithAuth(
      <NotesDialog application={APPLICATION} onClose={() => {}} onNotesChanged={onNotesChanged} />,
      { api },
    )

    await screen.findByText('Phone screen booked')
    await user.click(screen.getByRole('button', { name: 'Delete note' }))

    await waitFor(() => expect(api.deleteNote).toHaveBeenCalledWith(4, 11))
    await waitFor(() => expect(screen.queryByText('Phone screen booked')).not.toBeInTheDocument())
    expect(onNotesChanged).toHaveBeenCalled()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithAuth(
      <NotesDialog application={APPLICATION} onClose={onClose} onNotesChanged={() => {}} />,
      { api: buildApi() },
    )

    await screen.findByText('Phone screen booked')
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
