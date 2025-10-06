import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from '@mui/material'
import { isoToBelgian, belgianToIso } from '../common/dateUtils'
import { BelgianDatePicker } from '../common/BelgianPickers'
const allRoles = ['ROLE_ATHLETE','ROLE_TRAINER','ROLE_ADMIN']
export default function UsersPage({ title = 'Users', defaultRole='ROLE_ATHLETE' }){
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewUser, setViewUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const initialRole = defaultRole === 'ALL' ? 'ROLE_ATHLETE' : defaultRole
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', roleNames:[initialRole], clubIds: [], birthDate:'', athleteCategory: 'SENIOR', phone:'', address:'' })
  // role filter for listing when defaultRole === 'ALL'
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [clubs, setClubs] = useState([])
  const [me, setMe] = useState(null)
  const [groups, setGroups] = useState([])
  const load = async () => { const { data } = await api.get('/api/users'); setUsers(data) }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ (async ()=>{ const [{data:clubsData},{data:meData}] = await Promise.all([api.get('/api/clubs'), api.get('/api/users/me')]); setClubs(clubsData || []); setMe(meData); })() }, [])
  useEffect(()=>{ (async ()=>{ const { data } = await api.get('/api/groups'); setGroups(data || []) })() }, [])
  const create = async () => {
  const payload = { ...form, birthDate: belgianToIso(form.birthDate) }
    await api.post('/api/users', payload)
    setOpen(false); setEditingUser(null)
  setForm({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole], clubIds: [], groupId: null, birthDate:'', athleteCategory:'SENIOR', phone:'', address:'' })
    await load()
  }

  const save = async () => {
  const payload = { ...form, birthDate: belgianToIso(form.birthDate) }
    if (editingUser) {
      await api.put(`/api/users/${editingUser.id}`, payload)
    } else {
      await api.post('/api/users', payload)
    }
    setOpen(false); setEditingUser(null)
  setForm({ firstName:'', lastName:'', email:'', password:'', roleNames:[defaultRole], clubIds: [], groupId: null, birthDate:'', athleteCategory:'SENIOR', phone:'', address:'' })
    await load()
  }
  const remove = async (id) => { if (!confirm('Delete user?')) return; await api.delete(`/api/users/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
  <Stack direction="row" spacing={2} alignItems="center">
    <Typography variant="h6">{title}</Typography>
    {defaultRole === 'ALL' && (
      <TextField select size="small" label="Role" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} sx={{ minWidth:160 }}>
        <MenuItem value="ALL">All</MenuItem>
        <MenuItem value="ROLE_ADMIN">Admin</MenuItem>
        <MenuItem value="ROLE_TRAINER">Trainer</MenuItem>
        <MenuItem value="ROLE_ATHLETE">Athlete</MenuItem>
      </TextField>
    )}
  </Stack>
  <Button variant="contained" onClick={()=>{ const baseRole = (defaultRole === 'ALL') ? (roleFilter === 'ALL' ? 'ROLE_ATHLETE' : roleFilter) : defaultRole; setForm({ firstName:'', lastName:'', email:'', password:'', roleNames:[baseRole], clubIds: [], groupId: null }); setOpen(true); }}>Create</Button>
      </Stack>
      <Stack spacing={1}>
  {users.filter(u => {
    // Filter by selected role when defaultRole === 'ALL' and roleFilter != ALL
    if (defaultRole === 'ALL') {
      if (roleFilter !== 'ALL' && !u.roles?.includes(roleFilter)) return false
    } else if (!u.roles?.includes(defaultRole)) return false
    // superadmin sees all
    if (me?.roles?.includes('ROLE_SUPERADMIN')) return true
    // admins limited to their clubs
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
              <Button onClick={async()=>{
                try {
                  // Fetch with server-side permission checks (trainers restricted to their athletes)
                  const { data } = await api.get(`/api/users/${u.id}`)
                  setViewUser(data); setViewOpen(true)
                } catch(e) { /* ignore */ }
              }}>View</Button>
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
                  birthDate: isoToBelgian(u.birthDate) || '',
                  athleteCategory: u.athleteCategory || 'SENIOR',
                  phone: u.phone || '',
                  address: u.address || ''
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
            <BelgianDatePicker label="Birth date" value={belgianToIso(form.birthDate)} onChange={(iso)=>{
              // BelgianDatePicker returns iso or null; convert iso back to Belgian for storage to keep prior mapping logic
              setForm({...form, birthDate: iso ? isoToBelgian(iso) : form.birthDate })
            }} />
            <TextField label="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
            <TextField label="Address" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} multiline rows={2} />
            {/* If defaultRole is provided by parent, use it and hide the selector. Otherwise show role choices constrained by caller role. */}
            {(defaultRole && defaultRole !== 'ALL') ? (
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

      {/* View user (read-only) */}
      <Dialog open={viewOpen} onClose={()=>{ setViewOpen(false); setViewUser(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{viewUser ? `${viewUser.firstName || ''} ${viewUser.lastName || ''}` : 'User'}</DialogTitle>
        <DialogContent>
          {viewUser ? (
            <Stack spacing={1} sx={{ mt:1 }}>
              <Typography variant="body2"><strong>Email:</strong> {viewUser.email || ''}</Typography>
              <Typography variant="body2"><strong>Phone:</strong> {viewUser.phone || '—'}</Typography>
              <Typography variant="body2"><strong>Address:</strong> {viewUser.address || '—'}</Typography>
              <Typography variant="body2"><strong>Birth date:</strong> {viewUser.birthDate || '—'}</Typography>
              <Typography variant="body2"><strong>Category:</strong> {viewUser.athleteCategory || '—'}</Typography>
              <Typography variant="body2"><strong>Group:</strong> {viewUser.groupName || '—'}</Typography>
              <Typography variant="body2"><strong>Clubs:</strong> {(viewUser.clubIds||[]).map(cid => (clubs.find(c=>c.id===cid)?.name || cid)).join(', ') || '—'}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {viewUser.active ? 'Active' : 'Inactive'}</Typography>
              {viewUser.dailyReminderTime && (
                <Typography variant="body2"><strong>Daily reminder:</strong> {viewUser.dailyReminderTime}</Typography>
              )}
              <div>
                {(viewUser.roles||[]).map(r => <Chip key={r} size="small" label={r.replace('ROLE_','')} sx={{ mr:0.5, mt:0.5 }} />)}
              </div>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setViewOpen(false); setViewUser(null) }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
