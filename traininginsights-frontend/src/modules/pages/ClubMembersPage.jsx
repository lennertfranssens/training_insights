import React, { useEffect, useState } from 'react'
import api from '../api/client'
// Compose notification UI moved to a dedicated page for clarity
import { Paper, Typography, Stack, TextField, MenuItem, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Checkbox, Box, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { useSnackbar } from '../common/SnackbarProvider'

export default function ClubMembersPage(){
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState('')
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [category, setCategory] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [members, setMembers] = useState([])
  const [users, setUsers] = useState([])
  const [eligibleSelected, setEligibleSelected] = useState([])
  const [viewMode, setViewMode] = useState('members')
  const [eligibleSearch, setEligibleSearch] = useState('')
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const { showSnackbar } = useSnackbar()

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

  const addSelectedMembers = async () => {
    if (!selectedClub || !selectedSeason) return showSnackbar('Select club and season first')
    if (!eligibleSelected || eligibleSelected.length === 0) return showSnackbar('No users selected')
    try{
      // call batch endpoint
      await api.post('/api/admin/memberships/batch', { userIds: eligibleSelected, clubId: selectedClub, seasonId: selectedSeason })
      showSnackbar(`Added ${eligibleSelected.length} membership(s)`)
      setEligibleSelected([])
      await loadMembers()
    }catch(e){ showSnackbar('Add members failed: ' + (e.message || e)) }
  }

  const endMembership = async (id) => {
    try{
      await api.post(`/api/admin/memberships/${id}/end`)
      showSnackbar('Membership ended')
      await loadMembers()
    }catch(e){ showSnackbar('Failed to end membership: ' + (e.message || e)) }
  }

  const openRenew = (id) => { setRenewMembershipId(id); setRenewSeasonId(selectedSeason || ''); setRenewOpen(true) }
  const renew = async () => {
    if (!renewMembershipId || !renewSeasonId) return
    try{
      await api.post(`/api/admin/memberships/${renewMembershipId}/renew`, null, { params: { seasonId: renewSeasonId } })
      setRenewOpen(false); setRenewMembershipId(null); setRenewSeasonId('');
      showSnackbar('Membership renewed')
      await loadMembers()
    }catch(e){ showSnackbar('Renew failed: ' + (e.message || e)) }
  }

  useEffect(()=>{ loadMembers() }, [selectedClub, selectedSeason])

  return (
    <Stack spacing={2}>
      <Paper sx={{ p:2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField select label="Club" value={selectedClub} onChange={e=>setSelectedClub(e.target.value)} sx={{ minWidth:240 }}>
            <MenuItem value="">-- select --</MenuItem>
            {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="Season" value={selectedSeason} onChange={e=>setSelectedSeason(e.target.value)} sx={{ minWidth:240 }}>
            <MenuItem value="">All</MenuItem>
            {seasons.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          {/* Add membership button removed from top filters per UX request */}
        </Stack>
        <Button variant="outlined" onClick={loadMembers} sx={{ mt:1 }}>Apply filters</Button>
      </Paper>
      <Paper sx={{ p:1, display: 'flex', gap:1, alignItems: 'center' }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, v) => { if (v) setViewMode(v) }}
          aria-label="view mode"
        >
          <ToggleButton value="members" aria-label="members">Members</ToggleButton>
          <ToggleButton value="add" aria-label="add-members">Add members{selectedClub ? ` (${users.filter(u => (u.clubIds || []).includes(selectedClub) ).filter(u => !(members || []).some(m => m.userId === u.id && !m.endDate)).length})` : ''}</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {viewMode === 'add' && (
        <Paper sx={{ p:2 }}>
          <Typography variant="h6">Add members (linked to selected club)</Typography>
          <Box sx={{ mt:1 }}>
            {!selectedClub && <Typography variant="body2">Select a club above to manage memberships and see eligible users.</Typography>}
            {selectedClub && (
              <>
                <Typography variant="body2" sx={{ mb:1 }}>Select users that are linked to this club but are not currently active members.</Typography>
                <TextField
                  placeholder="Search eligible users"
                  value={eligibleSearch}
                  onChange={e=>setEligibleSearch(e.target.value)}
                  size="small"
                  sx={{ mb:1, width: '100%' }}
                />
                <List dense>
                  {users
                    .filter(u => (u.clubIds || []).includes(selectedClub) )
                    .filter(u => !(members || []).some(m => m.userId === u.id && !m.endDate))
                    .filter(u => {
                      if (!eligibleSearch) return true
                      const q = eligibleSearch.toLowerCase()
                      return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
                    })
                    .map(u => (
                      <ListItem key={u.id} button onClick={()=>{
                        const idx = eligibleSelected.indexOf(u.id)
                        if (idx === -1) setEligibleSelected([...eligibleSelected, u.id])
                        else setEligibleSelected(eligibleSelected.filter(x => x !== u.id))
                      }}>
                        <Checkbox edge="start" checked={eligibleSelected.includes(u.id)} tabIndex={-1} disableRipple />
                        <ListItemText primary={`${u.firstName} ${u.lastName}`} secondary={u.email} />
                      </ListItem>
                    ))}
                </List>
                <Stack direction="row" spacing={1} sx={{ mt:1 }}>
                  <Button variant="contained" onClick={async ()=>{
                    if (!selectedClub || !selectedSeason){ showSnackbar('Select club and season first'); return }
                    await addSelectedMembers()
                  }} disabled={eligibleSelected.length===0}>Add selected members</Button>
                  <Button onClick={()=>setEligibleSelected([])}>Clear selection</Button>
                </Stack>
              </>
            )}
          </Box>
        </Paper>
      )}
      <Paper sx={{ p:2 }}>
        <Typography variant="h6">Members</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role(s)</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Season</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members
              .filter(m => {
                if (!roleFilter) return true
                const u = users.find(x => x.id === m.userId || (m.user && m.user.id === x.id))
                if (!u) return true
                const roles = u.roles || []
                return roles.some(r => r === roleFilter || r === roleFilter.replace(/^ROLE_/, '') || ('ROLE_' + r) === roleFilter)
              })
              .map(m => (
              <TableRow key={m.id}>
                <TableCell>{m.userFirstName || m.user?.firstName} {m.userLastName || m.user?.lastName}</TableCell>
                <TableCell>{m.userEmail || m.user?.email}</TableCell>
                <TableCell>{(() => { const u = users.find(x => x.id === m.userId); return u ? (u.roles || []).join(', ') : '' })()}</TableCell>
                <TableCell>{m.groupName || ''}</TableCell>
                <TableCell>{m.seasonName || m.season?.name}</TableCell>
                <TableCell>{m.startDate ? new Date(m.startDate).toLocaleDateString() : ''}</TableCell>
                <TableCell>{m.endDate ? new Date(m.endDate).toLocaleDateString() : ''}</TableCell>
                <TableCell>
                  <Button size="small" onClick={()=>endMembership(m.id)}>End</Button>
                  <Button size="small" onClick={()=>openRenew(m.id)}>Renew</Button>
                  <Button size="small" color="error" onClick={()=>{ setDeleteTargetId(m.id); setDeleteDialogOpen(true) }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={manageOpen} onClose={()=>setManageOpen(false)}>
        <DialogTitle>Add Membership</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 8 }}>Selected club: <strong>{clubs.find(c=>c.id===selectedClub)?.name || '—'}</strong></div>
          <TextField select label="User" value={manageUser || ''} onChange={e=>setManageUser(e.target.value)} sx={{ minWidth:320 }}>
            {/* Only show users that are not currently an active member of the selected club */}
            {users
              .filter(u => {
                if (!selectedClub) return true
                // consider user has active membership if members array contains their userId with no endDate
                const hasActive = (members || []).some(m => m.userId === u.id && (!m.endDate))
                return !hasActive
              })
              .map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setManageOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={()=>{ createMembership(manageUser); }}>Create</Button>
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
      <Dialog open={deleteDialogOpen} onClose={()=>{ setDeleteDialogOpen(false); setDeleteTargetId(null) }}>
        <DialogTitle>Delete membership</DialogTitle>
        <DialogContent>Are you sure you want to delete this membership? This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setDeleteDialogOpen(false); setDeleteTargetId(null) }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={async ()=>{
            try{
              if (!deleteTargetId) return
              await api.delete(`/api/admin/memberships/${deleteTargetId}`)
              showSnackbar('Membership deleted')
              setDeleteDialogOpen(false)
              setDeleteTargetId(null)
              await loadMembers()
            }catch(e){ showSnackbar('Delete failed: ' + (e.message || e)) }
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Compose UI removed - use CreateNotificationPage instead */}
    </Stack>
  )
}
