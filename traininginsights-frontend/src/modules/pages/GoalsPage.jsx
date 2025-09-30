import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Paper, Typography, Stack, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider } from '@mui/material'

export default function GoalsPage(){
  const { auth } = useAuth()
  const [goals, setGoals] = useState([])
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ start:'', end:'', description:'' })
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [feedback, setFeedback] = useState('')

  const isTrainer = () => (auth?.roles || []).some(r => r === 'ROLE_TRAINER' || r === 'TRAINER' || r === 'ROLE_ADMIN' || r === 'ADMIN')

  const load = async () => {
    try {
      if (isTrainer()) {
        // trainer: load goals for all athletes? For simplicity, load own athlete's goals endpoint not implemented here
        const { data } = await api.get('/api/athlete/goals')
        setGoals(data)
      } else {
        const { data } = await api.get('/api/athlete/goals')
        setGoals(data)
      }
    } catch (e) { console.error(e) }
  }
  useEffect(()=>{ load() }, [])

  const create = async () => {
    try {
      // send dates in dd/MM/yyyy format expected by backend parser
      const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : null
      await api.post('/api/athlete/goals', { start: fmt(form.start), end: fmt(form.end), description: form.description })
      setOpenCreate(false); setForm({ start:'', end:'', description:'' }); await load()
    } catch(e){ alert('Unable to create goal: ' + (e?.response?.data?.message || e.message)) }
  }

  const submitFeedback = async () => {
    if (!selectedGoal) return
    try {
      await api.post(`/api/goals/${selectedGoal.id}/feedback`, { comment: feedback })
      setFeedback(''); setSelectedGoal(null); await load()
    } catch(e){ alert('Unable to add feedback') }
  }

  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Goals</Typography>
        {!isTrainer() && <Button variant="contained" onClick={()=>setOpenCreate(true)}>Create goal</Button>}
      </Stack>

      <List>
        {goals.map(g => (
          <ListItem key={g.id} button onClick={()=>setSelectedGoal(g)}>
            <ListItemText primary={g.description} secondary={`From ${g.startDate ? new Date(g.startDate).toLocaleDateString() : ''} to ${g.endDate ? new Date(g.endDate).toLocaleDateString() : ''}`} />
          </ListItem>
        ))}
      </List>

      <Dialog open={openCreate} onClose={()=>setOpenCreate(false)}>
        <DialogTitle>Create goal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField type="date" label="Start" value={form.start} onChange={e=>setForm({...form, start:e.target.value})} InputLabelProps={{ shrink:true }} />
            <TextField type="date" label="End" value={form.end} onChange={e=>setForm({...form, end:e.target.value})} InputLabelProps={{ shrink:true }} />
            <TextField label="Description" multiline rows={3} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={create}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!selectedGoal} onClose={()=>setSelectedGoal(null)} fullWidth maxWidth="sm">
        <DialogTitle>Goal</DialogTitle>
        <DialogContent>
          {selectedGoal && (
            <Stack spacing={2}>
              <Typography>{selectedGoal.description}</Typography>
              <Typography variant="body2">{selectedGoal.startDate ? new Date(selectedGoal.startDate).toLocaleDateString('en-GB') : ''} — {selectedGoal.endDate ? new Date(selectedGoal.endDate).toLocaleDateString('en-GB') : ''}</Typography>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt:1 }}>Feedback</Typography>
              {(selectedGoal.feedbacks || []).length === 0 ? <Typography variant="body2">None</Typography> : (
                <List>
                  {(selectedGoal.feedbacks || []).map(f => (
                    <ListItem key={f.id}><ListItemText primary={f.comment} secondary={`${f.trainer?.firstName || ''} ${f.trainer?.lastName || ''} — ${f.createdAt ? new Date(f.createdAt).toLocaleString() : ''}`} /></ListItem>
                  ))}
                </List>
              )}
              {isTrainer() && (
                <>
                  <TextField label="Feedback" multiline rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} />
                  <Button variant="contained" onClick={submitFeedback}>Submit feedback</Button>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  )
}
