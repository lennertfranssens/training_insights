import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
export default function ProtectedRoute({ roles = [] }){
  const stored = JSON.parse(localStorage.getItem('ti_auth') || 'null')
  if (!stored) return <Navigate to="/login" replace />
  if (roles.length > 0) {
    const ok = roles.some(r => stored.roles?.includes(r))
    if (!ok) return <Navigate to="/login" replace />
  }
  return <Outlet />
}
