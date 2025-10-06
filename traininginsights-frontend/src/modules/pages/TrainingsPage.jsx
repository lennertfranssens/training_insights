import React, { useEffect, useState } from 'react'
import { formatIsoDateTime } from '../common/dateUtils'
import api from '../api/client'
import { useSnackbar } from '../common/SnackbarProvider'
import { useAuth } from '../auth/AuthContext'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, CircularProgress, Card, CardHeader, CardContent, Divider, Box, Tabs, Tab } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'
import QuestionnaireForm from '../common/QuestionnaireForm'
import PlaceholderText from '../common/PlaceholderText'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import TrainingsListCalendar from '../common/TrainingsListCalendar'
import GroupColorLegend from '../common/GroupColorLegend'
export default function TrainingsPage(){
  const [trainings, setTrainings] = useState([])
  const [presenceRates, setPresenceRates] = useState({}) // trainingId -> rate (0..1)
  const [groupFilter, setGroupFilter] = useState('') // filter trainings by group id
  const [bulkGroupByTraining, setBulkGroupByTraining] = useState({}) // trainingId -> groupId or '' for all groups
  const { showSnackbar } = useSnackbar()
  const [groups, setGroups] = useState([])
  const [questionnaires, setQuestionnaires] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', trainingTime:'', visibleToAthletes:true, groupIds:[], preQuestionnaireId:null, postQuestionnaireId:null })
  const [timeError, setTimeError] = useState('')
  const [fileToUpload, setFileToUpload] = useState(null)
  const [editingTraining, setEditingTraining] = useState(null)
  const [attachments, setAttachments] = useState({})
  const [questionnaireResponses, setQuestionnaireResponses] = useState({}) // keyed by training id -> { pre: [], post: [] }
  const [selectedResponse, setSelectedResponse] = useState(null)
  const [selectedResponseOpen, setSelectedResponseOpen] = useState(false)
  const [rosters, setRosters] = useState({}) // trainingId -> [{ userId, firstName, lastName, email, groupId, groupName, present }]
  const [bulkLoadingByTraining, setBulkLoadingByTraining] = useState({}) // trainingId -> boolean
  const [attendanceFilterByTraining, setAttendanceFilterByTraining] = useState({}) // trainingId -> string filter
  // helper to download/open an attachment using the API client (sends Authorization header)
  const openAttachment = async (attachmentId, filename) => {
    try {
      const resp = await api.get(`/api/trainings/attachments/${attachmentId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(resp.data)
      // trigger download with suggested filename
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'attachment'
      document.body.appendChild(a)
      a.click()
      a.remove()
      // revoke after short delay to allow download
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (e) {
      console.error('Failed to open attachment', e)
      showSnackbar('Unable to download attachment (check your permissions or server)')
    }
  }
  const { auth } = useAuth()
  const hasRole = (role) => {
    const rs = auth?.roles || []
    if (!rs || !rs.length) return false
    // accept both 'ROLE_X' and 'X'
    return rs.some(r => r === role || r === role.replace(/^ROLE_/, '') || ('ROLE_' + r) === role)
  }
  const hasAnyRole = (roles) => roles.some(r => hasRole(r))
  // trainer-only page: athlete read-only view removed
  // persist view mode so users (including athletes) can choose between list/calendar
  const storedView = typeof window !== 'undefined' ? window.localStorage.getItem('trainings.viewMode') : null
  const [viewMode, setViewMode] = useState(storedView || 'list')
  // allow trainers to switch between upcoming-only and all trainings
  const storedRange = typeof window !== 'undefined' ? window.localStorage.getItem('trainings.range') : null
  const [trainingRange, setTrainingRange] = useState(storedRange || 'all') // 'upcoming' | 'all'
  const load = async () => {
    const [t, g, q] = await Promise.all([ api.get('/api/trainings'), api.get('/api/groups'), api.get('/api/questionnaires') ])
    setTrainings(t.data); setGroups(g.data); setQuestionnaires(q.data)
  }
  useEffect(()=>{ load() }, [])
  const create = async () => {
    if (form.preQuestionnaireId && form.postQuestionnaireId && String(form.preQuestionnaireId) === String(form.postQuestionnaireId)) { showSnackbar('Pre and post questionnaires cannot be the same'); return }
    const payload = { title: form.title, description: form.description, trainingTime: new Date(form.trainingTime).toISOString(), trainingEndTime: form.trainingEndTime ? new Date(form.trainingEndTime).toISOString() : null, preNotificationMinutes: form.preNotificationMinutes || 0, visibleToAthletes: form.visibleToAthletes }
    const { data } = await api.post('/api/trainings', payload)
    // assign groups first so a creating trainer is considered assigned and can upload attachments
    if (form.groupIds?.length){ await api.post(`/api/trainings/${data.id}/assign-groups`, { groupIds: form.groupIds }) }
    if (fileToUpload) {
      const fd = new FormData(); fd.append('file', fileToUpload);
      await api.post(`/api/trainings/${data.id}/attachments`, fd)
    }
    if (form.preQuestionnaireId || form.postQuestionnaireId) { await api.post(`/api/trainings/${data.id}/set-questionnaires?preId=${form.preQuestionnaireId||''}&postId=${form.postQuestionnaireId||''}`) }
    setOpen(false); setEditingTraining(null); setForm({ title:'', description:'', trainingTime:'', visibleToAthletes:true, groupIds:[], preQuestionnaireId:null, postQuestionnaireId:null }); await load()
  }

  const save = async () => {
    if (form.preQuestionnaireId && form.postQuestionnaireId && String(form.preQuestionnaireId) === String(form.postQuestionnaireId)) { showSnackbar('Pre and post questionnaires cannot be the same'); return }
    setTimeError('')
    // validate times: if trainingEndTime provided it must be after trainingTime
    if (form.trainingEndTime) {
      const start = new Date(form.trainingTime)
      const end = new Date(form.trainingEndTime)
      if (!(end > start)) { setTimeError('End time must be after start time'); return }
    }
    const payload = { title: form.title, description: form.description, trainingTime: new Date(form.trainingTime).toISOString(), trainingEndTime: form.trainingEndTime ? new Date(form.trainingEndTime).toISOString() : null, preNotificationMinutes: form.preNotificationMinutes || 0, visibleToAthletes: form.visibleToAthletes }
    if (editingTraining) {
      const { data } = await api.put(`/api/trainings/${editingTraining.id}`, payload)
      if (form.groupIds?.length){ await api.post(`/api/trainings/${editingTraining.id}/assign-groups`, { groupIds: form.groupIds }) }
      if (form.preQuestionnaireId || form.postQuestionnaireId) { await api.post(`/api/trainings/${editingTraining.id}/set-questionnaires?preId=${form.preQuestionnaireId||''}&postId=${form.postQuestionnaireId||''}`) }
      // if a new file was chosen during edit, upload it
      if (fileToUpload) {
        const fd = new FormData(); fd.append('file', fileToUpload);
        await api.post(`/api/trainings/${editingTraining.id}/attachments`, fd)
      }
    } else {
      await create()
    }
    setOpen(false); setEditingTraining(null); setForm({ title:'', description:'', trainingTime:'', visibleToAthletes:true, groupIds:[], preQuestionnaireId:null, postQuestionnaireId:null }); await load()
  }
  const remove = async (id) => { if (!confirm('Delete training?')) return; await api.delete(`/api/trainings/${id}`); await load() }
  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Trainings</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Filter by group (trainer-side only) */}
            <TextField select size="small" label="Filter group" value={groupFilter} onChange={e=>setGroupFilter(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">All groups</MenuItem>
              {groups.map(g => <MenuItem key={g.id} value={String(g.id)}>{g.name}</MenuItem>)}
            </TextField>
          <Button variant="contained" onClick={()=>setOpen(true)}>Create</Button>
        </Stack>
      </Stack>
      {/* Combined bar: view tabs (left) + range select (right) */}
      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', mb:2 }}>
        <Tabs value={viewMode} onChange={(e,v)=>{ if (v){ setViewMode(v); try{ window.localStorage.setItem('trainings.viewMode', v) }catch(e){} } }} sx={{ minHeight: 'auto' }} TabIndicatorProps={{ sx: { height: 2 }}}>
          <Tab label="List" value="list" sx={{ minHeight: 'auto' }} />
          <Tab label="Calendar" value="calendar" sx={{ minHeight: 'auto' }} />
        </Tabs>
        <Box sx={{ flex: 1 }} />
        <TextField
          select
          variant="standard"
          label="Range"
          value={trainingRange}
          onChange={(e)=>{ const v = e.target.value; setTrainingRange(v); try{ window.localStorage.setItem('trainings.range', v) }catch(err){} }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="upcoming">Upcoming</MenuItem>
          <MenuItem value="all">All</MenuItem>
        </TextField>
      </Box>
          <TrainingsListCalendar
          trainings={(trainings||[])
            .filter(t => {
              if (!groupFilter) return true
              return (t.groups||[]).some(g => String(g.id) === String(groupFilter))
            })
            .filter(t => {
              if (trainingRange !== 'upcoming') return true
              try { return new Date(t.trainingTime).getTime() >= Date.now() } catch(e){ return true }
            })}
        viewMode={viewMode}
        onViewModeChange={(v)=>{ setViewMode(v); try{ window.localStorage.setItem('trainings.viewMode', v) }catch(e){} }}
        initialDate={(() => {
          if (viewMode !== 'calendar') return undefined
          const list = (trainings||[])
            .filter(t => !groupFilter || (t.groups||[]).some(g => String(g.id) === String(groupFilter)))
            .filter(t => trainingRange !== 'upcoming' || (new Date(t.trainingTime).getTime() >= Date.now()))
          if (!list.length) return undefined
          try {
            const now = Date.now()
            const past = list
              .map(t => new Date(t.trainingTime))
              .filter(d => d.getTime() <= now)
              .sort((a,b) => b - a)
            if (past.length) return past[0]
            const future = list
              .map(t => new Date(t.trainingTime))
              .filter(d => d.getTime() > now)
              .sort((a,b) => a - b)
            if (future.length) return future[0]
          } catch(e){}
          return undefined
        })()}
        onDateClick={(dateOrStr)=>{
          // only trainers/admins/superadmins can create trainings from calendar clicks
          const isTrainer = hasAnyRole(['ROLE_TRAINER','ROLE_ADMIN','ROLE_SUPERADMIN'])
          if (!isTrainer) {
            // silently ignore for non-trainers (or optionally show a small notice)
            return
          }
          console.log('Date clicked', dateOrStr)
          // FullCalendar passes dateStr (YYYY-MM-DD) in local calendar timezone; accept either a Date or string
          let yearMonthDay = null
          if (!dateOrStr) return
          if (typeof dateOrStr === 'string') {
            yearMonthDay = dateOrStr // expected 'YYYY-MM-DD'
          } else if (dateOrStr instanceof Date) {
            // Build local YYYY-MM-DD
            const d = dateOrStr
            const yyyy = d.getFullYear()
            const mm = String(d.getMonth()+1).padStart(2,'0')
            const dd = String(d.getDate()).padStart(2,'0')
            yearMonthDay = `${yyyy}-${mm}-${dd}`
          } else {
            // fallback to Date constructor
            const d = new Date(dateOrStr)
            const yyyy = d.getFullYear()
            const mm = String(d.getMonth()+1).padStart(2,'0')
            const dd = String(d.getDate()).padStart(2,'0')
            yearMonthDay = `${yyyy}-${mm}-${dd}`
          }
          // default start time 09:00 local
          const local = `${yearMonthDay}T09:00`
          setForm({ title:'', description:'', trainingTime: local, visibleToAthletes:true, groupIds:[], preQuestionnaireId:null, postQuestionnaireId:null })
          setEditingTraining(null); setOpen(true)
        }}
          onEventClick={async (id, t)=>{
          try {
            // debug logging removed
            if (!t) {
              const found = trainings.find(x=>String(x.id) === String(id))
              if (!found) { showSnackbar('Unable to open training: local training data not found. Try refreshing the page.'); return }
              t = found
            }
            const isTrainer = hasAnyRole(['ROLE_TRAINER','ROLE_ADMIN','ROLE_SUPERADMIN'])
            if (isTrainer) {
              setEditingTraining(t)
              const { data: at } = await api.get(`/api/trainings/${t.id}/attachments`)
              setAttachments(prev => ({ ...prev, [t.id]: at }))
              // load questionnaire responses for this training (pre/post)
              try { const { data: qr } = await api.get(`/api/trainings/${t.id}/questionnaire-responses`); setQuestionnaireResponses(prev => ({ ...prev, [t.id]: qr })); } catch(e) { /* ignore */ }
              const dt = t.trainingTime ? new Date(t.trainingTime) : null
              const endDt = t.trainingEndTime ? new Date(t.trainingEndTime) : null
              const local = dt ? new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''
              const localEnd = endDt ? new Date(endDt.getTime() - endDt.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''
              setForm({ title: t.title, description: t.description || '', trainingTime: local, trainingEndTime: localEnd, visibleToAthletes: t.visibleToAthletes, groupIds: (t.groups||[]).map(g=>g.id), preQuestionnaireId: t.preQuestionnaire?.id || null, postQuestionnaireId: t.postQuestionnaire?.id || null, preNotificationMinutes: t.preNotificationMinutes || 0 })
              setOpen(true)
              return
            }
            // athlete flow
            try {
              const { data: vt } = await api.get(`/api/athlete/trainings/${t.id}/view`)
              setViewTraining(vt)
              if (vt.visibleToAthletes) {
                const { data: at } = await api.get(`/api/trainings/${t.id}/attachments`)
                setAttachments(prev => ({ ...prev, [t.id]: at }))
              }
              setViewOpen(true)
            } catch (err) {
              // unable to open training for athlete (logged silently)
            }
          } catch (e) { console.error(e) }
        }}
            autoFocusToday={true}
      onReschedule={async (trainingId, newStartIso, newEndIso)=>{
              // Optimistic local update
              setTrainings(prev => prev.map(t => String(t.id)===String(trainingId) ? { ...t, trainingTime: newStartIso, trainingEndTime: newEndIso || t.trainingEndTime } : t))
              try {
                await api.patch(`/api/trainings/${trainingId}/reschedule`, { trainingTime: newStartIso, trainingEndTime: newEndIso || null })
                showSnackbar('Training rescheduled')
                // refresh in background
                load()
              } catch (e) {
                showSnackbar('Failed to reschedule');
                // revert by reloading
                load();
                throw e
              }
            }}
        renderItemContent={(t)=> (
          <>
            <Typography>{t.title}</Typography>
            <Typography variant="body2">{formatIsoDateTime(t.trainingTime)}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
              {(t.groups||[]).map(g => <Chip key={g.id} label={g.name} size="small" />)}
            </Stack>
            {t.visibleToAthletes && attachments[t.id] && (
              <div style={{ marginTop: 8 }}>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {attachments[t.id].map(a => (
                    <li key={a.id}><a href="#" onClick={e => { e.preventDefault(); openAttachment(a.id, a.filename) }}>{a.filename}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        renderActions={(t)=> (
          <Stack direction="row" spacing={1}>
            {/* Presence rate per training (trainer-only) */}
            {hasAnyRole(['ROLE_TRAINER','ROLE_ADMIN','ROLE_SUPERADMIN']) && (
              <div style={{ marginTop: 8 }}>
                <Button size="small" onClick={async()=>{
                  try { const { data } = await api.get(`/api/trainings/${t.id}/attendance/rate`); setPresenceRates(prev => ({ ...prev, [t.id]: data?.presenceRate || 0 })) } catch(e){}
                }}>Presence rate</Button>
                {presenceRates[t.id] != null && <Typography variant="body2" sx={{ display:'inline-block', ml:1 }}>Presence: {Math.round((presenceRates[t.id]||0)*100)}%</Typography>}
              </div>
            )}
            <Button variant="outlined" onClick={async () => {
              setEditingTraining(t);
              const { data: at } = await api.get(`/api/trainings/${t.id}/attachments`)
              setAttachments(prev => ({ ...prev, [t.id]: at }))
              // load questionnaire responses for edit view
              try { const { data: qr } = await api.get(`/api/trainings/${t.id}/questionnaire-responses`); setQuestionnaireResponses(prev => ({ ...prev, [t.id]: qr })); } catch(e) { /* ignore */ }
              // load roster for this training
              try { const { data: roster } = await api.get(`/api/trainings/${t.id}/attendance`); setRosters(prev => ({ ...prev, [t.id]: roster })); } catch(e) { /* ignore */ }
              const dt = t.trainingTime ? new Date(t.trainingTime) : null
              const endDt = t.trainingEndTime ? new Date(t.trainingEndTime) : null
              const local = dt ? new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''
              const localEnd = endDt ? new Date(endDt.getTime() - endDt.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''
              setForm({ title: t.title, description: t.description || '', trainingTime: local, trainingEndTime: localEnd, visibleToAthletes: t.visibleToAthletes, groupIds: (t.groups||[]).map(g=>g.id), preQuestionnaireId: t.preQuestionnaire?.id || null, postQuestionnaireId: t.postQuestionnaire?.id || null, preNotificationMinutes: t.preNotificationMinutes || 0 })
              setOpen(true)
            }}>Edit</Button>
            {hasRole('ROLE_ATHLETE') && (
              <Button onClick={async ()=>{
                try {
                  const { data: vt } = await api.get(`/api/athlete/trainings/${t.id}/view`)
                  setViewTraining(vt)
                  if (vt.visibleToAthletes) {
                    const { data: at } = await api.get(`/api/trainings/${t.id}/attachments`)
                    setAttachments(prev => ({ ...prev, [t.id]: at }))
                  }
                  setViewOpen(true)
                } catch (err) { showSnackbar('Unable to open training for athlete: ' + (err?.response?.data?.message || err?.message || 'Unknown error')) }
              }}>Open</Button>
            )}
            <Button color="error" onClick={()=>remove(t.id)}>Delete</Button>
          </Stack>
        )}
      />
      {viewMode === 'calendar' && (
        <GroupColorLegend groups={groups.filter(g => !groupFilter || String(g.id) === String(groupFilter))} />
      )}
      <Dialog open={open} onClose={()=>{ setOpen(false); setEditingTraining(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTraining ? 'Edit Training' : 'Create Training'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <Card variant="outlined">
              <CardHeader title="Details" subheader="Title, description and timing" />
              <CardContent>
                <Stack spacing={2}>
                  <TextField label="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} fullWidth />
                  <TextField label="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} multiline rows={3} fullWidth />
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      label="Training start"
                      value={form.trainingTime ? dayjs(form.trainingTime) : null}
                      onChange={(val)=>{
                        const newStart = val ? val.toISOString() : ''
                        let newEnd = form.trainingEndTime
                        try {
                          if (!newStart) newEnd = ''
                          else if (newEnd && (new Date(newEnd) <= new Date(newStart))) newEnd = ''
                        } catch(err){ newEnd = '' }
                        setForm({ ...form, trainingTime: newStart, trainingEndTime: newEnd })
                      }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                    <DateTimePicker
                      label="Training end"
                      value={form.trainingEndTime ? dayjs(form.trainingEndTime) : null}
                      onChange={(val)=>{
                        const newEnd = val ? val.toISOString() : ''
                        setForm({ ...form, trainingEndTime: newEnd })
                      }}
                      disabled={!form.trainingTime}
                      minDateTime={form.trainingTime ? dayjs(form.trainingTime) : undefined}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                  {!form.trainingTime && <Typography variant="body2" color="text.secondary">Enter a start time first to set an end time</Typography>}
                  {timeError && <Typography color="error" variant="body2">{timeError}</Typography>}
                  <TextField label="Notify minutes before" type="number" value={form.preNotificationMinutes||0} onChange={e=>setForm({...form, preNotificationMinutes: Number(e.target.value)})} sx={{ maxWidth: 260 }} />
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader title="Groups & Questionnaires" subheader="Audience settings and pre/post forms" />
              <CardContent>
                <Stack spacing={2}>
                  <TextField select label="Groups" value={form.groupIds} onChange={e=>setForm({...form, groupIds:e.target.value})} SelectProps={{ multiple:true }} fullWidth>
                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                  </TextField>
                  <TextField select label="Visible to athletes" value={form.visibleToAthletes ? 'yes' : 'no'} onChange={e=>setForm({...form, visibleToAthletes: e.target.value === 'yes'})} sx={{ maxWidth:260 }}>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </TextField>
                  <TextField select label="Pre-questionnaire" value={form.preQuestionnaireId||''} onChange={e=>setForm({...form, preQuestionnaireId:e.target.value||null})} fullWidth>
                    <MenuItem value="">None</MenuItem>
                    {questionnaires.map(q => (
                      <MenuItem key={q.id} value={q.id} disabled={form.postQuestionnaireId && String(form.postQuestionnaireId) === String(q.id)}>{q.title}</MenuItem>
                    ))}
                  </TextField>
                  <TextField select label="Post-questionnaire" value={form.postQuestionnaireId||''} onChange={e=>setForm({...form, postQuestionnaireId:e.target.value||null})} fullWidth>
                    <MenuItem value="">None</MenuItem>
                    {questionnaires.map(q => (
                      <MenuItem key={q.id} value={q.id} disabled={form.preQuestionnaireId && String(form.preQuestionnaireId) === String(q.id)}>{q.title}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader title="Attachments" subheader="Upload and manage files for this training" />
              <CardContent>
                <Stack spacing={2}>
                  <div>
                    <input accept="*" style={{ display: 'none' }} id="training-attachment-input" type="file" onChange={e=>setFileToUpload(e.target.files?.[0]||null)} />
                    <label htmlFor="training-attachment-input">
                      <Button component="span" size="small" variant="outlined">{fileToUpload ? 'Change file' : 'Choose file'}</Button>
                    </label>
                    <span style={{ marginLeft: 12, verticalAlign: 'middle' }}>
                      {fileToUpload ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{fileToUpload.name}</strong>
                          <Button size="small" color="error" onClick={()=>setFileToUpload(null)}>Remove</Button>
                        </span>
                      ) : (
                        <PlaceholderText>No file selected (optional)</PlaceholderText>
                      )}
                    </span>
                  </div>
                  {editingTraining && attachments[editingTraining.id] && (
                    <div>
                      <Typography variant="subtitle2" sx={{ mb:1 }}>Existing attachments</Typography>
                      <ul style={{ marginTop: 4 }}>
                        {attachments[editingTraining.id].map(a => (
                          <li key={a.id}>
                            <a href="#" onClick={e => { e.preventDefault(); openAttachment(a.id, a.filename) }}>{a.filename}</a>
                            <Button size="small" color="error" onClick={async ()=>{ await api.delete(`/api/trainings/attachments/${a.id}`); const { data: at } = await api.get(`/api/trainings/${editingTraining.id}/attachments`); setAttachments(prev => ({ ...prev, [editingTraining.id]: at })) }} sx={{ ml:1 }}>Delete</Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Bulk attendance actions and roster (trainer-only) */}
            {editingTraining && hasAnyRole(['ROLE_TRAINER','ROLE_ADMIN','ROLE_SUPERADMIN']) && (
              <Card variant="outlined">
                <CardHeader title="Attendance" subheader="Bulk actions and per-athlete presence" />
                <CardContent>
                  <Stack spacing={1.5} sx={{ mb:2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap:'nowrap', overflowX:'auto', pb:0.5 }}>
                      <TextField select size="small" label="Bulk group" value={bulkGroupByTraining[editingTraining.id] || ''} onChange={e=>setBulkGroupByTraining(prev => ({ ...prev, [editingTraining.id]: e.target.value }))} sx={{ minWidth: 200 }}>
                        <MenuItem value="">All groups</MenuItem>
                        {(editingTraining.groups||[]).map(g => <MenuItem key={g.id} value={String(g.id)}>{g.name}</MenuItem>)}
                      </TextField>
                      <TextField size="small" label="Filter" value={attendanceFilterByTraining[editingTraining.id] || ''} onChange={e=>setAttendanceFilterByTraining(prev => ({ ...prev, [editingTraining.id]: e.target.value }))} sx={{ minWidth: 220 }} placeholder="Search name/group" />
                      <Button size="small" variant="outlined" onClick={async()=>{
                        try { const { data: roster } = await api.get(`/api/trainings/${editingTraining.id}/attendance`); setRosters(prev => ({ ...prev, [editingTraining.id]: roster })); showSnackbar('Roster loaded') } catch(e){ showSnackbar('Failed to load roster') }
                      }}>Load</Button>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap:'wrap', pt:1, borderTop:'1px dashed rgba(0,0,0,0.15)' }}>
                      <Button size="small" variant="outlined" disabled={!!bulkLoadingByTraining[editingTraining.id]} onClick={async()=>{
                        try {
                          setBulkLoadingByTraining(prev => ({ ...prev, [editingTraining.id]: true }))
                          const { data } = await api.post(`/api/trainings/${editingTraining.id}/attendance/bulk`, { action: 'presentAll', groupId: bulkGroupByTraining[editingTraining.id] || null });
                          showSnackbar(`Marked ${data?.updated||0} present`)
                          // refresh roster and rate
                          try { const { data: roster } = await api.get(`/api/trainings/${editingTraining.id}/attendance`); setRosters(prev => ({ ...prev, [editingTraining.id]: roster })); } catch(e){}
                          try { const { data: rate } = await api.get(`/api/trainings/${editingTraining.id}/attendance/rate`); setPresenceRates(prev => ({ ...prev, [editingTraining.id]: rate?.presenceRate || 0 })); } catch(e){}
                        } catch(e) { showSnackbar('Bulk present failed') }
                        finally { setBulkLoadingByTraining(prev => ({ ...prev, [editingTraining.id]: false })) }
                      }}>All present</Button>
                      <Button size="small" variant="outlined" disabled={!!bulkLoadingByTraining[editingTraining.id]} onClick={async()=>{
                        try {
                          setBulkLoadingByTraining(prev => ({ ...prev, [editingTraining.id]: true }))
                          const { data } = await api.post(`/api/trainings/${editingTraining.id}/attendance/bulk`, { action: 'absentAll', groupId: bulkGroupByTraining[editingTraining.id] || null });
                          showSnackbar(`Marked ${data?.updated||0} absent`)
                          try { const { data: roster } = await api.get(`/api/trainings/${editingTraining.id}/attendance`); setRosters(prev => ({ ...prev, [editingTraining.id]: roster })); } catch(e){}
                          try { const { data: rate } = await api.get(`/api/trainings/${editingTraining.id}/attendance/rate`); setPresenceRates(prev => ({ ...prev, [editingTraining.id]: rate?.presenceRate || 0 })); } catch(e){}
                        } catch(e) { showSnackbar('Bulk absent failed') }
                        finally { setBulkLoadingByTraining(prev => ({ ...prev, [editingTraining.id]: false })) }
                      }}>All absent</Button>
                      {bulkLoadingByTraining[editingTraining.id] && (
                        <CircularProgress size={18} sx={{ ml: 1 }} />
                      )}
                    </Stack>
                  </Stack>
                  {/* Roster table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Athlete</th>
                          <th style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Group</th>
                          <th style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Present</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rosters[editingTraining.id]||[])
                          .filter(a => {
                            // apply name/group text filter
                            const f = (attendanceFilterByTraining[editingTraining.id]||'').trim().toLowerCase(); if (f) {
                              const name = `${a.firstName||''} ${a.lastName||''}`.toLowerCase();
                              const group = (a.groupName||'').toLowerCase();
                              if (!(name.includes(f) || group.includes(f))) return false;
                            }
                            // apply group filter (bulk group acts as filter for display too)
                            const gFilter = bulkGroupByTraining[editingTraining.id];
                            if (gFilter && String(a.groupId) !== String(gFilter)) return false;
                            return true;
                          })
                          .map(a => (
                          <tr key={a.userId}>
                            <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{a.lastName} {a.firstName}</td>
                            <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{a.groupName || '-'}</td>
                            <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>
                              <Button size="small" variant={a.present ? 'contained' : 'outlined'} color={a.present ? 'success' : 'primary'} onClick={async()=>{
                                try {
                                  await api.post(`/api/trainings/${editingTraining.id}/attendance`, { userId: a.userId, present: !a.present })
                                  // optimistic update roster row
                                  setRosters(prev => ({ ...prev, [editingTraining.id]: (prev[editingTraining.id]||[]).map(r => r.userId===a.userId ? { ...r, present: !a.present } : r) }))
                                  // refresh rate quietly
                                  try { const { data: rate } = await api.get(`/api/trainings/${editingTraining.id}/attendance/rate`); setPresenceRates(prev => ({ ...prev, [editingTraining.id]: rate?.presenceRate || 0 })); } catch(e){}
                                } catch(err) { showSnackbar('Failed to toggle presence') }
                              }}>{a.present ? 'Present' : 'Mark present'}</Button>
                            </td>
                          </tr>
                        ))}
                        {(!rosters[editingTraining.id] || rosters[editingTraining.id].length===0) && (
                          <tr><td colSpan={3} style={{ padding:'6px 8px' }}>No athletes found for the training groups</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* show questionnaire responses (trainer-only) */}
            {editingTraining && questionnaireResponses[editingTraining.id] && (
              <Card variant="outlined">
                <CardHeader title="Questionnaire responses" subheader="Pre and post training submissions" />
                <CardContent>
                  <Stack spacing={1}>
                    <div>
                      <Typography variant="subtitle3">Pre-training</Typography>
                      {(questionnaireResponses[editingTraining.id].pre || []).length === 0 ? <Typography variant="body2">None</Typography> : (
                        <ul>
                              {questionnaireResponses[editingTraining.id].pre.map(r => (
                            <li key={r.id}>
                              {r.user.firstName} {r.user.lastName} — {formatIsoDateTime(r.submittedAt)}
                              <Button size="small" onClick={()=>{ setSelectedResponse({ ...r, questionnaireId: r.questionnaireId }); setSelectedResponseOpen(true) }} sx={{ ml:1 }}>View</Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <Typography variant="subtitle3">Post-training</Typography>
                      {(questionnaireResponses[editingTraining.id].post || []).length === 0 ? <Typography variant="body2">None</Typography> : (
                        <ul>
                              {questionnaireResponses[editingTraining.id].post.map(r => (
                            <li key={r.id}>
                              {r.user.firstName} {r.user.lastName} — {formatIsoDateTime(r.submittedAt)}
                              <Button size="small" onClick={()=>{ setSelectedResponse({ ...r, questionnaireId: r.questionnaireId }); setSelectedResponseOpen(true) }} sx={{ ml:1 }}>View</Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Aggregations removed: dedicated analytics page handles this now */}
            {/* show questionnaire responses (trainer-only) */}
            {/* Note: legacy inline responses block removed; see Card above */}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setOpen(false); setEditingTraining(null); }}>Cancel</Button>
          {editingTraining && <Button color="error" onClick={async ()=>{ if (!confirm('Delete training?')) return; await remove(editingTraining.id); setOpen(false); setEditingTraining(null); }}>Delete</Button>}
          <Button variant="contained" onClick={save}>{editingTraining ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={selectedResponseOpen} onClose={()=>{ setSelectedResponseOpen(false); setSelectedResponse(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>Response — {selectedResponse ? `${selectedResponse.user.firstName} ${selectedResponse.user.lastName}` : ''}</DialogTitle>
        <DialogContent>
          {selectedResponse ? (
            // try to render via QuestionnaireForm if we can find the questionnaire structure
            (() => {
              const q = questionnaires.find(q=>q.id === selectedResponse.questionnaireId)
              if (q && q.structure) {
                // parse selectedResponse.responses (could be object already)
                const vals = typeof selectedResponse.responses === 'string' ? JSON.parse(selectedResponse.responses) : selectedResponse.responses
                return <QuestionnaireForm structure={q.structure} values={vals} onChange={()=>{}} />
              }
              return <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify(selectedResponse.responses, null, 2)}</pre>
            })()
          ) : null}
        </DialogContent>
        <DialogActions><Button onClick={()=>{ setSelectedResponseOpen(false); setSelectedResponse(null) }}>Close</Button></DialogActions>
      </Dialog>
    </Paper>
  )
}
