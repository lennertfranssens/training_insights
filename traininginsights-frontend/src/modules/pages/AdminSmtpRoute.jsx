import React, { useEffect, useState } from 'react'
import { Paper, Typography, Stack, TextField, MenuItem } from '@mui/material'
import api from '../api/client'
import ClubSmtpSettings from './ClubSmtpSettings'

export default function AdminSmtpRoute(){
  const [clubs, setClubs] = useState([])
  const [clubId, setClubId] = useState('')
  useEffect(()=>{ api.get('/api/clubs').then(r=> setClubs(r.data)).catch(()=>{}) },[])
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:2 }}>SMTP Settings</Typography>
      <Stack direction={{ xs:'column', sm:'row' }} spacing={2} sx={{ mb:2 }}>
        <TextField select label="Club" value={clubId} onChange={e=>setClubId(e.target.value)} sx={{ minWidth: 240 }}>
          <MenuItem value="">-- select --</MenuItem>
          {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
      </Stack>
      {clubId ? <ClubSmtpSettings clubId={clubId} /> : <Typography variant="body2" color="text.secondary">Select a club to edit SMTP settings</Typography>}
    </Paper>
  )
}
