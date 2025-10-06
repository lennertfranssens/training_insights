import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Paper, Typography, Stack, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider, LinearProgress, MenuItem, Select, FormControl, InputLabel, Autocomplete } from '@mui/material'
import { formatBelgianDate, belgianToIso, isoToBelgian, formatIsoDate, formatIsoDateTime } from '../common/dateUtils'
import { BelgianDatePicker } from '../common/BelgianPickers'
import { useSnackbar } from '../common/SnackbarProvider'

export default function GoalsPage(){
  const { auth } = useAuth()
  const [goals, setGoals] = useState([])
  const [seasons, setSeasons] = useState([])
  const [seasonId, setSeasonId] = useState('')
  const [athleteId, setAthleteId] = useState('')
  const [athleteOptions, setAthleteOptions] = useState([])
  const [athleteQuery, setAthleteQuery] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ start:'', end:'', description:'' })
  const [formErrors, setFormErrors] = useState({ start:'', end:'', range:'' })
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [progressForm, setProgressForm] = useState({ progress: '', note: '' })
  const { showSnackbar } = useSnackbar()

  const isTrainer = () => (auth?.roles || []).some(r => r === 'ROLE_TRAINER' || r === 'TRAINER' || r === 'ROLE_ADMIN' || r === 'ADMIN')

  const load = async () => {
    try {
      // Load seasons for filter
      try { const { data: s } = await api.get('/api/seasons'); setSeasons(s || []) } catch(e) {}
      // Load goals: if trainer with athleteId set, call trainer endpoint; else own goals
      const params = seasonId ? `?seasonId=${seasonId}` : ''
      let data
      if (isTrainer()) {
        if (athleteId) {
          ({ data } = await api.get(`/api/trainers/athletes/${athleteId}/goals${params}`))
        } else {
          // No athlete selected yet -> do not replace goals with empty silently; keep previous or show none
          setGoals([])
          return
        }
      } else {
        ({ data } = await api.get(`/api/athlete/goals${params}`))
      }
      setGoals(data)
    } catch (e) { console.error(e) }
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ load() }, [seasonId])
  useEffect(()=>{ (async()=>{ try { if (isTrainer() && athleteQuery.length >= 2){ const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(athleteQuery)}`); setAthleteOptions(data || []) } } catch(e){} })() }, [athleteQuery])

  const create = async () => {
    try {
      if (!seasonId) { showSnackbar('Please select a season for this goal'); return }
  // validate dates (Belgian dd/mm/yyyy)
  const errors = { start:'', end:'', range:'' }
  if (!form.start) errors.start = 'Start date is required'
  if (!form.end) errors.end = 'End date is required'
  const parse = (s)=>{ if(!s) return null; const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if(!m) return null; return new Date(parseInt(m[3]), parseInt(m[2])-1, parseInt(m[1])) }
  const startDate = parse(form.start)
  const endDate = parse(form.end)
      if (startDate && endDate && endDate < startDate) errors.range = 'End date must be on or after start date'
      const season = seasons.find(s => String(s.id) === String(seasonId))
      const seasonStart = season?.startDate ? new Date(season.startDate) : null
      const seasonEnd = season?.endDate ? new Date(season.endDate) : null
      if (seasonStart && startDate && startDate < new Date(seasonStart.getFullYear(), seasonStart.getMonth(), seasonStart.getDate())) errors.start = 'Start is before season start'
      if (seasonEnd && endDate && endDate > new Date(seasonEnd.getFullYear(), seasonEnd.getMonth(), seasonEnd.getDate())) errors.end = 'End is after season end'
      setFormErrors(errors)
      if (errors.start || errors.end || errors.range) { showSnackbar(errors.start || errors.end || errors.range); return }

  // send dates as provided (already dd/MM/yyyy)
  await api.post('/api/athlete/goals', { start: form.start, end: form.end, description: form.description, seasonId: seasonId || null })
      setOpenCreate(false); setForm({ start:'', end:'', description:'' }); await load()
  } catch(e){ showSnackbar('Unable to create goal: ' + (e?.response?.data?.message || e.message)) }
  }

  const submitFeedback = async () => {
    if (!selectedGoal) return
    try {
      await api.post(`/api/goals/${selectedGoal.id}/feedback`, { comment: feedback })
      setFeedback(''); setSelectedGoal(null); await load()
  } catch(e){ showSnackbar('Unable to add feedback') }
  }

  const submitProgress = async () => {
    if (!selectedGoal) return
    const val = parseInt(progressForm.progress, 10)
    if (isNaN(val) || val < 0 || val > 100) { showSnackbar('Progress must be between 0 and 100'); return }
    try {
      await api.post(`/api/goals/${selectedGoal.id}/progress`, { progress: val, note: progressForm.note || '' })
      setProgressForm({ progress:'', note:'' }); setSelectedGoal(null); await load()
    } catch(e){ showSnackbar('Unable to add progress') }
  }

  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Goals</Typography>
        {!isTrainer() && <Button variant="contained" onClick={()=>setOpenCreate(true)}>Create goal</Button>}
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt:1, mb:1 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="season-label" shrink>Season</InputLabel>
          <Select labelId="season-label" label="Season" value={seasonId} onChange={e=>setSeasonId(e.target.value)} displayEmpty>
            <MenuItem value=""><em>All seasons</em></MenuItem>
            {seasons.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>
        {isTrainer() && (
          <Autocomplete size="small"
            sx={{ width: 280 }}
            options={athleteOptions}
            getOptionLabel={(o)=> o ? `${o.firstName||''} ${o.lastName||''} (${o.email||''})` : ''}
            onInputChange={(e,val)=> setAthleteQuery(val)}
            onChange={(e,val)=> setAthleteId(val?.id || '')}
            renderInput={(params)=> <TextField {...params} label="Select athlete" />}
          />
        )}
        <div style={{ flex:1 }} />
        <Button onClick={load}>Refresh</Button>
      </Stack>

      {isTrainer() && !athleteId && (
        <Typography variant="body2" color="text.secondary" sx={{ mt:2 }}>
          Select an athlete (type at least 2 letters) to view their goals.
        </Typography>
      )}
      <List>
        {goals.map(g => (
          <ListItem key={g.id} button onClick={()=>setSelectedGoal(g)}>
            <ListItemText primary={g.description} secondary={`From ${formatIsoDate(g.startDate)} to ${formatIsoDate(g.endDate)} — Progress: ${g.currentProgress ?? 0}%`} />
          </ListItem>
        ))}
        {goals.length === 0 && (!isTrainer() || athleteId) && (
          <ListItem><ListItemText primary="No goals found for the selected filters" /></ListItem>
        )}
      </List>

      <Dialog open={openCreate} onClose={()=>setOpenCreate(false)}>
        <DialogTitle>Create goal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <Typography variant="body2" color="text.secondary">
              Choose a season to scope this goal. Trainers can see goals for athletes they train or share a club with.
            </Typography>
            <FormControl size="small" fullWidth required>
              <InputLabel id="create-season-label" shrink>Season</InputLabel>
              <Select labelId="create-season-label" label="Season" value={seasonId} onChange={e=>setSeasonId(e.target.value)} displayEmpty>
                <MenuItem value=""><em>Select a season</em></MenuItem>
                {seasons.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            <BelgianDatePicker label="Start" value={belgianToIso(form.start)} onChange={(iso)=>{ const belg = iso ? isoToBelgian(iso) : ''; setForm({...form, start: belg}); setFormErrors({ ...formErrors, start:'', range:'' }) }} />
            <BelgianDatePicker label="End" value={belgianToIso(form.end)} onChange={(iso)=>{ const belg = iso ? isoToBelgian(iso) : ''; setForm({...form, end: belg}); setFormErrors({ ...formErrors, end:'', range:'' }) }} />
            {formErrors.range && <Typography color="error" variant="body2">{formErrors.range}</Typography>}
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
              <Typography variant="body2">{selectedGoal.startDate ? formatBelgianDate(new Date(selectedGoal.startDate)) : ''} — {selectedGoal.endDate ? formatBelgianDate(new Date(selectedGoal.endDate)) : ''}</Typography>
              <div>
                <Typography variant="subtitle2">Current progress</Typography>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <LinearProgress variant="determinate" value={selectedGoal.currentProgress ?? 0} sx={{ flex:1 }} />
                  <Typography variant="body2" sx={{ minWidth:40, textAlign:'right' }}>{selectedGoal.currentProgress ?? 0}%</Typography>
                </div>
              </div>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt:1 }}>Feedback</Typography>
              {(selectedGoal.feedbacks || []).length === 0 ? <Typography variant="body2">None</Typography> : (
                <List>
                  {(selectedGoal.feedbacks || []).map(f => (
                    <ListItem key={f.id}><ListItemText primary={f.comment} secondary={`${f.trainer?.firstName || ''} ${f.trainer?.lastName || ''} — ${formatIsoDateTime(f.createdAt)}`} /></ListItem>
                  ))}
                </List>
              )}
              {isTrainer() && (
                <>
                  <TextField label="Feedback" multiline rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} />
                  <Button variant="contained" onClick={submitFeedback}>Submit feedback</Button>
                </>
              )}
              {!isTrainer() && (
                <>
                  <Typography variant="subtitle2">Update progress</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField label="Progress %" type="number" size="small" inputProps={{ min:0, max:100 }} value={progressForm.progress} onChange={e=>setProgressForm({...progressForm, progress:e.target.value})} sx={{ width:140 }} />
                    <TextField label="Note (optional)" size="small" value={progressForm.note} onChange={e=>setProgressForm({...progressForm, note:e.target.value})} sx={{ flex:1 }} />
                    <Button variant="contained" onClick={submitProgress}>Save</Button>
                  </Stack>
                </>
              )}
              <Typography variant="subtitle2" sx={{ mt:1 }}>Progress history</Typography>
              {(selectedGoal.progress || []).length === 0 ? <Typography variant="body2">No updates yet</Typography> : (
                <List>
                  {(selectedGoal.progress || []).map(p => (
                    <ListItem key={p.id}><ListItemText primary={`${p.progress}%`} secondary={`${p.note || ''} ${p.createdAt ? '— ' + formatIsoDateTime(p.createdAt) : ''}`} /></ListItem>
                  ))}
                </List>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  )
}
