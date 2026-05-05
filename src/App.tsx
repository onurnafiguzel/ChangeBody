import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/dashboard/Dashboard'
import ProfileCompletion from './pages/onboarding/ProfileCompletion'
import ExercisesPage from './pages/exercises/ExercisesPage'
import PackagesPage from './pages/packages/PackagesPage'
import { getStoredUser } from './services/auth'

function AuthGate() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  if (getStoredUser()) return <Navigate to="/dashboard" replace />

  if (mode === 'login') {
    return <LoginPage onSwitchToSignup={() => setMode('signup')} />
  }
  return <SignupPage onSwitchToLogin={() => setMode('login')} />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getStoredUser()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthGate />} />
        <Route path="/signup" element={<AuthGate />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <ProfileCompletion />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/exercises"
          element={
            <RequireAuth>
              <ExercisesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/packages"
          element={
            <RequireAuth>
              <PackagesPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
