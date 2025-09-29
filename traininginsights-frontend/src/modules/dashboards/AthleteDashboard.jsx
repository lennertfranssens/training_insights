import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material'
import QuestionnaireForm from '../common/QuestionnaireForm'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
export default function AthleteDashboard(){
  const [trainings, setTrainings] = useState([])
  const [pending, setPending] = useState([])
  const [qOpen, setQOpen] = useState(false)
  const [qStructure, setQStructure] = useState(null)
  const [qValues, setQValues] = useState({})
  const [qContext, setQContext] = useState({ trainingId: null, questionnaireId: null })
  const [allQuestionnaires, setAllQuestionnaires] = useState([])
  const [dailyQId, setDailyQId] = useState('')
  const load = async () => {
    const [t, p, q] = await Promise.all([ api.get('/api/athlete/trainings/upcoming'), api.get('/api/athlete/questionnaires/pending'), api.get('/api/questionnaires') ])
    setTrainings(t.data); setPending(p.data); setAllQuestionnaires(q.data || []); if (q.data?.[0]) setDailyQId(q.data[0].id)
  }
  useEffect(()=>{ load() }, [])
  const openQuestionnaire = async (trainingId, questionnaireId) => {
    const q = allQuestionnaires.find(x => x.id === questionnaireId); if (!q) return
    setQStructure(q.structure); setQValues({}); setQContext({ trainingId, questionnaireId }); setQOpen(true)
  }
  const submit = async () => {
    await api.post('/api/athlete/questionnaires/submit', { trainingId: qContext.trainingId, questionnaireId: qContext.questionnaireId, responses: JSON.stringify(qValues) })
    setQOpen(false); await load()
  }
  const dailySubmit = async () => {
    if (!dailyQId) return
    await api.post('/api/athlete/questionnaires/submit', { trainingId: null, questionnaireId: dailyQId, responses: JSON.stringify(qValues) })
    setQOpen(false); await load()
  }
  return (
    <Stack spacing={2}>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" sx={{ mb:2 }}>Upcoming Trainings</Typography>
        <FullCalendar plugins={[dayGridPlugin]} initialView="dayGridMonth" height="auto" events={(trainings||[]).map(t => ({ title: t.title, date: t.trainingTime }))} />
      </Paper>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" sx={{ mb:2 }}>Pending Questionnaires</Typography>
        <Stack spacing={1}>
          {(pending||[]).map(item => (
            <Paper key={`${item.trainingId}-${item.questionnaireId}-${item.type}`} sx={{ p:2, display:'flex', justifyContent:'space-between' }}>
              <div><Typography>Training #{item.trainingId} — {item.type}</Typography><Typography variant="body2">QID: {item.questionnaireId}</Typography></div>
              <Button variant="contained" onClick={()=>openQuestionnaire(item.trainingId, item.questionnaireId)}>Fill</Button>
            </Paper>
          ))}
        </Stack>
      </Paper>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" sx={{ mb:2 }}>Daily Check-in</Typography>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
          <TextField select label="Questionnaire" value={dailyQId} onChange={e=>setDailyQId(e.target.value)} sx={{ minWidth: 240 }}>
            {allQuestionnaires.map(q => <MenuItem key={q.id} value={q.id}>{q.title}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={()=>{ const q=allQuestionnaires.find(x=>x.id===dailyQId); if (q){ setQStructure(q.structure); setQValues({}); setQContext({ trainingId: null, questionnaireId: dailyQId }); setQOpen(true) }}}>Open</Button>
        </Stack>
      </Paper>
      <Dialog open={qOpen} onClose={()=>setQOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Questionnaire</DialogTitle>
        <DialogContent><QuestionnaireForm structure={qStructure} values={qValues} onChange={setQValues} /></DialogContent>
        <DialogActions><Button onClick={()=>setQOpen(false)}>Cancel</Button><Button variant="contained" onClick={qContext.trainingId ? submit : dailySubmit}>Submit</Button></DialogActions>
      </Dialog>
    </Stack>
  )
}
