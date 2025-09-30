import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button } from '@mui/material'

export default function QuestionnaireAggregations(){
  const [qList, setQList] = useState([])
  const [qId, setQId] = useState('')
  const [data, setData] = useState(null)
  useEffect(()=>{ api.get('/api/questionnaires').then(r=>{ setQList(r.data); if (r.data[0]) setQId(r.data[0].id) }) }, [])
  const run = async () => { if (!qId) return; const { data } = await api.get(`/api/questionnaires/${qId}/aggregations`); setData(data) }
  return (
    <Paper sx={{ p:2, mt:2 }}>
      <Typography variant="h6">Questionnaire Aggregations</Typography>
      <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mt:1 }}>
        <TextField select label="Questionnaire" value={qId} onChange={e=>setQId(e.target.value)} sx={{ minWidth:240 }}>
          {qList.map(q=> <MenuItem key={q.id} value={q.id}>{q.title}</MenuItem>)}
        </TextField>
        <Button variant="contained" onClick={run}>Get Aggregations</Button>
      </Stack>
      {data && (
        <Stack spacing={1} sx={{ mt:2 }}>
          <Typography>Average Score: <b>{Number(data.averageScore||0).toFixed(2)}</b></Typography>
          <Typography>By Category:</Typography>
          <Paper sx={{ p:1 }}>{JSON.stringify(data.byCategory||{})}</Paper>
          <Typography>By Age Bucket:</Typography>
          <Paper sx={{ p:1 }}>{JSON.stringify(data.byAgeBucket||{})}</Paper>
        </Stack>
      )}
    </Paper>
  )
}
