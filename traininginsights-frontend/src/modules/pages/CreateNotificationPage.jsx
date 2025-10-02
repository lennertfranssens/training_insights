import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button } from '@mui/material'
import { useSnackbar } from '../common/SnackbarProvider'

export default function CreateNotificationPage(){
  const [clubs, setClubs] = useState([])
  const [selectedClubs, setSelectedClubs] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  useEffect(()=>{ (async ()=>{ try{ const [{data:clubsRes},{data:groupsRes}] = await Promise.all([api.get('/api/clubs'), api.get('/api/groups')]); setClubs(clubsRes||[]); setGroups(groupsRes||[]) }catch(e){ try{ const {data:clubsRes}=await api.get('/api/clubs'); setClubs(clubsRes||[]) }catch(err){} } })() }, [])
  // read preselected clubs (set by other pages like GroupsPage) and clear
  useEffect(()=>{
    try{
      const raw = sessionStorage.getItem('preselectedNotificationClubs')
      if (raw){
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length>0) setSelectedClubs(arr)
        sessionStorage.removeItem('preselectedNotificationClubs')
      }
    }catch(e){}
  }, [])
  const { showSnackbar } = useSnackbar()
  const send = async () => {
    if (!title || !body) return showSnackbar('Provide title and body')
    try{
      // Prefer groups when real groups selected (ignore NONE=-1)
      const realGroups = (selectedGroups || []).filter(g => g !== -1)
      if (realGroups.length > 0){
        await api.post('/api/notifications/batch/group/send', { ids: realGroups, title, body })
        showSnackbar('Notifications dispatched')
        return
      }
      if (!selectedClubs || selectedClubs.length===0) return showSnackbar('Select at least one club or group')
      await api.post('/api/notifications/batch/club/send', { ids: selectedClubs, title, body })
      showSnackbar('Notifications dispatched')
    }catch(e){ showSnackbar('Send failed: ' + (e.message || e)) }
  }
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:2 }}>Create Notification</Typography>
      <Stack spacing={2}>
        {/* Clubs: disabled when real groups are selected; selecting NONE (-1) in groups means send to full club(s) */}
        <TextField select label="Clubs" SelectProps={{ multiple: true, value: selectedClubs }} value={selectedClubs} onChange={e=> setSelectedClubs(Array.isArray(e.target.value)?e.target.value:[e.target.value])} disabled={selectedGroups && selectedGroups.filter(g => g !== -1).length > 0}>
          {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        {/* Groups: selecting real groups disables club selector; selecting NONE (-1) means send to full club(s) */}
        <TextField
          select
          label="Groups (optional)"
          SelectProps={{ multiple: true, value: selectedGroups }}
          value={selectedGroups}
          onChange={e=>{
            const raw = Array.isArray(e.target.value) ? e.target.value : [e.target.value]
            const v = raw.map(x => Number(x))
            if (v.includes(-1)){
              setSelectedGroups([-1])
            } else {
              setSelectedGroups(v.filter(x => x !== -1))
            }
          }}
        >
          <MenuItem key={-1} value={-1}>
            &lt;NONE&gt; (send to full club)
          </MenuItem>
          {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>
        <TextField label="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <TextField label="Body" value={body} onChange={e=>setBody(e.target.value)} multiline minRows={3} />
        <div>
          <Button variant="contained" onClick={send}>Send</Button>
        </div>
      </Stack>
    </Paper>
  )
}
