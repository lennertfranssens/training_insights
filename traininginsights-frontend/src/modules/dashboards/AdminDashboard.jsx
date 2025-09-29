import React, { useState } from 'react'
import { Tabs, Tab, Box } from '@mui/material'
import UsersPage from '../pages/UsersPage'
export default function AdminDashboard(){
  const [tab, setTab] = useState(0)
  return (
    <Box>
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} sx={{ mb:2 }}>
        <Tab label="Trainers" /><Tab label="Athletes" />
      </Tabs>
      {tab===0 && <UsersPage title="Trainers" defaultRole="ROLE_TRAINER" />}
      {tab===1 && <UsersPage title="Athletes" defaultRole="ROLE_ATHLETE" />}
    </Box>
  )
}
