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
          {/* SuperAdmin */}
          <Route path="clubs" element={<SuperAdminOnly><ClubsPage /></SuperAdminOnly>} />
          <Route path="admins" element={<SuperAdminOnly><UsersPage title="Admins" defaultRole="ROLE_ADMIN" /></SuperAdminOnly>} />
          <Route path="backup" element={<SuperAdminOnly><AdminBackupPage /></SuperAdminOnly>} />
          {/* Admin */}
          <Route path="trainers" element={<AdminOnly><UsersPage title="Trainers" defaultRole="ROLE_TRAINER" /></AdminOnly>} />
          <Route path="athletes" element={<TrainerOrAdmin><UsersPage title="Athletes" defaultRole="ROLE_ATHLETE" /></TrainerOrAdmin>} />
          <Route path="club-members" element={<AdminOnly><ClubMembersPage /></AdminOnly>} />
          <Route path="push-config" element={<AdminOnly><PushConfigAdmin /></AdminOnly>} />
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
