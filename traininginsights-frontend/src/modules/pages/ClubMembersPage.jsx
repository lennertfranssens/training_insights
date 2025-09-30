import React, { useEffect, useState } from 'react'
import api from '../api/client'
// Compose notification UI moved to a dedicated page for clarity
import { Paper, Typography, Stack, TextField, MenuItem, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'

export default function ClubMembersPage(){
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState('')
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [category, setCategory] = useState('')
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [members, setMembers] = useState([])
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMultiClubs, setComposeMultiClubs] = useState([])
  const [resultsOpen, setResultsOpen] = useState(false)
  const [sendResults, setSendResults] = useState([])
  const [manageOpen, setManageOpen] = useState(false)
  const [manageUser, setManageUser] = useState(null)
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewMembershipId, setRenewMembershipId] = useState(null)
  const [renewSeasonId, setRenewSeasonId] = useState('')

  const load = async () => {
    const [{ data: clubsRes }, { data: seasonsRes }, { data: usersRes }, { data: groupsRes }] = await Promise.all([ api.get('/api/clubs'), api.get('/api/admin/seasons'), api.get('/api/users'), api.get('/api/groups') ])
    setClubs(clubsRes || []); setSeasons(seasonsRes || []); setUsers(usersRes || []); setGroups(groupsRes || [])
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ api.get('/api/users/me').then(r=> setMe(r.data)).catch(()=>{}) }, [])

  const loadMembers = async () => {
    const params = {}
    if (selectedClub) params.clubId = selectedClub
    if (selectedSeason) params.seasonId = selectedSeason
    if (category) params.category = category
    if (selectedGroup) params.groupId = selectedGroup
    if (minAge) params.minAge = Number(minAge)
    if (maxAge) params.maxAge = Number(maxAge)
    const { data } = await api.get('/api/admin/memberships/search', { params })
    setMembers(data || [])
  }

  const createMembership = async (userId) => {
    if (!selectedClub || !selectedSeason) return
    await api.post('/api/admin/memberships', null, { params: { userId, clubId: selectedClub, seasonId: selectedSeason } })
    await loadMembers()
    setManageOpen(false)
  }

  const endMembership = async (id) => {
    await api.post(`/api/admin/memberships/${id}/end`)
    await loadMembers()
  }

  const openRenew = (id) => { setRenewMembershipId(id); setRenewOpen(true) }
  const renew = async () => {
    if (!renewMembershipId || !renewSeasonId) return
    await api.post(`/api/admin/memberships/${renewMembershipId}/renew`, null, { params: { seasonId: renewSeasonId } })
    setRenewOpen(false); setRenewMembershipId(null); setRenewSeasonId(''); await loadMembers()
  }

  useEffect(()=>{ loadMembers() }, [selectedClub, selectedSeason])

  return (
    <Stack spacing={2}>
      <Paper sx={{ p:2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField select label="Club" value={selectedClub} onChange={e=>setSelectedClub(e.target.value)} sx={{ minWidth:240 }}>
            {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          {/* Notification creation moved to Create Notification page */}
          <TextField select label="Season" value={selectedSeason} onChange={e=>setSelectedSeason(e.target.value)} sx={{ minWidth:240 }}>
            {seasons.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField select label="Group" value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)} sx={{ minWidth:240 }}>
            <MenuItem value="">All</MenuItem>
            {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </TextField>
          <TextField select label="Category" value={category} onChange={e=>setCategory(e.target.value)} sx={{ minWidth:160 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CADET">CADET</MenuItem>
            <MenuItem value="SCHOLIER">SCHOLIER</MenuItem>
            <MenuItem value="JUNIOR">JUNIOR</MenuItem>
            <MenuItem value="SENIOR">SENIOR</MenuItem>
          </TextField>
          <TextField label="Min age" value={minAge} onChange={e=>setMinAge(e.target.value)} sx={{ width:100 }} />
          <TextField label="Max age" value={maxAge} onChange={e=>setMaxAge(e.target.value)} sx={{ width:100 }} />
          <Button variant="contained" onClick={()=>setManageOpen(true)}>Add membership</Button>
        </Stack>
        <Button variant="outlined" onClick={loadMembers}>Apply filters</Button>
      </Paper>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6">Members</Typography>
        <Table>
          <TableHead>
            <TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Season</TableCell><TableCell>Start</TableCell><TableCell>End</TableCell><TableCell>Actions</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {members.map(m => (
              <TableRow key={m.id}>
                <TableCell>{m.user?.firstName} {m.user?.lastName}</TableCell>
                <TableCell>{m.user?.email}</TableCell>
                <TableCell>{m.season?.name}</TableCell>
                <TableCell>{m.startDate ? new Date(m.startDate).toLocaleDateString() : ''}</TableCell>
                <TableCell>{m.endDate ? new Date(m.endDate).toLocaleDateString() : ''}</TableCell>
                <TableCell>
                  <Button size="small" onClick={()=>endMembership(m.id)}>End</Button>
                  <Button size="small" onClick={()=>openRenew(m.id)}>Renew</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={manageOpen} onClose={()=>setManageOpen(false)}>
        <DialogTitle>Add Membership</DialogTitle>
        <DialogContent>
          <TextField select label="User" value={manageUser || ''} onChange={e=>setManageUser(e.target.value)} sx={{ minWidth:320 }}>
            {users.map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setManageOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={()=>createMembership(manageUser)}>Create</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={renewOpen} onClose={()=>setRenewOpen(false)}>
        <DialogTitle>Renew Membership</DialogTitle>
        <DialogContent>
          <TextField select label="Season" value={renewSeasonId} onChange={e=>setRenewSeasonId(e.target.value)} sx={{ minWidth:320 }}>
            {seasons.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setRenewOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={renew}>Renew</Button>
        </DialogActions>
      </Dialog>
      {/* Compose UI removed - use CreateNotificationPage instead */}
    </Stack>
  )
}
