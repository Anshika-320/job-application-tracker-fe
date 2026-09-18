import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../api/client.js'
import { renderWithAuth } from '../test/renderWithAuth.jsx'
import { Dashboard } from './Dashboard.jsx'

const APPLICATIONS = [
  {
    id: 1,
    companyName: 'Acme Corp',
    role: 'Backend Engineer',
    status: 'APPLIED',
    location: 'Remote',
    createdAt: '2026-09-01T10:00:00',
    updatedAt: '2026-09-01T10:00:00',
  },
  {
    id: 2,
    companyName: 'Globex',
    role: 'Platform Engineer',
    status: 'INTERVIEW_SCHEDULED',
    location: 'Pune',
    createdAt: '2026-09-05T10:00:00',
    updatedAt: '2026-09-06T10:00:00',
  },
  {
    id: 3,
    companyName: 'Initech',
    role: 'Data Analyst',
    status: 'OFFERED',
    location: 'Remote',
    createdAt: '2026-09-09T10:00:00',
    updatedAt: '2026-09-09T10:00:00',
  },
]

function buildApi(overrides = {}) {
  return {
    listApplications: vi.fn().mockResolvedValue(APPLICATIONS),
    listNoteCounts: vi.fn().mockResolvedValue([
      { applicationId: 1, companyName: 'Acme Corp', noteCount: 2 },
      { applicationId: 2, companyName: 'Globex', noteCount: 0 },
      { applicationId: 3, companyName: 'Initech', noteCount: 1 },
    ]),
    listApplicationsByStatus: vi.fn().mockResolvedValue([APPLICATIONS[1]]),
    listApplicationsByLocation: vi.fn().mockResolvedValue([APPLICATIONS[0], APPLICATIONS[2]]),
    createApplication: vi.fn().mockResolvedValue(APPLICATIONS[0]),
    updateApplication: vi.fn().mockResolvedValue(APPLICATIONS[0]),
    deleteApplication: vi.fn().mockResolvedValue(null),
    listNotes: vi.fn().mockResolvedValue([]),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    ...overrides,
  }
}

