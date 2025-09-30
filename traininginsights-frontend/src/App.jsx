import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './modules/auth/Login'
import Signup from './modules/auth/Signup'
import ProtectedRoute from './modules/common/ProtectedRoute'
import SuperAdminDashboard from './modules/dashboards/SuperAdminDashboard'
import AdminDashboard from './modules/dashboards/AdminDashboard'
import TrainerDashboard from './modules/dashboards/TrainerDashboard'
import AthleteDashboard from './modules/dashboards/AthleteDashboard'
import Settings from './modules/pages/Settings'
import Layout from './modules/common/Layout'

export default function App(){
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute roles={['ROLE_SUPERADMIN','ROLE_ADMIN','ROLE_TRAINER','ROLE_ATHLETE']} />}>
          <Route path="" element={<DashboardRouter />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function DashboardRouter(){
  const stored = JSON.parse(localStorage.getItem('ti_auth') || '{}')
  const roles = stored?.roles || []
  if (roles.includes('ROLE_SUPERADMIN')) return <SuperAdminDashboard />
  if (roles.includes('ROLE_ADMIN')) return <AdminDashboard />
  if (roles.includes('ROLE_TRAINER')) return <TrainerDashboard />
  return <AthleteDashboard />
}
