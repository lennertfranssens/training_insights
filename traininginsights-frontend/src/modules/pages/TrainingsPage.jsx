import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useSnackbar } from '../common/SnackbarProvider'
import { useAuth } from '../auth/AuthContext'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material'
import QuestionnaireForm from '../common/QuestionnaireForm'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import TrainingsListCalendar from '../common/TrainingsListCalendar'
export default function TrainingsPage(){
  const [trainings, setTrainings] = useState([])
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
  const [aggregations, setAggregations] = useState({}) // keyed by training id -> averages map
  const [aggregationPhaseFilter, setAggregationPhaseFilter] = useState('ALL') // 'ALL' | 'PRE' | 'POST' | 'DEFAULT'
  const [selectedResponse, setSelectedResponse] = useState(null)
  const [selectedResponseOpen, setSelectedResponseOpen] = useState(false)
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
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e,v)=>{
            if (!v) return
            setViewMode(v)
            try { window.localStorage.setItem('trainings.viewMode', v) } catch(e){ /* ignore */ }
          }}>
            <ToggleButton value="list">List</ToggleButton>
            <ToggleButton value="calendar">Calendar</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" onClick={()=>setOpen(true)}>Create</Button>
        </Stack>
      </Stack>
          <TrainingsListCalendar
        trainings={trainings}
        viewMode={viewMode}
        onViewModeChange={(v)=>{ setViewMode(v); try{ window.localStorage.setItem('trainings.viewMode', v) }catch(e){} }}
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
              // load training-level aggregations (numeric averages)
              try { const { data: ag } = await api.get(`/api/trainings/${t.id}/aggregations`); setAggregations(prev => ({ ...prev, [t.id]: ag.averages || ag })); } catch(e) { /* ignore */ }
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
        renderItemContent={(t)=> (
          <>
            <Typography>{t.title}</Typography>
            <Typography variant="body2">{new Date(t.trainingTime).toLocaleString()}</Typography>
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
            <Button variant="outlined" onClick={async () => {
              setEditingTraining(t);
              const { data: at } = await api.get(`/api/trainings/${t.id}/attachments`)
              setAttachments(prev => ({ ...prev, [t.id]: at }))
              // load questionnaire responses and aggregations for edit view
              try { const { data: qr } = await api.get(`/api/trainings/${t.id}/questionnaire-responses`); setQuestionnaireResponses(prev => ({ ...prev, [t.id]: qr })); } catch(e) { /* ignore */ }
              try { const { data: ag } = await api.get(`/api/trainings/${t.id}/aggregations`); setAggregations(prev => ({ ...prev, [t.id]: ag.averages || ag })); } catch(e) { /* ignore */ }
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
      <Dialog open={open} onClose={()=>{ setOpen(false); setEditingTraining(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTraining ? 'Edit Training' : 'Create Training'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
            <TextField label="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} multiline rows={3} />
            <TextField type="datetime-local" label="Training start" InputLabelProps={{ shrink:true }} value={form.trainingTime} onChange={e=>{
              const newStart = e.target.value
              // if start cleared, clear end; if end is before new start, clear end too
              let newEnd = form.trainingEndTime
              try {
                if (!newStart) newEnd = ''
                else if (newEnd && (new Date(newEnd) <= new Date(newStart))) newEnd = ''
              } catch(err){ newEnd = '' }
              setForm({...form, trainingTime: newStart, trainingEndTime: newEnd})
            }} />
            <TextField
              type="datetime-local"
              label="Training end"
              InputLabelProps={{ shrink:true }}
              value={form.trainingEndTime||''}
              onChange={e=>setForm({...form, trainingEndTime:e.target.value})}
              disabled={!form.trainingTime}
              sx={{ opacity: form.trainingTime ? 1 : 0.6 }}
              InputProps={{ inputProps: { min: form.trainingTime || undefined } }}
            />
            {!form.trainingTime && <Typography variant="body2" color="text.secondary">Enter a start time first to set an end time</Typography>}
            {timeError && <Typography color="error" variant="body2">{timeError}</Typography>}
            <TextField select label="Groups" value={form.groupIds} onChange={e=>setForm({...form, groupIds:e.target.value})} SelectProps={{ multiple:true }}>
              {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </TextField>
            <TextField select label="Visible to athletes" value={form.visibleToAthletes ? 'yes' : 'no'} onChange={e=>setForm({...form, visibleToAthletes: e.target.value === 'yes'})} sx={{ width:160 }}>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <TextField select label="Pre-questionnaire" value={form.preQuestionnaireId||''} onChange={e=>setForm({...form, preQuestionnaireId:e.target.value||null})}>
              <MenuItem value="">None</MenuItem>
              {questionnaires.map(q => (
                <MenuItem key={q.id} value={q.id} disabled={form.postQuestionnaireId && String(form.postQuestionnaireId) === String(q.id)}>{q.title}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Post-questionnaire" value={form.postQuestionnaireId||''} onChange={e=>setForm({...form, postQuestionnaireId:e.target.value||null})}>
              <MenuItem value="">None</MenuItem>
              {questionnaires.map(q => (
                <MenuItem key={q.id} value={q.id} disabled={form.preQuestionnaireId && String(form.preQuestionnaireId) === String(q.id)}>{q.title}</MenuItem>
              ))}
            </TextField>
            <TextField label="Notify minutes before" type="number" value={form.preNotificationMinutes||0} onChange={e=>setForm({...form, preNotificationMinutes: Number(e.target.value)})} />
            <div>
              {/* prettier file upload using MUI */}
              <input
                accept="*"
                style={{ display: 'none' }}
                id="training-attachment-input"
                type="file"
                onChange={e=>setFileToUpload(e.target.files?.[0]||null)}
              />
              <label htmlFor="training-attachment-input">
                <Button component="span" size="small" variant="outlined">
                  {fileToUpload ? 'Change file' : 'Choose file'}
                </Button>
              </label>
              <span style={{ marginLeft: 12, verticalAlign: 'middle' }}>
                {fileToUpload ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{fileToUpload.name}</strong>
                    <Button size="small" color="error" onClick={()=>setFileToUpload(null)}>Remove</Button>
                  </span>
                ) : (
                  <span style={{ color: 'rgba(0,0,0,0.6)' }}>No file selected (optional)</span>
                )}
              </span>
            </div>
            {/* show existing attachments when editing */}
            {editingTraining && attachments[editingTraining.id] && (
              <div>
                <Typography variant="subtitle2">Existing attachments</Typography>
                <ul>
                  {attachments[editingTraining.id].map(a => (
                    <li key={a.id}>
                      <a href="#" onClick={e => { e.preventDefault(); openAttachment(a.id, a.filename) }}>{a.filename}</a>
                      <Button size="small" color="error" onClick={async ()=>{ await api.delete(`/api/trainings/attachments/${a.id}`); const { data: at } = await api.get(`/api/trainings/${editingTraining.id}/attachments`); setAttachments(prev => ({ ...prev, [editingTraining.id]: at })) }}>Delete</Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* show training-level aggregations (trainer-only) */}
            {editingTraining && aggregations[editingTraining.id] && (
              <div>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mt:2 }}>
                  <Typography variant="subtitle2">Aggregations (numeric averages)</Typography>
                  <ToggleButtonGroup size="small" value={aggregationPhaseFilter} exclusive onChange={(e, v) => { if (!v) return; setAggregationPhaseFilter(v) }} sx={{ ml:1 }}>
                    <ToggleButton value="ALL">All</ToggleButton>
                    <ToggleButton value="PRE">Pre</ToggleButton>
                    <ToggleButton value="POST">Post</ToggleButton>
                    <ToggleButton value="DEFAULT">Default</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                {Object.keys(aggregations[editingTraining.id] || {}).length === 0 ? (
                  <Typography variant="body2">None</Typography>
                ) : (
                  Object.entries(aggregations[editingTraining.id]).filter(([key]) => {
                    if (!aggregationPhaseFilter || aggregationPhaseFilter === 'ALL') return true
                    const parts = key.split('::')
                    const phase = parts[1] || 'DEFAULT'
                    return String(phase).toUpperCase() === String(aggregationPhaseFilter).toUpperCase()
                  }).map(([key, fieldMap]) => {
                    const parts = key.split('::')
                    const qid = parts[0]
                    const phase = parts[1] || 'DEFAULT'
                    const q = questionnaires.find(q => String(q.id) === String(qid))
                    return (
                      <div key={key} style={{ marginTop: 8 }}>
                        <Typography variant="subtitle3">{q ? q.title : `Questionnaire ${qid}`} — {phase}</Typography>
                        <ul>
                          {Object.entries(fieldMap).map(([f, v]) => (
                            <li key={f}>{f}: {typeof v === 'number' ? Number(v).toFixed(2) : String(v)}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  })
                )}
              </div>
            )}
            {/* show questionnaire responses (trainer-only) */}
            {editingTraining && questionnaireResponses[editingTraining.id] && (
              <div>
                <Typography variant="subtitle2">Questionnaire responses</Typography>
                <Stack spacing={1} sx={{ mt:1 }}>
                  <div>
                    <Typography variant="subtitle3">Pre-training</Typography>
                    {(questionnaireResponses[editingTraining.id].pre || []).length === 0 ? <Typography variant="body2">None</Typography> : (
                      <ul>
                        {questionnaireResponses[editingTraining.id].pre.map(r => (
                          <li key={r.id}>
                            {r.user.firstName} {r.user.lastName} — {new Date(r.submittedAt).toLocaleString()}
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
                            {r.user.firstName} {r.user.lastName} — {new Date(r.submittedAt).toLocaleString()}
                            <Button size="small" onClick={()=>{ setSelectedResponse({ ...r, questionnaireId: r.questionnaireId }); setSelectedResponseOpen(true) }} sx={{ ml:1 }}>View</Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Stack>
              </div>
            )}
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
