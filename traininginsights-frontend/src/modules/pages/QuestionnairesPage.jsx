import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import QuestionnaireForm from '../common/QuestionnaireForm'
const sampleStructure = JSON.stringify({ fields: [ { name:'soreness', label:'Soreness (0-10)', type:'slider', min:0, max:10 }, { name:'fatigue', label:'Fatigue (0-10)', type:'slider', min:0, max:10 }, { name:'notes', label:'Notes', type:'textarea', rows:3 } ] }, null, 2)
export default function QuestionnairesPage(){
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('Wellness Check')
  const [structure, setStructure] = useState(sampleStructure)
  const load = async () => { const { data } = await api.get('/api/questionnaires'); setItems(data) }
  useEffect(()=>{ load() }, [])
  const create = async () => { await api.post('/api/questionnaires', { title, structure }); setOpen(false); setTitle('Wellness Check'); setStructure(sampleStructure); await load() }
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
            <Button color="error" onClick={()=>remove(q.id)}>Delete</Button>
          </Paper>
        ))}
      </Stack>
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Questionnaire</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="Title" value={title} onChange={e=>setTitle(e.target.value)} />
            <TextField multiline label="Structure (JSON)" value={structure} onChange={e=>setStructure(e.target.value)} rows={10} />
            <Typography variant="subtitle2">Preview</Typography>
            <Paper sx={{ p:2 }}><QuestionnaireForm structure={structure} values={{}} onChange={()=>{}} /></Paper>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={create}>Create</Button></DialogActions>
      </Dialog>
    </Paper>
  )
}
