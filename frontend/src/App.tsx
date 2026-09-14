import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Workers from './pages/Workers'
import WorkLogs from './pages/WorkLogs'
import Production from './pages/Production'
import Wages from './pages/Wages'
import Reports from './pages/Reports'
import Issues from './pages/Issues'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/worklogs" replace />} />
        <Route path="workers" element={<Workers />} />
        <Route path="worklogs" element={<WorkLogs />} />
        <Route path="production" element={<Production />} />
        <Route path="wages" element={<Wages />} />
        <Route path="reports" element={<Reports />} />
        <Route path="issues" element={<Issues />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
