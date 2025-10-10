import React from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/nl-be'
dayjs.locale('nl-be')
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './modules/auth/Login'
import ActivateAccountPage from './modules/pages/ActivateAccountPage'
import RequestPasswordResetPage from './modules/pages/RequestPasswordResetPage'
import ResetPasswordPage from './modules/pages/ResetPasswordPage'
import ProtectedRoute from './modules/common/ProtectedRoute'
import SuperAdminDashboard from './modules/dashboards/SuperAdminDashboard'
import SuperAdminBaseUrlSettings from './modules/pages/SuperAdminBaseUrlSettings'
import AdminDashboard from './modules/dashboards/AdminDashboard'
import MetricsDashboard from './modules/dashboards/MetricsDashboard'
import TrainerDashboard from './modules/dashboards/TrainerDashboard'
import AthleteDashboard from './modules/dashboards/AthleteDashboard'
import Settings from './modules/pages/Settings'
import GroupsPage from './modules/pages/GroupsPage'
import UsersPage from './modules/pages/UsersPage'
import TrainingsPage from './modules/pages/TrainingsPage'
import QuestionnairesPage from './modules/pages/QuestionnairesPage'
import AnalyticsPage from './modules/pages/AnalyticsPage'
import NotificationsInbox from './modules/pages/NotificationsInbox'
import TrainerCreateNotificationPage from './modules/pages/TrainerCreateNotificationPage'
import SeasonsPage from './modules/pages/SeasonsPage'
import CreateNotificationPage from './modules/pages/CreateNotificationPage'
import PushConfigAdmin from './modules/pages/PushConfigAdmin'
import ClubMembersPage from './modules/pages/ClubMembersPage'
import AdminBackupPage from './modules/pages/AdminBackupPage'
import AdminSmtpRoute from './modules/pages/AdminSmtpRoute'
import ClubsPage from './modules/pages/ClubsPage'
import AthleteTrainingsRoute from './modules/pages/AthleteTrainingsRoute'
import AthleteQuestionnairesRoute from './modules/pages/AthleteQuestionnairesRoute'
import GoalsPage from './modules/pages/GoalsPage'
import Layout from './modules/common/Layout'
import { GlobalStyles, useTheme } from '@mui/material'

