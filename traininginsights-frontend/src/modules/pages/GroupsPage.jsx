import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
export default function GroupsPage(){
  const [groups, setGroups] = useState([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const load = async () => { const { data } = await api.get('/api/groups'); setGroups(data) }
  useEffect(()=>{ load() }, [])
  const create = async () => { await api.post('/api/groups', { name }); setOpen(false); setName(''); await load() }
  const remove = async (id) => { if (!confirm('Delete group?')) return; await api.delete(`/api/groups/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Groups</Typography>
        <Button variant="contained" onClick={()=>setOpen(true)}>Create</Button>
      </Stack>
      <Stack spacing={1}>
        {groups.map(g => (
          <Paper key={g.id} sx={{ p:2, display:'flex', justifyContent:'space-between' }}>
            <Typography>{g.name}</Typography>
            <Button color="error" onClick={()=>remove(g.id)}>Delete</Button>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>Create Group</DialogTitle>
        <DialogContent><TextField label="Name" value={name} onChange={e=>setName(e.target.value)} sx={{ mt:1 }} /></DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={create}>Create</Button></DialogActions>
      </Dialog>
    </Paper>
  )
}
