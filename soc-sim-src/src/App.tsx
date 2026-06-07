import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Practice from './pages/Practice'
import Compete from './pages/Compete'
import ScenarioDetail from './pages/ScenarioDetail'
import AlertTriage from './pages/AlertTriage'
import { AuthProvider } from './contexts/AuthContext'
import RequireAuth from './components/RequireAuth'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <RequireAuth>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/practice" element={<Practice />} />
              <Route path="/compete" element={<Compete />} />
              <Route path="/scenarios/:id" element={<ScenarioDetail />} />
              <Route path="/scenarios/:id/alerts/:index" element={<AlertTriage />} />
            </Route>
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/practice" replace />} />
          </Routes>
        </RequireAuth>
      </HashRouter>
    </AuthProvider>
  )
}
