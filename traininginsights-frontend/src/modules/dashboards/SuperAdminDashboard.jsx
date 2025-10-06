import React, { useState } from 'react'
import { Box, Typography, Tabs, Tab } from '@mui/material'
import SuperAdminBaseUrlSettings from '../pages/SuperAdminBaseUrlSettings'
export default function SuperAdminDashboard(){
  const [tab, setTab] = useState('baseUrl')
  return (
    <Box>
      <Typography variant="h6" sx={{ mb:1 }}>Super Admin</Typography>
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} sx={{ mb:2 }}>
        <Tab label="Base URL" value="baseUrl" />
      </Tabs>
      {tab === 'baseUrl' && <SuperAdminBaseUrlSettings />}
    </Box>
  )
}
