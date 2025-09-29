import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from '@mui/material'
export default function TrainingsPage(){
  const [trainings, setTrainings] = useState([])
  const [groups, setGroups] = useState([])
  const [questionnaires, setQuestionnaires] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', trainingTime:'', visibleToAthletes:true, groupIds:[], preQuestionnaireId:null, postQuestionnaireId:null })
  const load = async () => {
    const [t, g, q] = await Promise.all([ api.get('/api/trainings'), api.get('/api/groups'), api.get('/api/questionnaires') ])
    setTrainings(t.data); setGroups(g.data); setQuestionnaires(q.data)
  }
  useEffect(()=>{ load() }, [])
  const create = async () => {
    const payload = { title: form.title, description: form.description, trainingTime: new Date(form.trainingTime).toISOString(), visibleToAthletes: form.visibleToAthletes }
    const { data } = await api.post('/api/trainings', payload)
    if (form.groupIds?.length){ await api.post(`/api/trainings/${data.id}/assign-groups`, { groupIds: form.groupIds }) }
    if (form.preQuestionnaireId || form.postQuestionnaireId) { await api.post(`/api/trainings/${data.id}/set-questionnaires?preId=${form.preQuestionnaireId||''}&postId=${form.postQuestionnaireId||''}`) }
    setOpen(false); setForm({ title:'', description:'', trainingTime:'', visibleToAthletes:true, groupIds:[], preQuestionnaireId:null, postQuestionnaireId:null }); await load()
  }
  const remove = async (id) => { if (!confirm('Delete training?')) return; await api.delete(`/api/trainings/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Trainings</Typography>
        <Button variant="contained" onClick={()=>setOpen(true)}>Create</Button>
      </Stack>
      <Stack spacing={1}>
        {trainings.map(t => (
          <Paper key={t.id} sx={{ p:2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <Typography>{t.title}</Typography>
              <Typography variant="body2">{new Date(t.trainingTime).toLocaleString()}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
                {(t.groups||[]).map(g => <Chip key={g.id} label={g.name} size="small" />)}
              </Stack>
            </div>
            <Button color="error" onClick={()=>remove(t.id)}>Delete</Button>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Training</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
            <TextField label="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} multiline rows={3} />
            <TextField type="datetime-local" label="Training time" InputLabelProps={{ shrink:true }} value={form.trainingTime} onChange={e=>setForm({...form, trainingTime:e.target.value})} />
            <TextField select label="Groups" value={form.groupIds} onChange={e=>setForm({...form, groupIds:e.target.value})} SelectProps={{ multiple:true }}>
              {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </TextField>
            <TextField select label="Pre-questionnaire" value={form.preQuestionnaireId||''} onChange={e=>setForm({...form, preQuestionnaireId:e.target.value||null})}>
              <MenuItem value="">None</MenuItem>
              {questionnaires.map(q => <MenuItem key={q.id} value={q.id}>{q.title}</MenuItem>)}
            </TextField>
            <TextField select label="Post-questionnaire" value={form.postQuestionnaireId||''} onChange={e=>setForm({...form, postQuestionnaireId:e.target.value||null})}>
              <MenuItem value="">None</MenuItem>
              {questionnaires.map(q => <MenuItem key={q.id} value={q.id}>{q.title}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={create}>Create</Button></DialogActions>
      </Dialog>
    </Paper>
  )
}
