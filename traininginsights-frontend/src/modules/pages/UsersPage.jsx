import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from '@mui/material'
const allRoles = ['ROLE_ATHLETE','ROLE_TRAINER','ROLE_ADMIN']
export default function UsersPage({ title = 'Users', defaultRole='ROLE_ATHLETE' }){
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole] })
  const load = async () => { const { data } = await api.get('/api/users'); setUsers(data) }
  useEffect(()=>{ load() }, [])
  const create = async () => { await api.post('/api/users', form); setOpen(false); setForm({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole] }); await load() }
  const remove = async (id) => { if (!confirm('Delete user?')) return; await api.delete(`/api/users/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">{title}</Typography>
        <Button variant="contained" onClick={()=>setOpen(true)}>Create</Button>
      </Stack>
      <Stack spacing={1}>
        {users.map(u => (
          <Paper key={u.id} sx={{ p:2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <Typography>{u.firstName} {u.lastName} — {u.email}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
                {u.roles?.map(r => <Chip size="small" key={r} label={r.replace('ROLE_','')} />)}
              </Stack>
            </div>
            <Button color="error" onClick={()=>remove(u.id)}>Delete</Button>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="First name" value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} />
            <TextField label="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} />
            <TextField label="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
            <TextField label="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
            <TextField select label="Role" value={form.roleNames[0]} onChange={e=>setForm({...form, roleNames:[e.target.value]})}>
              {allRoles.map(r => <MenuItem key={r} value={r}>{r.replace('ROLE_','')}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create}>Create</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
