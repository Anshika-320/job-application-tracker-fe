import { render } from '@testing-library/react'
import { AuthContext } from '../auth/authContext.js'

export function renderWithAuth(ui, { api = {}, ...auth } = {}) {
  const value = {
    api,
    token: 'test-token',
    isAuthenticated: true,
    accountEmail: 'user@example.com',
    sessionExpired: false,
    login: async () => {},
    logout: () => {},
    ...auth,
  }

  return render(<AuthContext.Provider value={value}>{ui}</AuthContext.Provider>)
}