describe('Dashboard', () => {
  it('shows totals, interview-stage count and offers', async () => {
    renderWithAuth(<Dashboard />, { api: buildApi() })

    expect(await screen.findByRole('cell', { name: 'Acme Corp' })).toBeInTheDocument()

    const total = screen.getByText('Total applications').closest('div')
    const interviewing = screen.getByText('In interview stage').closest('div')
    const offers = screen.getByText('Offers received').closest('div')

    expect(within(total).getByText('3')).toBeInTheDocument()
    expect(within(interviewing).getByText('1')).toBeInTheDocument()
    expect(within(offers).getByText('1')).toBeInTheDocument()
  })

  it('renders an empty state when nothing has been tracked yet', async () => {
    const api = buildApi({
      listApplications: vi.fn().mockResolvedValue([]),
      listNoteCounts: vi.fn().mockResolvedValue([]),
    })
    renderWithAuth(<Dashboard />, { api })

    expect(await screen.findByText('No applications yet')).toBeInTheDocument()
  })

  it('renders an error state with a retry control', async () => {
    const api = buildApi({
      listApplications: vi.fn().mockRejectedValue(new ApiError('Boom', { status: 500 })),
    })
    renderWithAuth(<Dashboard />, { api })

    expect(await screen.findByText('Could not load your applications')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('searches across company, role and location without extra requests', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })

    await user.type(screen.getByLabelText('Search'), 'Data Analyst')

    await waitFor(() => expect(screen.queryByRole('cell', { name: 'Acme Corp' })).not.toBeInTheDocument())
    expect(screen.getByRole('cell', { name: 'Initech' })).toBeInTheDocument()
    expect(api.listApplications).toHaveBeenCalledTimes(1)
  })

  it('matches a search term against the location field', async () => {
    const user = userEvent.setup()
    renderWithAuth(<Dashboard />, { api: buildApi() })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.type(screen.getByLabelText('Search'), 'Pune')

    await waitFor(() => expect(screen.getByRole('cell', { name: 'Globex' })).toBeInTheDocument())
    expect(screen.queryByRole('cell', { name: 'Initech' })).not.toBeInTheDocument()
  })

  it('filters by status through the server route', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.selectOptions(screen.getByLabelText('Status'), 'INTERVIEW_SCHEDULED')

    await waitFor(() =>
      expect(api.listApplicationsByStatus).toHaveBeenCalledWith(
        'INTERVIEW_SCHEDULED',
        expect.anything(),
      ),
    )
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'Acme Corp' })).not.toBeInTheDocument())
    expect(screen.getByRole('cell', { name: 'Globex' })).toBeInTheDocument()
  })

  it('filters by location through the server route', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.selectOptions(screen.getByLabelText('Location'), 'Remote')

    await waitFor(() =>
      expect(api.listApplicationsByLocation).toHaveBeenCalledWith('Remote', expect.anything()),
    )
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'Globex' })).not.toBeInTheDocument())
  })

  it('requires confirmation before deleting and then calls the API', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.click(screen.getByRole('button', { name: /Delete Acme Corp/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/deletes the Backend Engineer application at Acme Corp/)).toBeInTheDocument()
    expect(api.deleteApplication).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Delete application' }))

    await waitFor(() => expect(api.deleteApplication).toHaveBeenCalledWith(1))
  })

  it('validates the create form before sending a request', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.click(screen.getByRole('button', { name: 'Add application' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Add application' }))

    expect(await within(dialog).findByText('Company name is required.')).toBeInTheDocument()
    expect(within(dialog).getByText('Role is required.')).toBeInTheDocument()
    expect(api.createApplication).not.toHaveBeenCalled()
  })

  it('sends the backend field names when creating an application', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.click(screen.getByRole('button', { name: 'Add application' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Company name'), 'Umbrella')
    await user.type(within(dialog).getByLabelText(/^Role/), 'SRE')
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'INTERVIEWED')
    await user.type(within(dialog).getByLabelText(/^Location/), 'Bengaluru')
    await user.click(within(dialog).getByRole('button', { name: 'Add application' }))

    await waitFor(() =>
      expect(api.createApplication).toHaveBeenCalledWith({
        companyName: 'Umbrella',
        role: 'SRE',
        status: 'INTERVIEWED',
        location: 'Bengaluru',
      }),
    )
  })

  it('shows backend validation errors on the matching field', async () => {
    const user = userEvent.setup()
    const api = buildApi({
      createApplication: vi.fn().mockRejectedValue(
        new ApiError('Bad request', {
          status: 400,
          fieldErrors: { companyName: 'Company name must be 150 characters or fewer' },
        }),
      ),
    })
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.click(screen.getByRole('button', { name: 'Add application' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Company name'), 'Umbrella')
    await user.type(within(dialog).getByLabelText(/^Role/), 'SRE')
    await user.click(within(dialog).getByRole('button', { name: 'Add application' }))

    expect(
      await within(dialog).findByText('Company name must be 150 characters or fewer'),
    ).toBeInTheDocument()
  })

  it('prefills the edit form and updates by id', async () => {
    const user = userEvent.setup()
    const api = buildApi()
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Globex' })
    await user.click(screen.getByRole('button', { name: /Edit Globex/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Company name')).toHaveValue('Globex')
    expect(within(dialog).getByLabelText('Status')).toHaveValue('INTERVIEW_SCHEDULED')

    await user.clear(within(dialog).getByLabelText('Company name'))
    await user.type(within(dialog).getByLabelText('Company name'), 'Globex International')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(api.updateApplication).toHaveBeenCalledWith(2, {
        companyName: 'Globex International',
        role: 'Platform Engineer',
        status: 'INTERVIEW_SCHEDULED',
        location: 'Pune',
      }),
    )
  })

  it('never shows results from a previous filter while the next request is in flight', async () => {
    const user = userEvent.setup()
    const api = buildApi({
      listApplicationsByLocation: vi.fn().mockReturnValue(new Promise(() => {})),
    })
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })

    await user.selectOptions(screen.getByLabelText('Status'), 'INTERVIEW_SCHEDULED')
    await waitFor(() => expect(screen.getByRole('cell', { name: 'Globex' })).toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText('Status'), '')
    await user.selectOptions(screen.getByLabelText('Location'), 'Remote')

    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: 'Globex' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('cell', { name: 'Acme Corp' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Initech' })).toBeInTheDocument()
  })

  it('narrows the status route result by location when both filters are set', async () => {
    const user = userEvent.setup()
    const api = buildApi({
      listApplicationsByStatus: vi.fn().mockResolvedValue([APPLICATIONS[1], APPLICATIONS[2]]),
    })
    renderWithAuth(<Dashboard />, { api })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    await user.selectOptions(screen.getByLabelText('Status'), 'INTERVIEW_SCHEDULED')
    await user.selectOptions(screen.getByLabelText('Location'), 'Remote')

    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: 'Globex' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('cell', { name: 'Initech' })).toBeInTheDocument()
    expect(api.listApplicationsByStatus).toHaveBeenCalled()
    expect(api.listApplicationsByLocation).not.toHaveBeenCalled()
  })

  it('shows the note count from the note-counts route', async () => {
    renderWithAuth(<Dashboard />, { api: buildApi() })

    await screen.findByRole('cell', { name: 'Acme Corp' })
    expect(screen.getByRole('button', { name: /2 notes for Acme Corp/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1 note for Initech/ })).toBeInTheDocument()
  })
})
