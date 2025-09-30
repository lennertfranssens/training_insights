import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, Button } from '@mui/material'

export default function Settings(){
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', address:'', password:'', dailyReminderTime: '' })
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ (async ()=>{ try { const { data } = await api.get('/api/users/me'); setForm({ firstName: data.firstName||'', lastName: data.lastName||'', email: data.email||'', phone: data.phone||'', address: data.address||'', dailyReminderTime: data.dailyReminderTime||'', password: '' }); } catch(e){} finally { setLoading(false) } })() }, [])

  const save = async () => {
    const payload = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, address: form.address, password: form.password || null, dailyReminderTime: form.dailyReminderTime };
    await api.put('/api/users/me', payload);
    alert('Saved');
    setForm({...form, password: ''});
  }

  if (loading) return <Typography>Loading...</Typography>

  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6">Settings</Typography>
      <Stack spacing={2} sx={{ mt:2 }}>
        <TextField label="First name" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} />
        <TextField label="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} />
        <TextField label="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
        <TextField label="Phone" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
        <TextField label="Address" value={form.address} onChange={e=>setForm({...form, address: e.target.value})} />
        <TextField type="password" label="New password (leave empty to keep)" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
        <TextField type="time" label="Daily reminder time" InputLabelProps={{ shrink: true }} value={form.dailyReminderTime || ''} onChange={e=>setForm({...form, dailyReminderTime: e.target.value})} />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={save}>Save</Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
