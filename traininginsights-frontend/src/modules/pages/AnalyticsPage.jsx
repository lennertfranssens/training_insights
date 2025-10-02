import React, { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button, Select, FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow, Chip, Box, TablePagination, TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend, ScatterChart, Scatter, ZAxis } from 'recharts'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(isoWeek)
export default function AnalyticsPage(){
  const [mode, setMode] = useState('questionnaire') // 'questionnaire' | 'presence'
  const [groups, setGroups] = useState([])
  const [groupId, setGroupId] = useState('')
  const [metricsOptions, setMetricsOptions] = useState([])
  const [selectedMetrics, setSelectedMetrics] = useState([])
  const [result, setResult] = useState(null) // shape: { metrics, dimension, granularity, data: { [metric]: rows[] }, labels }
  const [dimension, setDimension] = useState('athlete')
  const [granularity, setGranularity] = useState('day')
  const [phase, setPhase] = useState('') // '', 'pre', 'post'
  const [startIso, setStartIso] = useState('')
  const [endIso, setEndIso] = useState('')
  const [showSMA, setShowSMA] = useState(false)
  const [heatmapMetric, setHeatmapMetric] = useState('')
  const [corrX, setCorrX] = useState('')
  const [corrY, setCorrY] = useState('')
  const [selectedKey, setSelectedKey] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [drilldown, setDrilldown] = useState(null)
  const [ddPage, setDdPage] = useState(0)
  const [ddRowsPerPage, setDdRowsPerPage] = useState(25)
  const [ddSort, setDdSort] = useState('submittedAt,desc')
  const [athleteOpen, setAthleteOpen] = useState(false)
  const [athlete, setAthlete] = useState(null)
  const [valuesOpen, setValuesOpen] = useState(false)
  const [valuesLoading, setValuesLoading] = useState(false)
  const [valuesRows, setValuesRows] = useState([])
  const [valuesContext, setValuesContext] = useState({ key: null, period: null })
  const initRef = useRef(false)
  // CSV helper
  const downloadCsv = (filename, rows, columns) => {
    const escape = (v) => {
      if (v == null) return ''
      const s = String(v)
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const header = columns.map(c=>escape(c.header)).join(',')
    const body = rows.map(r => columns.map(c => escape(typeof c.value === 'function' ? c.value(r) : r[c.field])).join(',')).join('\n')
    const csv = header + '\n' + body
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const currentSort = useMemo(()=>{
    const [field, direction] = (ddSort || 'submittedAt,desc').split(',')
    return { field, direction: (direction === 'asc' ? 'asc' : 'desc') }
  }, [ddSort])
  const handleSort = (field) => {
    const isSame = currentSort.field === field
    const nextDir = isSame && currentSort.direction === 'asc' ? 'desc' : 'asc'
    const nextSort = `${field},${nextDir}`
    setDdSort(nextSort)
    setDdPage(0)
    loadDrilldown(selectedKey, selectedPeriod, 0, ddRowsPerPage, nextSort)
  }

  // Load persisted settings on first mount; default last 30 days if none
  useEffect(()=>{
    if (initRef.current) return
    initRef.current = true
    try {
      const raw = localStorage.getItem('ti_analytics_settings')
      if (raw){
        const s = JSON.parse(raw)
        if (Array.isArray(s.selectedMetrics)) setSelectedMetrics(s.selectedMetrics)
        if (typeof s.dimension === 'string') setDimension(s.dimension)
        if (typeof s.granularity === 'string') setGranularity(s.granularity)
        if (typeof s.groupId === 'string') setGroupId(s.groupId)
        if (typeof s.startIso === 'string') setStartIso(s.startIso)
        if (typeof s.endIso === 'string') setEndIso(s.endIso)
        if (typeof s.showSMA === 'boolean') setShowSMA(s.showSMA)
        if (typeof s.heatmapMetric === 'string') setHeatmapMetric(s.heatmapMetric)
        if (typeof s.corrX === 'string') setCorrX(s.corrX)
        if (typeof s.corrY === 'string') setCorrY(s.corrY)
        if (typeof s.phase === 'string') setPhase(s.phase)
        return
      }
    } catch(e){ /* ignore */ }
    // Fallback default: last 30 days
    const end = dayjs().toISOString()
    const start = dayjs().subtract(30, 'day').toISOString()
    setStartIso(start)
    setEndIso(end)
  }, [])

  // Persist key selections
  useEffect(()=>{
    const settings = { selectedMetrics, dimension, granularity, groupId, startIso, endIso, showSMA, heatmapMetric, corrX, corrY, phase }
    try { localStorage.setItem('ti_analytics_settings', JSON.stringify(settings)) } catch(e){ /* noop */ }
  }, [selectedMetrics, dimension, granularity, groupId, startIso, endIso, showSMA, heatmapMetric, corrX, corrY, phase])

  // Load groups and available metrics
  useEffect(()=>{ api.get('/api/groups').then(res=>{ setGroups(res.data) }) }, [])
  const loadMetrics = async () => {
    if (mode !== 'questionnaire') return
    const params = {}
    if (groupId) params.groupId = groupId
    if (startIso) params.start = startIso
    if (endIso) params.end = endIso
    if (phase) params.phase = phase
    const { data } = await api.get('/api/analytics/metrics', { params })
    setMetricsOptions(data.metrics || [])
    // default selection if empty
    if ((data.metrics || []).length && selectedMetrics.length === 0){
      const prefs = ['soreness','wellness','RPE']
      const defaults = prefs.filter(p => data.metrics.includes(p))
      setSelectedMetrics(defaults.length ? defaults : [data.metrics[0]])
    }
  }
  useEffect(()=>{ loadMetrics() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, startIso, endIso, mode])

  const run = async () => {
    if (mode === 'presence') {
      const params = { dimension, granularity }
      if (groupId) params.groupId = groupId
      if (startIso) params.start = startIso
      if (endIso) params.end = endIso
      const { data } = await api.get('/api/analytics/presence/aggregate', { params })
      // adapt into result-like shape so charts reuse logic where reasonable
      const rows = data.data || []
      const series = { presence: rows.map(r=>({ key: r.key, period: r.period, value: r.value, count: r.denominator })) }
      setResult({ metrics: ['presence'], dimension: data.dimension, granularity: data.granularity, data: series, labels: data.labels })
      setDrilldown(null)
      return
    }
    if (!selectedMetrics.length) return
    const params = { metrics: selectedMetrics, dimension, granularity }
    if (groupId) params.groupId = groupId
    if (startIso) params.start = startIso
    if (endIso) params.end = endIso
    if (phase) params.phase = phase
    const { data } = await api.get('/api/analytics/aggregate-multi', { params })
    setResult(data)
    setDrilldown(null)
    // initialize derived selectors
    const m = Object.keys(data?.data || {})
    if (m.length){
      if (!heatmapMetric) setHeatmapMetric(m[0])
      if (!corrX) setCorrX(m[0])
      if (!corrY) setCorrY(m[Math.min(1, m.length-1)])
    }
  }

  const openAthlete = async (userId) => {
    if (!userId) return
    try {
      const { data } = await api.get(`/api/users/${userId}`)
      setAthlete(data)
      setAthleteOpen(true)
    } catch(e) { /* noop */ }
  }

  const openValues = async (key, period) => {
    if (!key) return
    setValuesLoading(true)
    setValuesContext({ key, period })
    try {
  const params = { metrics: selectedMetrics, dimension, granularity, key, period, page: 0, size: 1000, sort: 'submittedAt,desc' }
      if (groupId) params.groupId = groupId
      if (startIso) params.start = startIso
      if (endIso) params.end = endIso
  if (phase) params.phase = phase
      const { data } = await api.get('/api/analytics/drilldown', { params })
      setValuesRows(data.rows || [])
    } catch(e) {
      setValuesRows([])
    } finally {
      setValuesLoading(false)
      setValuesOpen(true)
    }
  }

  // Derived: time series per period across metrics (weighted average across keys)
  const timeSeriesData = useMemo(()=>{
    if (!result?.data) return []
    const byPeriod = {}
    for (const m of Object.keys(result.data)){
      for (const row of result.data[m]){
        const { period, value, count } = row
        if (!byPeriod[period]) byPeriod[period] = { period }
        const accKey = `__acc_${m}`
        const cntKey = `__cnt_${m}`
        byPeriod[period][accKey] = (byPeriod[period][accKey] || 0) + (Number(value)||0) * (Number(count)||0)
        byPeriod[period][cntKey] = (byPeriod[period][cntKey] || 0) + (Number(count)||0)
      }
    }
    // finalize weighted avg
    Object.values(byPeriod).forEach(p => {
      for (const m of Object.keys(result.data)){
        const acc = p[`__acc_${m}`] || 0
        const cnt = p[`__cnt_${m}`] || 0
        p[m] = cnt ? acc / cnt : 0
      }
    })
    return Object.values(byPeriod).sort((a,b)=> String(a.period).localeCompare(String(b.period)))
  }, [result])

  // Moving average overlay for time series
  const timeSeriesSMA = useMemo(()=>{
    if (!showSMA || !result?.data) return []
    const window = 3
    const series = JSON.parse(JSON.stringify(timeSeriesData))
    for (const m of Object.keys(result.data)){
      for (let i=0;i<series.length;i++){
        let sum=0, cnt=0
        for (let w=0; w<window; w++){
          const idx = i - w
          if (idx >= 0){ sum += Number(series[idx][m]||0); cnt++ }
        }
        series[i][`${m}_sma`] = cnt ? sum/cnt : 0
      }
    }
    return series
  }, [showSMA, timeSeriesData, result])

  // Heatmap (athlete vs period) for selected metric
  const heatmapData = useMemo(()=>{
    if (!result?.data || !heatmapMetric || !result.data[heatmapMetric]) return { rows: [], cols: [], cells: {}, min:0, max:0 }
    const rowsSet = new Set()
    const colsSet = new Set()
    const cells = {}
    let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY
    for (const r of result.data[heatmapMetric]){
      rowsSet.add(r.key)
      colsSet.add(r.period)
      const v = Number(r.value)||0
      cells[`${r.key}|${r.period}`] = v
      if (v < min) min = v
      if (v > max) max = v
    }
    const rows = Array.from(rowsSet)
    const cols = Array.from(colsSet).sort((a,b)=> String(a).localeCompare(String(b)))
    return { rows, cols, cells, min: isFinite(min)?min:0, max: isFinite(max)?max:0 }
  }, [result, heatmapMetric])

  const valueToColor = (v, min, max) => {
    if (max <= min) return '#eeeeee'
    const t = (v - min) / (max - min)
    // green (low) -> yellow -> red (high)
    const hue = (1 - t) * 120 // 120=green, 0=red
    return `hsl(${hue}, 75%, 55%)`
  }

  // Correlation points from breakdown averages per athlete
  const correlationPoints = useMemo(()=>{
    if (!result?.data || !corrX || !corrY || !result.data[corrX] || !result.data[corrY]) return []
    // build maps key -> avg for X/Y using breakdownData results (already averaged per key)
    const mapX = {}
    const mapY = {}
    for (const row of result.data[corrX]){ mapX[row.key] = (mapX[row.key] || {sum:0,cnt:0}); mapX[row.key].sum += Number(row.value)||0; mapX[row.key].cnt += Number(row.count)||0 }
    for (const row of result.data[corrY]){ mapY[row.key] = (mapY[row.key] || {sum:0,cnt:0}); mapY[row.key].sum += Number(row.value)||0; mapY[row.key].cnt += Number(row.count)||0 }
    const pts = []
    for (const k of new Set([...Object.keys(mapX), ...Object.keys(mapY)])){
      const x = mapX[k] ? (mapX[k].cnt? mapX[k].sum/mapX[k].cnt : 0) : 0
      const y = mapY[k] ? (mapY[k].cnt? mapY[k].sum/mapY[k].cnt : 0) : 0
      pts.push({ key: k, x, y, label: (result.labels||{})[k] || k })
    }
    return pts
  }, [result, corrX, corrY])

  const correlationCoeff = useMemo(()=>{
    if (!correlationPoints.length) return null
    const xs = correlationPoints.map(p=>p.x)
    const ys = correlationPoints.map(p=>p.y)
    const n = xs.length
    const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length
    const mx = mean(xs), my = mean(ys)
    let num=0, dx=0, dy=0
    for (let i=0;i<n;i++){ const vx = xs[i]-mx, vy = ys[i]-my; num += vx*vy; dx += vx*vx; dy += vy*vy }
    const den = Math.sqrt(dx*dy)
    return den ? (num/den) : 0
  }, [correlationPoints])

  // Derived: breakdown per key across metrics (weighted average across periods)
  const breakdownData = useMemo(()=>{
    if (!result?.data) return []
    const labels = result.labels || {}
    const byKey = {}
    for (const m of Object.keys(result.data)){
      for (const row of result.data[m]){
        const { key, value, count } = row
        if (!byKey[key]) byKey[key] = { key, label: labels[key] || key }
        const accKey = `__acc_${m}`
        const cntKey = `__cnt_${m}`
        byKey[key][accKey] = (byKey[key][accKey] || 0) + (Number(value)||0) * (Number(count)||0)
        byKey[key][cntKey] = (byKey[key][cntKey] || 0) + (Number(count)||0)
      }
    }
    const arr = Object.values(byKey)
    arr.forEach(k => {
      for (const m of Object.keys(result.data)){
        const acc = k[`__acc_${m}`] || 0
        const cnt = k[`__cnt_${m}`] || 0
        k[m] = cnt ? acc / cnt : 0
      }
    })
    // sort by first metric desc
    const firstMetric = Object.keys(result.data)[0]
    return arr.sort((a,b)=> (b[firstMetric]||0) - (a[firstMetric]||0))
  }, [result])

  // Drilldown loader
  const loadDrilldown = async (key, period, page = ddPage, size = ddRowsPerPage, sort = ddSort) => {
    const params = { metrics: selectedMetrics, dimension, granularity, key, period, page, size, sort }
    if (groupId) params.groupId = groupId
    if (startIso) params.start = startIso
    if (endIso) params.end = endIso
    if (phase) params.phase = phase
    const { data } = await api.get('/api/analytics/drilldown', { params })
    setDrilldown(data)
    setSelectedKey(key)
    setSelectedPeriod(period)
    setDdPage(data.page || 0)
    setDdRowsPerPage(data.size || size)
    setDdSort(data.sort || sort)
  }
  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:1 }}>Analytics</Typography>
      <Tabs value={mode} onChange={(e,v)=>{ if (v) { setMode(v); setResult(null); } }} sx={{ borderBottom: 1, borderColor: 'divider', mb:2 }}>
        <Tab label="Questionnaire" value="questionnaire" />
        <Tab label="Presence" value="presence" />
      </Tabs>
      <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
        {mode === 'questionnaire' && (
          <FormControl sx={{ minWidth: 220 }} size="small">
            <InputLabel>Metrics</InputLabel>
            <Select
              multiple
              value={selectedMetrics}
              label="Metrics"
              onChange={e=>setSelectedMetrics(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {metricsOptions.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>Dimension</InputLabel>
          <Select value={dimension} label="Dimension" onChange={e=>setDimension(e.target.value)}>
            <MenuItem value="athlete">Athlete</MenuItem>
            <MenuItem value="group">Group</MenuItem>
            <MenuItem value="club">Club</MenuItem>
            {mode === 'questionnaire' && <MenuItem value="age">Age</MenuItem>}
            <MenuItem value="all">All</MenuItem>
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
        {mode === 'questionnaire' && (
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel shrink>Questionnaire</InputLabel>
            <Select
              value={phase}
              label="Questionnaire"
              onChange={e=>setPhase(e.target.value)}
              displayEmpty
              renderValue={(v)=>{
                if (!v) return 'All'
                return v === 'pre' ? 'Pre' : 'Post'
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pre">Pre</MenuItem>
              <MenuItem value="post">Post</MenuItem>
            </Select>
          </FormControl>
        )}
        <TextField
          select
          label="Group"
          value={groupId}
          onChange={e=>setGroupId(e.target.value)}
          sx={{ minWidth: 200 }}
          SelectProps={{
            displayEmpty: true,
            renderValue: (v) => {
              if (!v) return 'All'
              const g = groups.find((x) => String(x.id) === String(v))
              return g ? g.name : String(v)
            },
          }}
          InputLabelProps={{ shrink: true }}
        >
          <MenuItem value="">All</MenuItem>
          {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Start (optional)"
            value={startIso ? dayjs(startIso) : null}
            onChange={(v)=> setStartIso(v ? dayjs(v).toISOString() : '')}
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="End (optional)"
            value={endIso ? dayjs(endIso) : null}
            onChange={(v)=> setEndIso(v ? dayjs(v).toISOString() : '')}
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
        <Button variant="contained" onClick={run} disabled={mode==='questionnaire' && !selectedMetrics.length}>Run</Button>
      </Stack>

      {mode==='questionnaire' && result && result.data && (
        <Paper sx={{ p:2, mt:2 }}>
          <Typography variant="subtitle1">Aggregated results</Typography>
          {Object.keys(result.data).length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt:1 }}>No data for the selected filters. Try clearing the Group filter or widening the date range.</Typography>
          )}
          {/* Time-series chart: period on X-axis, one line per metric (weighted average across keys) */}
          <div style={{ width: '100%', height: 300, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={showSMA ? timeSeriesSMA : timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                {Object.keys(result.data).map((m, idx) => (
                  <Line key={m} type="monotone" dataKey={m} stroke={["#8884d8","#82ca9d","#ff7300","#413ea0"][idx%4]} name={m} dot={false} />
                ))}
                {showSMA && Object.keys(result.data).map((m, idx) => (
                  <Line key={`${m}_sma`} type="monotone" dataKey={`${m}_sma`} stroke={["#8884d8","#82ca9d","#ff7300","#413ea0"][idx%4]} name={`${m} (3-period SMA)`} dot={false} strokeDasharray="5 5" />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt:1 }}>
            <Button size="small" variant={showSMA ? 'contained' : 'outlined'} onClick={()=>setShowSMA(v=>!v)}>Toggle moving average</Button>
          </Stack>

          {/* Breakdown chart: show keys on X-axis, grouped bars per metric (weighted average across periods) */}
          <div style={{ width: '100%', height: 300, marginTop: 12 }}>
            <ResponsiveContainer>
              <BarChart data={breakdownData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} onClick={(state)=>{
                const payload = state?.activePayload?.[0]?.payload
                if (payload && payload.key){
                  // when clicking a bar area, try drilldown by key only (period optional)
                  loadDrilldown(payload.key, null)
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(result.data).map((m, idx) => (
                  <Bar key={m} dataKey={m} fill={["#82ca9d","#8884d8","#ff7300","#413ea0"][idx%4]} name={`Avg ${m}`} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap for selected metric */}
          {dimension === 'athlete' && (
            <Paper sx={{ p:2, mt:2 }} variant="outlined">
              <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems="center" sx={{ mb:1 }}>
                <Typography variant="subtitle2">Heatmap</Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Metric</InputLabel>
                  <Select value={heatmapMetric} label="Metric" onChange={e=>setHeatmapMetric(e.target.value)}>
                    {Object.keys(result.data).map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <div style={{ overflowX:'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell> Athlete </TableCell>
                      {heatmapData.cols.map(c => <TableCell key={c} align="center">{c}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {heatmapData.rows.map(k => (
                      <TableRow key={k}>
                        <TableCell sx={{ whiteSpace:'nowrap', textDecoration:'underline', cursor:'pointer' }} onClick={()=>loadDrilldown(String(k), null)}>{(result.labels||{})[k] || k}</TableCell>
                        {heatmapData.cols.map(c => {
                          const v = heatmapData.cells[`${k}|${c}`]
                          const color = valueToColor(v ?? 0, heatmapData.min, heatmapData.max)
                          return (
                            <TableCell key={c} align="center" onClick={()=>openValues(String(k), c)} sx={{ cursor:'pointer', backgroundColor: v==null?'#fafafa':color, color: '#000' }}>{v!=null? Number(v).toFixed(1): '-'}</TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Typography variant="caption" color="text.secondary">Low (green) → High (red)</Typography>
            </Paper>
          )}

          {/* Correlation scatter between two metrics */}
          {selectedMetrics.length >= 2 && (
            <Paper sx={{ p:2, mt:2 }} variant="outlined">
              <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems="center" sx={{ mb:1 }}>
                <Typography variant="subtitle2">Correlation</Typography>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>X</InputLabel>
                  <Select value={corrX} label="X" onChange={e=>setCorrX(e.target.value)}>
                    {selectedMetrics.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Y</InputLabel>
                  <Select value={corrY} label="Y" onChange={e=>setCorrY(e.target.value)}>
                    {selectedMetrics.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
                {correlationCoeff != null && (
                  <Typography variant="body2" color="text.secondary">r = {correlationCoeff.toFixed(2)}</Typography>
                )}
                <Button size="small" onClick={()=>{
                  const rows = correlationPoints.map(p=>({ label:p.label, key:p.key, [corrX]: p.x, [corrY]: p.y }))
                  downloadCsv(`correlation_${corrX}_${corrY}.csv`, rows, [
                    { header:'Key', field:'key' },
                    { header:'Label', field:'label' },
                    { header:corrX, field:corrX },
                    { header:corrY, field:corrY }
                  ])
                }} disabled={!correlationPoints.length}>Export CSV</Button>
              </Stack>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid />
                    <XAxis dataKey="x" name={corrX} />
                    <YAxis dataKey="y" name={corrY} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n, p)=>[Number(v).toFixed(2), n]} labelFormatter={()=>''} />
                    <Legend />
                    <Scatter name="Athletes" data={correlationPoints} fill="#8884d8" onClick={(data)=>{ if (data?.payload?.key) loadDrilldown(String(data.payload.key), null) }} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Paper>
          )}

          {/* Raw aggregate rows: click to drilldown by key+period */}
          <Table size="small" sx={{ mt:2 }}>
            <TableHead>
              <TableRow><TableCell>Key</TableCell><TableCell>Period</TableCell><TableCell>Average</TableCell><TableCell>Count</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {/* Flatten multi-metric data by joining metric name to each row */}
              {Object.entries(result.data).flatMap(([m, rows]) => rows.map((r, idx) => ({...r, __metric:m}))).map((r, idx) => (
                <TableRow key={idx} hover onClick={()=>loadDrilldown(r.key, r.period)} sx={{ cursor:'pointer' }}>
                  <TableCell onClick={(e)=>{ e.stopPropagation(); if (dimension==='athlete' && r.key && /^\d+$/.test(String(r.key))) openValues(String(r.key), r.period) }} sx={{ textDecoration: (dimension==='athlete' && r.key && /^\d+$/.test(String(r.key))) ? 'underline' : 'none', cursor: (dimension==='athlete' && r.key && /^\d+$/.test(String(r.key))) ? 'pointer' : 'inherit' }}>{(result.labels||{})[r.key] || r.key}</TableCell>
                  <TableCell>{r.period}</TableCell>
                  <TableCell>{Number(r.value).toFixed(2)} <Typography component="span" variant="caption" color="text.secondary">({r.__metric})</Typography></TableCell>
                  <TableCell>{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {mode==='presence' && result && result.data && (
        <Paper sx={{ p:2, mt:2 }}>
          <Typography variant="subtitle1">Presence results</Typography>
          {/* Time-series presence rate */}
          <div style={{ width: '100%', height: 300, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0,1]} tickFormatter={(v)=> `${Math.round(v*100)}%`} />
                <Tooltip formatter={(v)=> `${Math.round(Number(v)*100)}%`} />
                <Line type="monotone" dataKey="presence" stroke="#8884d8" name="Presence rate" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Breakdown by key */}
          <div style={{ width: '100%', height: 300, marginTop: 12 }}>
            <ResponsiveContainer>
              <BarChart data={breakdownData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0,1]} tickFormatter={(v)=> `${Math.round(v*100)}%`} />
                <Tooltip formatter={(v)=> `${Math.round(Number(v)*100)}%`} />
                <Legend />
                <Bar dataKey="presence" fill="#82ca9d" name="Presence rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Raw rows */}
          <Table size="small" sx={{ mt:2 }}>
            <TableHead>
              <TableRow><TableCell>Key</TableCell><TableCell>Period</TableCell><TableCell>Presence</TableCell><TableCell>Eligible</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {(result.data.presence || []).map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{(result.labels||{})[r.key] || r.key}</TableCell>
                  <TableCell>{r.period}</TableCell>
                  <TableCell>{Math.round(Number(r.value||0)*100)}%</TableCell>
                  <TableCell>{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Drilldown section */}
      {drilldown && (
        <Paper sx={{ p:2, mt:2 }}>
          <Typography variant="subtitle1">Drill-down</Typography>
          {(selectedKey || selectedPeriod) && (
            <Typography variant="body2" color="text.secondary" sx={{ mb:1 }}>
              {selectedKey ? `Key: ${(result?.labels||{})[selectedKey] || selectedKey}` : ''}
              {selectedKey && selectedPeriod ? ' · ' : ''}
              {selectedPeriod ? `Period: ${selectedPeriod}` : ''}
            </Typography>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sortDirection={currentSort.field==='submittedAt' ? currentSort.direction : false}>
                  <TableSortLabel
                    active={currentSort.field==='submittedAt'}
                    direction={currentSort.field==='submittedAt' ? currentSort.direction : 'asc'}
                    onClick={()=>handleSort('submittedAt')}
                  >Submitted</TableSortLabel>
                </TableCell>
                <TableCell sortDirection={currentSort.field==='metric' ? currentSort.direction : false}>
                  <TableSortLabel
                    active={currentSort.field==='metric'}
                    direction={currentSort.field==='metric' ? currentSort.direction : 'asc'}
                    onClick={()=>handleSort('metric')}
                  >Metric</TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={currentSort.field==='value' ? currentSort.direction : false}>
                  <TableSortLabel
                    active={currentSort.field==='value'}
                    direction={currentSort.field==='value' ? currentSort.direction : 'asc'}
                    onClick={()=>handleSort('value')}
                  >Value</TableSortLabel>
                </TableCell>
                <TableCell sortDirection={currentSort.field==='trainingId' ? currentSort.direction : false}>
                  <TableSortLabel
                    active={currentSort.field==='trainingId'}
                    direction={currentSort.field==='trainingId' ? currentSort.direction : 'asc'}
                    onClick={()=>handleSort('trainingId')}
                  >Training</TableSortLabel>
                </TableCell>
                <TableCell sortDirection={currentSort.field==='phase' ? currentSort.direction : false}>
                  <TableSortLabel
                    active={currentSort.field==='phase'}
                    direction={currentSort.field==='phase' ? currentSort.direction : 'asc'}
                    onClick={()=>handleSort('phase')}
                  >Phase</TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(drilldown.rows || []).map((r, idx) => (
                <TableRow key={idx} hover onClick={()=> r.userId && openAthlete(String(r.userId))} sx={{ cursor: r.userId ? 'pointer' : 'default' }}>
                  <TableCell>{dayjs(r.submittedAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell>{r.metric}</TableCell>
                  <TableCell align="right">{Number(r.value).toFixed(2)}</TableCell>
                  <TableCell>{r.trainingId ?? ''}</TableCell>
                  <TableCell>{r.phase ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={drilldown.total || 0}
            page={ddPage}
            onPageChange={(e, newPage)=>{ setDdPage(newPage); loadDrilldown(selectedKey, selectedPeriod, newPage, ddRowsPerPage, ddSort) }}
            rowsPerPage={ddRowsPerPage}
            onRowsPerPageChange={(e)=>{ const size = parseInt(e.target.value,10); setDdRowsPerPage(size); setDdPage(0); loadDrilldown(selectedKey, selectedPeriod, 0, size, ddSort) }}
            rowsPerPageOptions={[10,25,50,100]}
          />
        </Paper>
      )}
      {/* Athlete details dialog */}
      <Dialog open={athleteOpen} onClose={()=>setAthleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Athlete details</DialogTitle>
        <DialogContent>
          {athlete ? (
            <Stack spacing={1} sx={{ mt:1 }}>
              <Typography><strong>Name:</strong> {athlete.firstName} {athlete.lastName}</Typography>
              <Typography><strong>Email:</strong> {athlete.email}</Typography>
              {athlete.birthDate && <Typography><strong>Birth date:</strong> {athlete.birthDate}</Typography>}
              {athlete.groupName && <Typography><strong>Group:</strong> {athlete.groupName}</Typography>}
              {athlete.phone && <Typography><strong>Phone:</strong> {athlete.phone}</Typography>}
              {athlete.address && <Typography><strong>Address:</strong> {athlete.address}</Typography>}
              <Typography><strong>Status:</strong> {athlete.active ? 'Active' : 'Inactive'}</Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setAthleteOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Values dialog: numbers behind the aggregate */}
      <Dialog open={valuesOpen} onClose={()=>setValuesOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Data points{valuesContext?.period ? ` — Period ${valuesContext.period}` : ''}</DialogTitle>
        <DialogContent>
          {valuesLoading ? (
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Training</TableCell>
                    <TableCell>Phase</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(valuesRows || []).map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{dayjs(r.submittedAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                      <TableCell>{r.metric}</TableCell>
                      <TableCell align="right">{Number(r.value).toFixed(2)}</TableCell>
                      <TableCell>{r.trainingId ?? ''}</TableCell>
                      <TableCell>{r.phase ?? ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!valuesRows || valuesRows.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ mt:1 }}>No data points for this selection.</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> downloadCsv('data-points.csv', valuesRows, [
            { header:'Submitted', value:(r)=> dayjs(r.submittedAt).format('YYYY-MM-DD HH:mm') },
            { header:'Metric', field:'metric' },
            { header:'Value', value:(r)=> Number(r.value).toFixed(2) },
            { header:'Training', field:'trainingId' },
            { header:'Phase', field:'phase' },
          ]) } disabled={!valuesRows || valuesRows.length===0}>Export CSV</Button>
          <Button onClick={()=>setValuesOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
