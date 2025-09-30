import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from '@mui/material'
const allRoles = ['ROLE_ATHLETE','ROLE_TRAINER','ROLE_ADMIN']
export default function UsersPage({ title = 'Users', defaultRole='ROLE_ATHLETE' }){
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole], clubIds: [], birthDate:'', athleteCategory: 'SENIOR' })
  const [clubs, setClubs] = useState([])
  const [me, setMe] = useState(null)
  const [groups, setGroups] = useState([])
  const load = async () => { const { data } = await api.get('/api/users'); setUsers(data) }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ (async ()=>{ const [{data:clubsData},{data:meData}] = await Promise.all([api.get('/api/clubs'), api.get('/api/users/me')]); setClubs(clubsData || []); setMe(meData); })() }, [])
  useEffect(()=>{ (async ()=>{ const { data } = await api.get('/api/groups'); setGroups(data || []) })() }, [])
  const create = async () => {
    const payload = { ...form }
    await api.post('/api/users', payload)
    setOpen(false); setEditingUser(null)
    setForm({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole], clubIds: [], groupId: null, birthDate:'', athleteCategory:'SENIOR' })
    await load()
  }

  const save = async () => {
    const payload = { ...form }
    if (editingUser) {
      await api.put(`/api/users/${editingUser.id}`, payload)
    } else {
      await api.post('/api/users', payload)
    }
    setOpen(false); setEditingUser(null)
    setForm({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole], clubIds: [], groupId: null, birthDate:'', athleteCategory:'SENIOR' })
    await load()
  }
  const remove = async (id) => { if (!confirm('Delete user?')) return; await api.delete(`/api/users/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
  <Typography variant="h6">{title}</Typography>
  <Button variant="contained" onClick={()=>{ setForm({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole], clubIds: [], groupId: null }); setOpen(true); }}>Create</Button>
      </Stack>
      <Stack spacing={1}>
  {users.filter(u => {
          // only show users relevant for this page: filter by defaultRole and caller scope
          if (!u.roles?.includes(defaultRole)) return false
          // superadmin sees all for admins page; admins should see users in their clubs only
          if (me?.roles?.includes('ROLE_SUPERADMIN')) return true
          const userClubIds = u.clubIds || []
          return (me?.clubIds || []).some(id => userClubIds.includes(id))
        }).map(u => (
          <Paper key={u.id} sx={{ p:2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <Typography>{u.firstName} {u.lastName} — {u.email}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
                {u.roles?.map(r => <Chip size="small" key={r} label={r.replace('ROLE_','')} />)}
              </Stack>
            </div>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => {
                setEditingUser(u);
                setForm({
                  firstName: u.firstName,
                  lastName: u.lastName,
                  email: u.email,
                  password: '',
                  roleNames: [u.roles?.[0] || defaultRole],
                  clubIds: u.clubIds || [],
                  groupId: u.groupId || null,
                  birthDate: u.birthDate || '',
                  athleteCategory: u.athleteCategory || 'SENIOR'
                });
                setOpen(true);
              }}>Edit</Button>
              <Button color="error" onClick={()=>remove(u.id)}>Delete</Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="First name" value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} />
            <TextField label="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} />
            <TextField label="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
            <TextField label="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
            <TextField type="date" label="Birth date" InputLabelProps={{ shrink: true }} value={form.birthDate} onChange={e=>setForm({...form, birthDate: e.target.value})} />
            {/* If defaultRole is provided by parent, use it and hide the selector. Otherwise show role choices constrained by caller role. */}
            {defaultRole ? (
              <TextField label="Role" value={defaultRole} InputProps={{ readOnly: true }} />
            ) : (
              <TextField select label="Role" value={form.roleNames[0]} onChange={e=>setForm({...form, roleNames:[e.target.value], clubIds: [], groupId: null})}>
                {(me?.roles?.includes('ROLE_SUPERADMIN') ? allRoles : (me?.roles?.includes('ROLE_ADMIN') ? ['ROLE_TRAINER','ROLE_ATHLETE'] : ['ROLE_ATHLETE'])).map(r => <MenuItem key={r} value={r}>{r.replace('ROLE_','')}</MenuItem>)}
              </TextField>
            )}
            {/* Club selection: admins/trainers -> multi-select; athletes -> single-select */}
            {form.roleNames[0] !== 'ROLE_ATHLETE' && (
              <TextField select label="Clubs" SelectProps={{ multiple: true, value: form.clubIds }} value={form.clubIds} onChange={e=>setForm({...form, clubIds: Array.isArray(e.target.value)?e.target.value:[e.target.value]})}>
                {(me?.roles?.includes('ROLE_SUPERADMIN') ? clubs : clubs.filter(c => me?.clubIds?.includes(c.id))).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            )}
            {form.roleNames[0] === 'ROLE_ATHLETE' && (
              <>
                <TextField select label="Club" value={form.clubIds[0] || ''} onChange={e=>setForm({...form, clubIds: [e.target.value]})}>
                  {(me?.roles?.includes('ROLE_SUPERADMIN') ? clubs : clubs.filter(c => me?.clubIds?.includes(c.id))).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
                <TextField select label="Athlete Category" value={form.athleteCategory} onChange={e=>setForm({...form, athleteCategory: e.target.value})}>
                  {['CADET','SCHOLIER','JUNIOR','SENIOR'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
                {/* Optional group selection: show groups that are assigned to the selected club */}
                <TextField select label="Group (optional)" value={form.groupId || ''} onChange={e=>setForm({...form, groupId: e.target.value || null})}>
                  <MenuItem value="">None</MenuItem>
                  {groups.filter(g => (g.clubIds || []).includes(form.clubIds[0])).map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setOpen(false); setEditingUser(null); }}>Cancel</Button>
          <Button variant="contained" onClick={save}>{editingUser ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
