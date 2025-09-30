import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button, Select, FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(isoWeek)
import QuestionnaireAggregations from '../common/QuestionnaireAggregations'
export default function AnalyticsPage(){
  const [groups, setGroups] = useState([])
  const [groupId, setGroupId] = useState('')
  const [year, setYear] = useState(dayjs().year())
  const [week, setWeek] = useState(dayjs().isoWeek())
  const [result, setResult] = useState(null)
  const [metrics] = useState(['soreness'])
  const [metric, setMetric] = useState('soreness')
  const [dimension, setDimension] = useState('athlete')
  const [granularity, setGranularity] = useState('day')
  const [startIso, setStartIso] = useState('')
  const [endIso, setEndIso] = useState('')
  useEffect(()=>{ api.get('/api/groups').then(res=>{ setGroups(res.data); /* do not default to first group - leave as All */ }) }, [])
  const run = async () => {
    // call new aggregate endpoint
    const params = { metric, dimension, granularity }
    if (groupId) params.groupId = groupId
    if (startIso) params.start = startIso
    if (endIso) params.end = endIso
    const { data } = await api.get('/api/analytics/aggregate', { params })
    setResult(data)
  }
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:2 }}>Analytics</Typography>
      <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>Metric</InputLabel>
          <Select value={metric} label="Metric" onChange={e=>setMetric(e.target.value)}>
            {metrics.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>Dimension</InputLabel>
          <Select value={dimension} label="Dimension" onChange={e=>setDimension(e.target.value)}>
            <MenuItem value="athlete">Athlete</MenuItem>
            <MenuItem value="group">Group</MenuItem>
            <MenuItem value="club">Club</MenuItem>
            <MenuItem value="age">Age</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>Granularity</InputLabel>
          <Select value={granularity} label="Granularity" onChange={e=>setGranularity(e.target.value)}>
            <MenuItem value="day">Day</MenuItem>
            <MenuItem value="week">Week</MenuItem>
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="training">Training</MenuItem>
          </Select>
        </FormControl>
        <TextField select label="Group" value={groupId} onChange={e=>setGroupId(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">All</MenuItem>
          {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>
        <TextField label="Start ISO (optional)" value={startIso} onChange={e=>setStartIso(e.target.value)} placeholder="YYYY-MM-DDTHH:MM:SSZ" />
        <TextField label="End ISO (optional)" value={endIso} onChange={e=>setEndIso(e.target.value)} placeholder="YYYY-MM-DDTHH:MM:SSZ" />
        <Button variant="contained" onClick={run}>Run</Button>
      </Stack>

      {result && result.data && (
        <Paper sx={{ p:2, mt:2 }}>
          <Typography variant="subtitle1">Aggregated results</Typography>
          {Array.isArray(result.data) && result.data.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt:1 }}>No data for the selected filters. Try clearing the Group filter or widening the date range.</Typography>
          )}
          {/* Time-series chart: aggregate by period (grouping periods together) */}
          <div style={{ width: '100%', height: 300, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={result.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" name={metric} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown chart: show top keys by average */}
          <div style={{ width: '100%', height: 300, marginTop: 12 }}>
            <ResponsiveContainer>
              <BarChart data={result.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" name={`Avg ${metric}`} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table size="small" sx={{ mt:2 }}>
            <TableHead>
              <TableRow><TableCell>Key</TableCell><TableCell>Period</TableCell><TableCell>Average</TableCell><TableCell>Count</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {(result.data || []).map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{r.key}</TableCell>
                  <TableCell>{r.period}</TableCell>
                  <TableCell>{Number(r.value).toFixed(2)}</TableCell>
                  <TableCell>{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <QuestionnaireAggregations />
    </Paper>
  )
}
