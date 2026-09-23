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
import MyPay from './pages/MyPay'
import Toaster from './components/Toaster'
import { homePath, isWorker } from './api/client'
import { type ReactNode } from 'react'

function RequireStaff({ children }: { children: ReactNode }) {
  if (isWorker()) return <Navigate to="/me" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
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
          <Route index element={<Navigate to={homePath()} replace />} />
          <Route path="me" element={<MyPay />} />
          <Route
            path="workers"
            element={
              <RequireStaff>
                <Workers />
              </RequireStaff>
            }
          />
          <Route
            path="worklogs"
            element={
              <RequireStaff>
                <WorkLogs />
              </RequireStaff>
            }
          />
          <Route
            path="production"
            element={
              <RequireStaff>
                <Production />
              </RequireStaff>
            }
          />
          <Route
            path="wages"
            element={
              <RequireStaff>
                <Wages />
              </RequireStaff>
            }
          />
          <Route
            path="reports"
            element={
              <RequireStaff>
                <Reports />
              </RequireStaff>
            }
          />
          <Route
            path="issues"
            element={
              <RequireStaff>
                <Issues />
              </RequireStaff>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}
