import React, { useEffect, useState } from 'react'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import api from '../api/client'

export default function ClubsPage(){
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const load = async () => { const { data } = await api.get('/api/clubs'); setItems(data || []) }
  useEffect(()=>{ load() }, [])
  const create = async () => { await api.post('/api/clubs', { name }); setOpen(false); setName(''); await load() }
  const remove = async (id) => { if (!confirm('Delete club?')) return; await api.delete(`/api/clubs/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Clubs</Typography>
        <Button variant="contained" onClick={()=>setOpen(true)}>Create</Button>
      </Stack>
      <Stack spacing={1}>
        {items.map(c => (
          <Paper key={c.id} sx={{ p:2, display:'flex', justifyContent:'space-between' }}>
            <Typography>{c.name}</Typography>
            <Button color="error" onClick={()=>remove(c.id)}>Delete</Button>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>Create Club</DialogTitle>
        <DialogContent><TextField label="Name" value={name} onChange={e=>setName(e.target.value)} sx={{ mt:1 }} /></DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={create}>Create</Button></DialogActions>
      </Dialog>
    </Paper>
  )
}
