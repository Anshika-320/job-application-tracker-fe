import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError, NetworkError } from '../api/client.js'
import { renderWithAuth } from '../test/renderWithAuth.jsx'
import { LoginScreen } from './LoginScreen.jsx'

describe('LoginScreen', () => {
  it('validates both fields before calling the API', async () => {
    const user = userEvent.setup()
    const login = vi.fn()
    renderWithAuth(<LoginScreen />, { login })

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits trimmed credentials', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockResolvedValue(undefined)
    renderWithAuth(<LoginScreen />, { login })

    await user.type(screen.getByLabelText('Email address'), '  user@example.com  ')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(login).toHaveBeenCalledWith('user@example.com', 'correct-horse')
  })

  it('reports rejected credentials without leaking the raw status text', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue(new ApiError('Unauthorized', { status: 401 }))
    renderWithAuth(<LoginScreen />, { login })

    await user.type(screen.getByLabelText('Email address'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
  })

  it('surfaces backend field errors', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue(
      new ApiError('Bad request', {
        status: 400,
        fieldErrors: { email: 'Email must be valid' },
      }),
    )
    renderWithAuth(<LoginScreen />, { login })

    await user.type(screen.getByLabelText('Email address'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email must be valid')).toBeInTheDocument()
  })

  it('reports an unreachable API', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue(new NetworkError())
    renderWithAuth(<LoginScreen />, { login })

    await user.type(screen.getByLabelText('Email address'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach the server/i)
  })

  it('explains why the user was returned to the login screen', () => {
    renderWithAuth(<LoginScreen />, { sessionExpired: true })

    expect(screen.getByRole('status')).toHaveTextContent('Your session ended.')
  })
})