export default function App(){
  const theme = useTheme()
  return (
    <>
      <GlobalStyles styles={{
        ':root': {
          // Align calendar surface with card background (paper) in both modes
          '--ti-fc-page-bg': theme.palette.background.paper,
          '--ti-fc-neutral-bg': theme.palette.action.hover,
          '--ti-fc-border': theme.palette.divider,
          '--ti-fc-event-bg': theme.palette.primary.main,
          '--ti-fc-event-text': theme.palette.primary.contrastText,
          '--ti-fc-today-outline': theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main
        },
        '.fc': {
          backgroundColor: 'var(--ti-fc-page-bg)'
        },
        '.fc .fc-daygrid-day': {
          backgroundColor: 'transparent'
        },
        '.fc .fc-daygrid-day.fc-day-today': {
          backgroundColor: 'transparent',
          position: 'relative'
        },
        '.fc .fc-daygrid-day.fc-day-today::after': {
          content: '""',
          position: 'absolute',
          inset: 2,
          border: '2px solid var(--ti-fc-today-outline)',
          borderRadius: 6,
          pointerEvents: 'none'
        },
        '.fc-theme-standard td, .fc-theme-standard th': {
          borderColor: 'var(--ti-fc-border)'
        },
        '.fc .fc-daygrid-day-number': {
          color: theme.palette.text.primary
        },
        '.fc .fc-daygrid-event': {
          backgroundColor: 'var(--ti-fc-event-bg)',
          color: 'var(--ti-fc-event-text)',
          border: '1px solid var(--ti-fc-event-bg)'
        },
        '.fc .fc-daygrid-event:hover': {
          filter: 'brightness(1.05)'
        },
        '.fc .fc-scrollgrid, .fc .fc-scrollgrid-section': {
          backgroundColor: 'var(--ti-fc-page-bg)'
        },
        // Remove possible white sliver on top/left by ensuring scrollgrid root inherits background
        '.fc .fc-scrollgrid': {
          borderLeft: '0 !important',
          borderTop: '0 !important'
        },
        '.ti-calendar-wrapper': {
          backgroundColor: 'var(--ti-fc-page-bg)',
          position: 'relative',
          border: '1px solid var(--ti-fc-border)',
          borderRadius: 8,
          overflow: 'hidden',
          padding: '8px'
        },
        '.ti-calendar-wrapper .fc-scrollgrid': {
          backgroundColor: 'var(--ti-fc-page-bg)'
        },
        // Header (day names) row styling, especially for dark mode where default was too light
        '.fc .fc-col-header, .fc .fc-col-header-cell, .fc-theme-standard th': {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          boxShadow: 'none',
          borderTop: '1px solid var(--ti-fc-border)'
        },
        '.fc .fc-col-header-cell-cushion': {
          padding: '4px 8px',
          fontWeight: 500,
          fontSize: '0.85rem'
        },
        // Remove double/thick right border on header & last column
        '.fc .fc-col-header-cell:last-of-type, .fc-theme-standard th:last-of-type': {
          borderRight: '0 !important'
        },
        '.fc-theme-standard td:last-of-type': {
          borderRight: '0 !important'
        }
      }} />
      <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/activate" element={<ActivateAccountPage />} />
  <Route path="/reset" element={<ResetPasswordPage />} />
  <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
  <Route path="/forgot" element={<RequestPasswordResetPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute roles={['ROLE_SUPERADMIN','ROLE_ADMIN','ROLE_TRAINER','ROLE_ATHLETE']} />}>
          <Route path="" element={<DashboardRouter />} />
          <Route path="settings" element={<Settings />} />
          {/* SuperAdmin */}
          <Route path="clubs" element={<SuperAdminOnly><ClubsPage /></SuperAdminOnly>} />
          <Route path="admins" element={<SuperAdminOnly><UsersPage title="Admins" defaultRole="ROLE_ADMIN" /></SuperAdminOnly>} />
          <Route path="super/base-url" element={<SuperAdminOnly><SuperAdminBaseUrlSettings /></SuperAdminOnly>} />
          {/* Users (admins & superadmins) */}
          <Route path="backup" element={<SuperAdminOnly><AdminBackupPage /></SuperAdminOnly>} />
          {/* Admin */}
          <Route path="trainers" element={<AdminOnly><UsersPage title="Trainers" defaultRole="ROLE_TRAINER" /></AdminOnly>} />
          <Route path="athletes" element={<TrainerOrAdmin><UsersPage title="Athletes" defaultRole="ROLE_ATHLETE" /></TrainerOrAdmin>} />
          <Route path="users" element={<AdminOnly>{(() => {
            const stored = JSON.parse(localStorage.getItem('ti_auth') || '{}')
            const roles = stored?.roles || []
            const title = roles.includes('ROLE_SUPERADMIN') ? 'All Users' : 'Users'
            return <UsersPage title={title} defaultRole="ALL" />
          })()}</AdminOnly>} />
          <Route path="club-members" element={<AdminOnly><ClubMembersPage /></AdminOnly>} />
          <Route path="push-config" element={<SuperAdminOnly><PushConfigAdmin /></SuperAdminOnly>} />
          <Route path="smtp" element={<AdminOnly><AdminSmtpRoute /></AdminOnly>} />
          <Route path="seasons" element={<AdminOnly><SeasonsPage /></AdminOnly>} />
          {/* Trainer */}
          <Route path="groups" element={<TrainerOnly><GroupsPage /></TrainerOnly>} />
          <Route path="trainings" element={<TrainerOnly><TrainingsPage /></TrainerOnly>} />
          <Route path="questionnaires" element={<TrainerOnly><QuestionnairesPage /></TrainerOnly>} />
          <Route path="trainer/goals" element={<TrainerOnly><GoalsPage /></TrainerOnly>} />
          <Route path="analytics" element={<TrainerOnly><AnalyticsPage /></TrainerOnly>} />
          {/* Shared */}
          <Route path="notifications" element={<ProtectedRoute roles={['ROLE_SUPERADMIN','ROLE_ADMIN','ROLE_TRAINER','ROLE_ATHLETE']} />}> 
            <Route path="" element={<NotificationsInbox />} />
          </Route>
          {/* Use Admin create notification page for Admins, Trainer page for trainers */}
          <Route path="create-notification" element={<TrainerOrAdmin>
            {(() => {
              const stored = JSON.parse(localStorage.getItem('ti_auth') || '{}')
              const roles = stored?.roles || []
              return roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPERADMIN') ? <CreateNotificationPage /> : <TrainerCreateNotificationPage />
            })()}
          </TrainerOrAdmin>} />
          {/* Athlete */}
          <Route path="athlete/trainings" element={<ProtectedRoute roles={["ROLE_ATHLETE","ROLE_TRAINER","ROLE_ADMIN","ROLE_SUPERADMIN"]} />}>
            <Route path="" element={<AthleteTrainingsRoute />} />
          </Route>
          <Route path="athlete/questionnaires" element={<ProtectedRoute roles={["ROLE_ATHLETE","ROLE_TRAINER","ROLE_ADMIN","ROLE_SUPERADMIN"]} />}>
            <Route path="" element={<AthleteQuestionnairesRoute />} />
          </Route>
          <Route path="athlete/goals" element={<ProtectedRoute roles={["ROLE_ATHLETE","ROLE_TRAINER","ROLE_ADMIN","ROLE_SUPERADMIN"]} />}>
            <Route path="" element={<GoalsPage />} />
          </Route>
          {/* Athlete tab sections are handled via section events + default dashboard route */}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

function DashboardRouter(){
  const stored = JSON.parse(localStorage.getItem('ti_auth') || '{}')
  const roles = stored?.roles || []
  // Superadmin/Admin default to new metrics dashboard
  if (roles.includes('ROLE_SUPERADMIN') || roles.includes('ROLE_ADMIN')) return <MetricsDashboard />
  if (roles.includes('ROLE_TRAINER')) {
    // ensure default trainings calendar view for trainer landing
    try {
      if (!localStorage.getItem('trainings.viewMode')) localStorage.setItem('trainings.viewMode','calendar')
    } catch(e){}
    return <Navigate to="/dashboard/trainings" replace />
  }
  return <AthleteDashboard />
}

// Simple role wrappers for route elements
function RoleGate({ allow, children }){
  const stored = JSON.parse(localStorage.getItem('ti_auth') || '{}')
  const roles = stored?.roles || []
  const ok = allow.some(r => roles.includes(r))
  return ok ? children : <Navigate to="/dashboard" replace />
}
const SuperAdminOnly = ({ children }) => <RoleGate allow={["ROLE_SUPERADMIN"]}>{children}</RoleGate>
const AdminOnly = ({ children }) => <RoleGate allow={["ROLE_ADMIN","ROLE_SUPERADMIN"]}>{children}</RoleGate>
const TrainerOnly = ({ children }) => <RoleGate allow={["ROLE_TRAINER","ROLE_ADMIN","ROLE_SUPERADMIN"]}>{children}</RoleGate>
const TrainerOrAdmin = ({ children }) => <RoleGate allow={["ROLE_TRAINER","ROLE_ADMIN","ROLE_SUPERADMIN"]}>{children}</RoleGate>

// Wrappers for pages needing extra params/state
// no wrappers needed
