import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material'
import QuestionnaireForm from '../common/QuestionnaireForm'
const sampleStructure = JSON.stringify({ fields: [ { name:'soreness', label:'Soreness (0-10)', type:'slider', min:0, max:10 }, { name:'fatigue', label:'Fatigue (0-10)', type:'slider', min:0, max:10 }, { name:'notes', label:'Notes', type:'textarea', rows:3 } ] }, null, 2)
export default function QuestionnairesPage(){
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [title, setTitle] = useState('Wellness Check')
  const [structure, setStructure] = useState(sampleStructure)
  const [daily, setDaily] = useState(false)
  const load = async () => { const { data } = await api.get('/api/questionnaires'); setItems(data) }
  useEffect(()=>{ load() }, [])
  const create = async () => { await api.post('/api/questionnaires', { title, structure, daily }); setOpen(false); setTitle('Wellness Check'); setStructure(sampleStructure); setDaily(false); await load() }
  const save = async () => { if (editing) { await api.put(`/api/questionnaires/${editing.id}`, { title, structure, daily }) } else { await create() } setOpen(false); setEditing(null); setTitle('Wellness Check'); setStructure(sampleStructure); setDaily(false); await load() }
  const remove = async (id) => { if (!confirm('Delete questionnaire?')) return; await api.delete(`/api/questionnaires/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Questionnaires</Typography>
        <Button variant="contained" onClick={()=>setOpen(true)}>Create</Button>
      </Stack>
      <Stack spacing={1}>
        {items.map(q => (
          <Paper key={q.id} sx={{ p:2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div><Typography>{q.title}</Typography></div>
              <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => { setEditing(q); setTitle(q.title); setStructure(q.structure); setDaily(!!q.daily); setOpen(true); }}>Edit</Button>
              <Button color="error" onClick={()=>remove(q.id)}>Delete</Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Questionnaire' : 'Create Questionnaire'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <TextField select value={daily ? 'yes' : 'no'} onChange={e=>setDaily(e.target.value === 'yes')} label="Daily" sx={{ width:160 }}>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
            <TextField multiline label="Structure (JSON)" value={structure} onChange={e=>setStructure(e.target.value)} rows={10} />
            <Typography variant="subtitle2">Preview</Typography>
            <Paper sx={{ p:2 }}><QuestionnaireForm structure={structure} values={{}} onChange={()=>{}} /></Paper>
          </Stack>
        </DialogContent>
          <DialogActions><Button onClick={()=>{ setOpen(false); setEditing(null); }}>Cancel</Button><Button variant="contained" onClick={save}>{editing ? 'Save' : 'Create'}</Button></DialogActions>
      </Dialog>
    </Paper>
  )
}
