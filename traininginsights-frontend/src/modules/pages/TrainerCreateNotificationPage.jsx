import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button } from '@mui/material'
import { useSnackbar } from '../common/SnackbarProvider'
import { useAuth } from '../auth/AuthContext'

export default function TrainerCreateNotificationPage(){
  const [clubs, setClubs] = useState([])
  const [selectedClubs, setSelectedClubs] = useState([])
    const [groups, setGroups] = useState([])
    const [selectedGroups, setSelectedGroups] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const { auth } = useAuth()

  useEffect(()=>{
    // load clubs but restrict to trainer's clubs (fallback: server may already filter)
    (async ()=>{
      try{
        const [{data:allClubs}, {data:me}, {data:allGroups}] = await Promise.all([api.get('/api/clubs'), api.get('/api/users/me'), api.get('/api/groups')])
        const allowed = (me?.clubIds || auth?.clubIds || [])
        const filtered = (allClubs || []).filter(c => allowed.includes(c.id))
        setClubs(filtered)
        // filter groups to those that belong to trainer's clubs and where trainer is listed
        const trainerGroups = (allGroups || []).filter(g => (g.trainerIds || []).includes(me?.id)).filter(g => (g.clubIds || []).some(cid => allowed.includes(cid)))
        setGroups(trainerGroups)
      }catch(e){
        // fallback to empty
        try{ const {data:allClubs} = await api.get('/api/clubs'); setClubs(allClubs || []) }catch(err){}
      }
    })()
  }, [])

  useEffect(()=>{
    try{
      const raw = sessionStorage.getItem('preselectedNotificationClubs')
      if (raw){
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length>0) setSelectedClubs(arr.filter(id => clubs.some(c=>c.id===id)))
        sessionStorage.removeItem('preselectedNotificationClubs')
      }
    }catch(e){}
  }, [clubs])

  const { showSnackbar } = useSnackbar()
  const send = async () => {
    if (!title || !body) return showSnackbar('Provide title and body')
    try{
      // If user selected groups (non-empty) -> send to groups (but treat -1 NONE as no-groups)
      const realGroups = (selectedGroups || []).filter(g => g !== -1)
      if (realGroups.length>0) {
        const { data } = await api.post('/api/notifications/batch/group/send', { ids: realGroups, title, body })
        showSnackbar('Notifications dispatched')
        return
      }
      // No groups selected -> send to full club(s)
      if (!selectedClubs || selectedClubs.length===0) return showSnackbar('Select at least one club or group')
      const { data } = await api.post('/api/notifications/batch/club/send', { ids: selectedClubs, title, body })
      showSnackbar('Notifications dispatched')
    }catch(e){ showSnackbar('Send failed: ' + (e.response?.data?.message || e.message || e)) }
  }

  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:2 }}>Create Notification</Typography>
      <Stack spacing={2}>
        {/* Clubs: disabled when actual groups selected (groups override clubs) */}
        <TextField
          select
          label="Clubs"
          SelectProps={{ multiple: true, value: selectedClubs }}
          value={selectedClubs}
          onChange={e=> setSelectedClubs(Array.isArray(e.target.value)?e.target.value:[e.target.value])}
          disabled={selectedGroups && selectedGroups.filter(g => g !== -1).length > 0}
        >
          {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>

        {/* Groups: selecting real groups disables club selector; selecting NONE (-1) means send to full club(s) */}
        <TextField
          select
          label="Groups (optional)"
          SelectProps={{ multiple: true, value: selectedGroups }}
          value={selectedGroups}
          onChange={e=>{
            // Normalize values to numbers (MUI may return strings)
            const raw = Array.isArray(e.target.value) ? e.target.value : [e.target.value]
            const v = raw.map(x => Number(x))
            // If NONE (-1) is selected, make it exclusive
            if (v.includes(-1)) {
              setSelectedGroups([-1])
            } else {
              // remove any -1 if present
              setSelectedGroups(v.filter(x => x !== -1))
            }
          }}
        >
          <MenuItem key={-1} value={-1}>
            &lt;NONE&gt; (send to full club)
          </MenuItem>
          {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>

        <TextField label="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <TextField label="Body" value={body} onChange={e=>setBody(e.target.value)} multiline minRows={3} />
        <div>
          <Button variant="contained" onClick={send}>Send</Button>
        </div>
      </Stack>
    </Paper>
  )
}
