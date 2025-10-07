import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Paper, Typography, Stack, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider, LinearProgress, MenuItem, Select, FormControl, InputLabel, Autocomplete, Alert, Chip } from '@mui/material'
import { formatBelgianDate, belgianToIso, isoToBelgian, formatIsoDate, formatIsoDateTime } from '../common/dateUtils'
import { TIDateInput } from '../common/TIPickers'
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
  const [showCompleted, setShowCompleted] = useState(true)
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
    if (isNaN(val) || val < 0) { showSnackbar('Increment must be >= 0'); return }
    const remaining = Math.max(0, 100 - (selectedGoal.cumulativeProgress ?? 0))
    if (remaining <= 0) { showSnackbar('Goal already complete'); return }
    const trimmed = Math.min(val, remaining)
    try {
      await api.post(`/api/goals/${selectedGoal.id}/progress`, { progress: trimmed, note: progressForm.note || '' })
      setProgressForm({ progress:'', note:'' }); setSelectedGoal(null); await load()
    } catch(e){ showSnackbar('Unable to add progress') }
  }

  const resetCumulative = async () => {
    if (!selectedGoal) return
    if (!window.confirm('Reset cumulative progress for this goal?')) return
    try {
      await api.post(`/api/goals/${selectedGoal.id}/reset`)
      setSelectedGoal(null); await load()
    } catch(e){ showSnackbar('Unable to reset cumulative progress') }
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
        <Button onClick={()=>setShowCompleted(v=>!v)}>{showCompleted ? 'Hide completed' : 'Show completed'}</Button>
        <Button onClick={load}>Refresh</Button>
      </Stack>

      {isTrainer() && !athleteId && (
        <Typography variant="body2" color="text.secondary" sx={{ mt:2 }}>
          Select an athlete (type at least 2 letters) to view their goals.
        </Typography>
      )}
      <List>
        {goals
          .slice()
          .sort((a,b)=>{
            const aCompleted = (a.cumulativeProgress ?? 0) >= 100
            const bCompleted = (b.cumulativeProgress ?? 0) >= 100
            if (aCompleted !== bCompleted) return aCompleted ? 1 : -1 // incomplete first
            // secondary: earlier end date first
            const aEnd = a.endDate || ''
            const bEnd = b.endDate || ''
            if (aEnd && bEnd && aEnd !== bEnd) return aEnd.localeCompare(bEnd)
            // tertiary: start date
            const aStart = a.startDate || ''
            const bStart = b.startDate || ''
            if (aStart && bStart && aStart !== bStart) return aStart.localeCompare(bStart)
            // final: description alpha
            return (a.description||'').localeCompare(b.description||'')
          })
          .filter(g => showCompleted || (g.cumulativeProgress ?? 0) < 100)
          .map(g => {
          const completed = (g.cumulativeProgress ?? 0) >= 100
          return (
            <ListItem key={g.id} button onClick={()=>setSelectedGoal(g)} sx={completed ? { opacity:0.55 } : undefined}>
              <ListItemText 
                primary={g.description} 
                secondary={`From ${formatIsoDate(g.startDate)} to ${formatIsoDate(g.endDate)} — Last increment: ${g.currentProgress ?? 0}% | Cumulative: ${g.cumulativeProgress ?? g.currentProgress ?? 0}${completed && g.completionDate ? ' — Completed: ' + formatIsoDateTime(g.completionDate) : ''}`}
              />
              {completed && <Chip size="small" color="success" label="Completed" sx={{ ml:1 }} />}
            </ListItem>
          )
        })}
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
            <TIDateInput label="Start" value={form.startIso || ''} onChange={(iso,{valid})=>{
              setForm(f=>({...f, startIso: iso||'', start: iso ? dayjs(iso).format('DD/MM/YYYY') : '' }))
              setFormErrors(err=>({...err, start: valid ? '' : 'Invalid date', range:''}))
            }} error={!!formErrors.start} helperText={formErrors.start || 'dd/mm/yyyy'} required />
            <TIDateInput label="End" value={form.endIso || ''} onChange={(iso,{valid})=>{
              setForm(f=>({...f, endIso: iso||'', end: iso ? dayjs(iso).format('DD/MM/YYYY') : '' }))
              setFormErrors(err=>({...err, end: valid ? '' : 'Invalid date', range:''}))
            }} error={!!formErrors.end} helperText={formErrors.end || 'dd/mm/yyyy'} required />
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
                <Typography variant="subtitle2">Progress (cumulative)</Typography>
                <Stack spacing={1}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <LinearProgress variant="determinate" value={Math.min(100, (selectedGoal.cumulativeProgress ?? 0))} sx={{ flex:1 }} />
                    <Typography variant="body2" sx={{ minWidth:70, textAlign:'right' }}>{Math.min(100, selectedGoal.cumulativeProgress ?? 0)}%</Typography>
                  </div>
                  <Typography variant="caption" color="text.secondary">Last increment: {selectedGoal.currentProgress ?? 0}% — Remaining: {Math.max(0, 100 - (selectedGoal.cumulativeProgress ?? 0))}%</Typography>
                </Stack>
              </div>
              {(selectedGoal.cumulativeProgress ?? 0) >= 100 && (
                <Alert severity="success" variant="outlined">
                  Goal complete{selectedGoal.completionDate ? ' since ' + formatIsoDateTime(selectedGoal.completionDate) : ''}
                </Alert>
              )}
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
                  <Typography variant="subtitle2">Add progress increment</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField label="Increment" type="number" size="small" inputProps={{ min:0 }} value={progressForm.progress}
                      onChange={e=>{
                        const val = e.target.value
                        const remaining = Math.max(0, 100 - (selectedGoal.cumulativeProgress ?? 0))
                        let n = parseInt(val,10); if(isNaN(n)||n<0) n=''; else if(n>remaining) n=remaining
                        setProgressForm({...progressForm, progress:n})
                      }} sx={{ width:140 }} helperText={`Remaining: ${Math.max(0, 100 - (selectedGoal.cumulativeProgress ?? 0))}%`} disabled={(selectedGoal.cumulativeProgress ?? 0) >= 100} />
                    <TextField label="Note (optional)" size="small" value={progressForm.note} onChange={e=>setProgressForm({...progressForm, note:e.target.value})} sx={{ flex:1 }} disabled={(selectedGoal.cumulativeProgress ?? 0) >= 100} />
                    <Button variant="contained" onClick={submitProgress} disabled={(selectedGoal.cumulativeProgress ?? 0) >= 100}>Save</Button>
                    <Button color="warning" onClick={resetCumulative}>Reset</Button>
                  </Stack>
                </>
              )}
              <Typography variant="subtitle2" sx={{ mt:1 }}>Progress history</Typography>
              {(selectedGoal.progress || []).length === 0 ? <Typography variant="body2">No updates yet</Typography> : (
                <List>
                  {(selectedGoal.progress || []).map(p => (
                    <ListItem key={p.id}><ListItemText primary={`+${p.progress}`} secondary={`${p.note || ''} ${p.createdAt ? '— ' + formatIsoDateTime(p.createdAt) : ''}`} /></ListItem>
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
