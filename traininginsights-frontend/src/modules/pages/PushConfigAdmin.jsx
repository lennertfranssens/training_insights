import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, Button } from '@mui/material'

export default function PushConfigAdmin(){
  const [form, setForm] = useState({ vapidPublic:'', vapidPrivate:'', subject: 'mailto:admin@localhost' })
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ (async ()=>{ try { const { data } = await api.get('/api/push/config'); if (data){ setForm({ vapidPublic: data.vapidPublic || '', vapidPrivate: data.vapidPrivate || '', subject: data.subject || 'mailto:admin@localhost' }) } } catch(e){} finally { setLoading(false) } })() }, [])

  const save = async () => { await api.post('/api/push/config', form); alert('Saved'); }

  if (loading) return <Typography>Loading...</Typography>

  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6">Push configuration</Typography>
      <Stack spacing={2} sx={{ mt:2 }}>
        <TextField label="VAPID public" value={form.vapidPublic} onChange={e=>setForm({...form, vapidPublic: e.target.value})} multiline rows={2} />
        <TextField label="VAPID private" value={form.vapidPrivate} onChange={e=>setForm({...form, vapidPrivate: e.target.value})} multiline rows={2} />
        <TextField label="Subject" value={form.subject} onChange={e=>setForm({...form, subject: e.target.value})} />
        <Stack direction="row" spacing={1}><Button variant="contained" onClick={save}>Save</Button></Stack>
      </Stack>
    </Paper>
  )
}
