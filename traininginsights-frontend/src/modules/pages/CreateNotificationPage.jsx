import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button } from '@mui/material'
import { useSnackbar } from '../common/SnackbarProvider'

export default function CreateNotificationPage(){
  const [clubs, setClubs] = useState([])
  const [selectedClubs, setSelectedClubs] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  useEffect(()=>{ api.get('/api/clubs').then(r=> setClubs(r.data)).catch(()=>{}) }, [])
  // read preselected clubs (set by other pages like GroupsPage) and clear
  useEffect(()=>{
    try{
      const raw = sessionStorage.getItem('preselectedNotificationClubs')
      if (raw){
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length>0) setSelectedClubs(arr)
        sessionStorage.removeItem('preselectedNotificationClubs')
      }
    }catch(e){}
  }, [])
  const { showSnackbar } = useSnackbar()
  const send = async () => {
    if (!title || !body || selectedClubs.length===0) return showSnackbar('Provide title, body and at least one club')
    try{
      const { data } = await api.post('/api/notifications/batch/club/send', { ids: selectedClubs, title, body })
      showSnackbar('Notifications dispatched')
    }catch(e){ showSnackbar('Send failed: ' + (e.message || e)) }
  }
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:2 }}>Create Notification</Typography>
      <Stack spacing={2}>
        <TextField select label="Clubs" SelectProps={{ multiple: true, value: selectedClubs }} value={selectedClubs} onChange={e=> setSelectedClubs(Array.isArray(e.target.value)?e.target.value:[e.target.value])}>
          {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
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
