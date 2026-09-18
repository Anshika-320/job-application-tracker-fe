import { useAuth } from './auth/useAuth.js'
import { Dashboard } from './components/Dashboard.jsx'
import { LoginScreen } from './components/LoginScreen.jsx'

export function App() {
  const { isAuthenticated } = useAuth()

  return isAuthenticated ? <Dashboard /> : <LoginScreen />
}
