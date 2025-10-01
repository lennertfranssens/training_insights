import React, { useEffect, useState } from 'react'
import { Tabs, Tab, Box, Paper } from '@mui/material'
import SeasonsPage from '../pages/SeasonsPage'
import CreateNotificationPage from '../pages/CreateNotificationPage'
import NotificationsInbox from '../pages/NotificationsInbox'
import UsersPage from '../pages/UsersPage'
import PushConfigAdmin from '../pages/PushConfigAdmin'
import ClubMembersPage from '../pages/ClubMembersPage'
import ClubSmtpSettings from '../pages/ClubSmtpSettings'
import api from '../api/client'
import UnreadBadge from '../common/UnreadBadge'
export default function AdminDashboard(){
  const [tab, setTab] = useState(0)
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState(null)

  useEffect(()=>{ api.get('/api/clubs').then(r=> setClubs(r.data)).catch(()=>{}); },[])

  useEffect(()=>{
    const handler = (e) => {
      const s = e?.detail?.section
      if (!s) return
      // support explicit tab numeric override
      if (e?.detail?.tab !== undefined && typeof e.detail.tab === 'number') { setTab(e.detail.tab); return }
      if (s === 'trainers') setTab(0)
      if (s === 'athletes') setTab(1)
      if (s === 'clubmembers') setTab(2)
      if (s === 'push') setTab(3)
      if (s === 'smtp') setTab(4)
  // 'Seasons' is tab index 5, 'Notifications' is tab index 6, 'Create Notification' is tab index 7
  if (s === 'notifications') setTab(6)
      if (s === 'users') setTab(0)
      if (s === 'groups') setTab(2)
      if (s === 'trainings') setTab(3)
    }
    window.addEventListener('navigate-dashboard', handler)
    return () => window.removeEventListener('navigate-dashboard', handler)
  },[])

  return (
    <Box>
      <Paper sx={{ p:1, mb:2 }}>
          <Tabs value={tab} onChange={(e,v)=>setTab(v)}>
            <Tab label="Trainers" />
            <Tab label="Athletes" />
            <Tab label="Club Members" />
            <Tab label="Push Config" />
            <Tab label="SMTP Settings" />
            <Tab label="Seasons" />
            <Tab label="Notifications" />
              <Tab label="Create Notification" />
        </Tabs>
      </Paper>
  {tab===0 && <UsersPage title="Trainers" defaultRole="ROLE_TRAINER" />}
      {tab===1 && <UsersPage title="Athletes" defaultRole="ROLE_ATHLETE" />}
      {tab===2 && <ClubMembersPage />}
      {tab===3 && <PushConfigAdmin />}
      {tab===4 && (
        <div>
          <div style={{marginBottom:8}}>
            <label>Club: </label>
            <select onChange={(e)=> setSelectedClub(e.target.value)} value={selectedClub || ''}>
              <option value=''>-- select --</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {selectedClub && <ClubSmtpSettings clubId={selectedClub} />}
        </div>
  )}
    {tab===4 && <></>}
  {tab===5 && <SeasonsPage />}
  {tab===6 && <NotificationsInbox />}
  {tab===7 && <CreateNotificationPage />}
    </Box>
  )
}
