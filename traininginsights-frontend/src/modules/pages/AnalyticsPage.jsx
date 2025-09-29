import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button } from '@mui/material'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(isoWeek)
export default function AnalyticsPage(){
  const [groups, setGroups] = useState([])
  const [groupId, setGroupId] = useState('')
  const [year, setYear] = useState(dayjs().year())
  const [week, setWeek] = useState(dayjs().isoWeek())
  const [result, setResult] = useState(null)
  useEffect(()=>{ api.get('/api/groups').then(res=>{ setGroups(res.data); if (res.data[0]) setGroupId(res.data[0].id) }) }, [])
  const run = async () => { const { data } = await api.get(`/api/analytics/group/${groupId}/soreness`, { params: { year, isoWeek: week } }); setResult(data) }
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:2 }}>Analytics</Typography>
      <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
        <TextField select label="Group" value={groupId} onChange={e=>setGroupId(e.target.value)} sx={{ minWidth: 200 }}>
          {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>
        <TextField label="Year" type="number" value={year} onChange={e=>setYear(Number(e.target.value))} />
        <TextField label="ISO Week" type="number" value={week} onChange={e=>setWeek(Number(e.target.value))} />
        <Button variant="contained" onClick={run}>Get Soreness Average</Button>
      </Stack>
      {result && (<Paper sx={{ p:2 }}><Typography>Soreness Average: <b>{Number(result.sorenessAverage).toFixed(2)}</b></Typography></Paper>)}
    </Paper>
  )
}
