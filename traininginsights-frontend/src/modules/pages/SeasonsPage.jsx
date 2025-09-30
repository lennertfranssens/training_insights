import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, TextField } from '@mui/material'

export default function SeasonsPage(){
  const [seasons, setSeasons] = useState([])
  const [name, setName] = useState('')
  const load = async () => { const { data } = await api.get('/api/admin/seasons'); setSeasons(data || []) }
  useEffect(()=>{ load() }, [])
  const create = async () => {
    if (!name) return
    await api.post('/api/admin/seasons', { name })
    setName('')
    await load()
  }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Seasons</Typography>
        <div style={{ display:'flex', gap:8 }}>
          <TextField label="Name" value={name} onChange={e=>setName(e.target.value)} size="small" />
          <Button variant="contained" onClick={create}>Create</Button>
        </div>
      </Stack>
      <Stack spacing={1}>
        {seasons.map(s => (
          <Paper key={s.id} sx={{ p:2, display:'flex', justifyContent:'space-between' }}>
            <div>
              <Typography>{s.name}</Typography>
            </div>
            <div>
              <Button color="error" onClick={async()=>{ if (!confirm('Delete season?')) return; await api.delete(`/api/admin/seasons/${s.id}`); await load() }}>Delete</Button>
            </div>
          </Paper>
        ))}
      </Stack>
    </Paper>
  )
}
