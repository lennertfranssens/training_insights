import React, { useState } from 'react'
import { Tabs, Tab, Box } from '@mui/material'
import GroupsPage from '../pages/GroupsPage'
import UsersPage from '../pages/UsersPage'
import TrainingsPage from '../pages/TrainingsPage'
import QuestionnairesPage from '../pages/QuestionnairesPage'
import AnalyticsPage from '../pages/AnalyticsPage'
export default function TrainerDashboard(){
  const [tab, setTab] = useState(0)
  return (
    <Box>
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} sx={{ mb:2 }}>
        <Tab label="Groups" /><Tab label="Athletes" /><Tab label="Trainings" /><Tab label="Questionnaires" /><Tab label="Analytics" />
      </Tabs>
      {tab===0 && <GroupsPage />}
      {tab===1 && <UsersPage title="Athletes" defaultRole="ROLE_ATHLETE" />}
      {tab===2 && <TrainingsPage />}
      {tab===3 && <QuestionnairesPage />}
      {tab===4 && <AnalyticsPage />}
    </Box>
  )
}
