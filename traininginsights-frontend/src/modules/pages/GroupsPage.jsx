import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Checkbox, ListItemText } from '@mui/material'
import { useSnackbar } from '../common/SnackbarProvider'
// Notification creation moved to CreateNotificationPage

export default function GroupsPage(){
  const [groups, setGroups] = useState([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', clubIds: [], trainerIds: [] })
  const [clubs, setClubs] = useState([])
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const { auth } = useAuth()
  // notification UI moved to dedicated page

  const load = async () => { const [{data:groupsData},{data:clubsData},{data:usersData}] = await Promise.all([api.get('/api/groups'), api.get('/api/clubs'), api.get('/api/users')]); setGroups(groupsData || []); setClubs(clubsData || []); setUsers(usersData || []) }
  useEffect(()=>{ (async ()=>{ const {data:meData} = await api.get('/api/users/me'); setMe(meData); await load() })() }, [])

  const { showSnackbar } = useSnackbar()

  const submit = async () => {
    const payload = { name: form.name, clubIds: form.clubIds, trainerIds: form.trainerIds }
    if (editingId){
      await api.put(`/api/groups/${editingId}`, payload)
    } else {
      await api.post('/api/groups', payload)
    }
    setOpen(false); setEditingId(null); setForm({ name:'', clubIds: [], trainerIds: [] }); await load()
  }
  const remove = async (id) => { if (!confirm('Delete group?')) return; await api.delete(`/api/groups/${id}`); await load() }

  // helper to check role strings robustly (accept 'ROLE_X' and 'X')
  const hasRole = (rolesArray, role) => {
    const rs = rolesArray || []
    return rs.some(r => r === role || r === role.replace(/^ROLE_/, '') || ('ROLE_' + r) === role)
  }

  // trainers available: those users with trainer role and in selected clubs (or caller's clubs if none selected)
  const trainerOptions = () => {
    const allowedClubs = form.clubIds && form.clubIds.length > 0 ? form.clubIds : (me?.clubIds || [])
    return users.filter(u => hasRole(u.roles, 'ROLE_TRAINER') && ((u.clubIds || []).some(id => allowedClubs.includes(id)) || (hasRole(me?.roles, 'ROLE_SUPERADMIN')) ))
  }

  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Groups</Typography>
        <Button
          variant="contained"
          onClick={()=>{
            const isTrainer = (me?.roles || []).some(r => r === 'ROLE_TRAINER' || r === 'TRAINER')
            setForm({ name:'', clubIds: [], trainerIds: isTrainer && me?.id ? [me.id] : [] })
            setEditingId(null); setOpen(true)
          }}
        >Create</Button>
      </Stack>
      <Stack spacing={1}>
        {groups.map(g => (
          <Paper key={g.id} sx={{ p:2, display:'flex', justifyContent:'space-between' }}>
            <div>
              <Typography>{g.name}</Typography>
              <Typography variant="body2">Clubs: {(g.clubIds || []).map(cid => (clubs.find(c=>c.id===cid)?.name) || cid).join(', ')}</Typography>
            </div>
            <div>
              {(hasRole(auth?.roles || me?.roles, 'ROLE_ADMIN') || hasRole(auth?.roles || me?.roles, 'ROLE_TRAINER')) && (
                <Button onClick={()=>{ setEditingId(g.id); setForm({ name: g.name, clubIds: g.clubIds || [], trainerIds: g.trainerIds || [] }); setOpen(true) }} sx={{ mr:1 }}>Edit</Button>
              )}
              {(hasRole(auth?.roles || me?.roles, 'ROLE_ADMIN') || hasRole(auth?.roles || me?.roles, 'ROLE_TRAINER')) && (
                <Button color="error" onClick={()=>remove(g.id)} sx={{ mr:1 }}>Delete</Button>
              )}
              {(hasRole(auth?.roles || me?.roles, 'ROLE_TRAINER')) && <Button variant="outlined" onClick={()=> {
                // Prepare Create Notification page with the clubs for this group
                try { sessionStorage.setItem('preselectedNotificationClubs', JSON.stringify(g.clubIds || [])) } catch(e) {}
                // navigate to the correct dashboard tab depending on role: trainers -> tab 6 (trainer create), admins -> tab 7 (admin create)
                const isTrainer = hasRole(auth?.roles || me?.roles, 'ROLE_TRAINER')
                window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: { section: 'notifications', tab: isTrainer ? 6 : 7 } }))
              }}>Send to group</Button>}
            </div>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>{ setOpen(false); setEditingId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Group' : 'Create Group'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
            <TextField select label="Clubs" SelectProps={{ multiple: true, value: form.clubIds }} value={form.clubIds} onChange={e=>setForm({...form, clubIds: Array.isArray(e.target.value)?e.target.value:[e.target.value]})}>
              {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select label="Trainers" SelectProps={{ multiple: true, renderValue: (selected) => selected.map(id => users.find(u=>u.id===id)?.email || id).join(', ')}} value={form.trainerIds} onChange={e=>setForm({...form, trainerIds: Array.isArray(e.target.value)?e.target.value:[e.target.value]})}>
              {trainerOptions().map(u => (
                <MenuItem key={u.id} value={u.id}>
                  <Checkbox checked={form.trainerIds.includes(u.id)} />
                  <ListItemText primary={`${u.firstName} ${u.lastName} — ${u.email}`} />
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setOpen(false); setEditingId(null) }}>Cancel</Button>
          <Button variant="contained" onClick={submit}>{editingId ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
      <div style={{ marginTop: 12 }}>
        {/* Create notifications via Create Notification page */}
      </div>
    </Paper>
  )
}
