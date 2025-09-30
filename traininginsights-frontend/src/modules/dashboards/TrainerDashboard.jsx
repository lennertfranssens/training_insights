import React, { useState } from 'react'
import { Tabs, Tab, Box, Paper } from '@mui/material'
import UnreadBadge from '../common/UnreadBadge'
import GroupsPage from '../pages/GroupsPage'
import UsersPage from '../pages/UsersPage'
import TrainingsPage from '../pages/TrainingsPage'
import QuestionnairesPage from '../pages/QuestionnairesPage'
import AnalyticsPage from '../pages/AnalyticsPage'
import NotificationsInbox from '../pages/NotificationsInbox'
export default function TrainerDashboard(){
  const [tab, setTab] = useState(0)
  React.useEffect(()=>{
    const handler = (e) => {
      const s = e?.detail?.section
      if (!s) return
      if (s === 'groups') setTab(0)
      if (s === 'users') setTab(1)
      if (s === 'trainings') setTab(2)
      if (s === 'questionnaires') setTab(3)
      if (s === 'analytics') setTab(4)
      if (s === 'notifications') setTab(5)
    }
    window.addEventListener('navigate-dashboard', handler)
    return () => window.removeEventListener('navigate-dashboard', handler)
  },[])
  return (
    <Box>
      <Paper sx={{ p:1, mb:2 }}>
        <Tabs value={tab} onChange={(e,v)=>setTab(v)}>
          <Tab label="Groups" />
          <Tab label="Athletes" />
          <Tab label="Trainings" />
          <Tab label="Questionnaires" />
          <Tab label="Analytics" />
          <Tab label="Notifications" />
        </Tabs>
      </Paper>
  {tab===0 && <GroupsPage />}
      {tab===1 && <UsersPage title="Athletes" defaultRole="ROLE_ATHLETE" />}
      {tab===2 && <TrainingsPage />}
      {tab===3 && <QuestionnairesPage />}
      {tab===4 && <AnalyticsPage />}
      {tab===5 && <NotificationsInbox />}
    </Box>
  )
}
