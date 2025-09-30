import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, ToggleButton, ToggleButtonGroup, Chip, Tabs, Tab, Box } from '@mui/material'
import QuestionnaireForm from '../common/QuestionnaireForm'
import TrainingsListCalendar from '../common/TrainingsListCalendar'
import UnreadBadge from '../common/UnreadBadge'
import NotificationsInbox from '../pages/NotificationsInbox'
export default function AthleteDashboard(){
  const [trainings, setTrainings] = useState([])
  const [pending, setPending] = useState([])
  const [qOpen, setQOpen] = useState(false)
  const [qStructure, setQStructure] = useState(null)
  const [qValues, setQValues] = useState({})
  const [qContext, setQContext] = useState({ trainingId: null, questionnaireId: null })
  const [allQuestionnaires, setAllQuestionnaires] = useState([])
  const [dailyQId, setDailyQId] = useState('')
  const [filled, setFilled] = useState([])
  const [viewTraining, setViewTraining] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [trainingResponses, setTrainingResponses] = useState({ pre: [], post: [] })
  const [responseViewOpen, setResponseViewOpen] = useState(false)
  const [responseViewStructure, setResponseViewStructure] = useState(null)
  const [responseViewValues, setResponseViewValues] = useState({})
  const [historyOpen, setHistoryOpen] = useState(false)
  const [attachments, setAttachments] = useState({})
  // read persisted view mode (matches TrainingsPage)
  const storedView = typeof window !== 'undefined' ? window.localStorage.getItem('trainings.viewMode') : null
  const [viewMode, setViewMode] = useState(storedView || 'calendar')
  const [tab, setTab] = useState(0)
  const load = async () => {
    const [t, p, q, f] = await Promise.all([ api.get('/api/athlete/trainings/upcoming'), api.get('/api/athlete/questionnaires/pending'), api.get('/api/questionnaires'), api.get('/api/athlete/questionnaires/filled') ])
    setTrainings(t.data); setPending(p.data); setAllQuestionnaires(q.data || []); setFilled(f.data || []); if (q.data?.[0]) setDailyQId(q.data[0].id)
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{
    // register service worker and subscribe for push notifications
    (async ()=>{
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
        try {
        const reg = await navigator.serviceWorker.register('/service-worker.js')
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        // get vapid public
        const { data: vapid } = await api.get('/api/push/vapid-public')
        const converted = urlBase64ToUint8Array(vapid)
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: converted })
        await api.post('/api/push/subscribe', { endpoint: sub.endpoint, keys: { p256dh: arrayBufferToBase64(sub.getKey('p256dh')), auth: arrayBufferToBase64(sub.getKey('auth')) } })
      } catch (e){ /* push subscribe failed (silent) */ }
    })()
  }, [])

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function arrayBufferToBase64(buffer){
    if (!buffer) return ''
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i=0;i<bytes.byteLength;i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  const openQuestionnaire = async (trainingId, questionnaireId) => {
    const q = allQuestionnaires.find(x => x.id === questionnaireId); if (!q) return
    // try to prefill values if an existing submission exists (for daily or previous submissions)
    let values = {}
    const existing = filled.find(r => r.questionnaire?.id === questionnaireId && (trainingId ? r.training?.id === trainingId : !r.training))
    if (existing && existing.responses){
      try { values = JSON.parse(existing.responses) } catch (e) { values = {} }
    }
    setQStructure(q.structure); setQValues(values); setQContext({ trainingId, questionnaireId }); setQOpen(true)
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
    <Box>
      <Paper sx={{ p:1, mb:2 }}>
        <Tabs value={tab} onChange={(e,v)=>setTab(v)}>
          <Tab label="Trainings" />
          <Tab label="Questionnaires" />
          <Tab label={<span style={{ display: 'flex', alignItems: 'center', gap:8 }}><span>Notifications</span><UnreadBadge /></span>} />
        </Tabs>
      </Paper>

      <Box hidden={tab !== 0}>
        <Paper sx={{ p:2, mb:2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Typography variant="h6">Upcoming Trainings</Typography>
            </div>
            <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e,v)=>{
              if (!v) return
              setViewMode(v)
              try { window.localStorage.setItem('trainings.viewMode', v) } catch(e){}
            }}>
              <ToggleButton value="list">List</ToggleButton>
              <ToggleButton value="calendar">Calendar</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <TrainingsListCalendar
            trainings={trainings}
            filledResponses={filled}
            viewMode={viewMode}
            onViewModeChange={(v)=>{ setViewMode(v); try{ window.localStorage.setItem('trainings.viewMode', v) }catch(e){} }}
            onEventClick={async (id, t)=>{
              try {
                if (!t) t = trainings.find(x=>String(x.id) === String(id))
                const { data: vt } = await api.get(`/api/athlete/trainings/${t.id}/view`)
                setViewTraining(vt)
                // compute athlete's own responses for this training from `filled` (always available to athletes)
                const pre = (filled||[]).filter(r => r.training && String(r.training.id) === String(t.id) && r.questionnaire && vt.preQuestionnaire && r.questionnaire.id === vt.preQuestionnaire.id)
                const post = (filled||[]).filter(r => r.training && String(r.training.id) === String(t.id) && r.questionnaire && vt.postQuestionnaire && r.questionnaire.id === vt.postQuestionnaire.id)
                setTrainingResponses({ pre, post })
                if (vt.visibleToAthletes) {
                  const { data: at } = await api.get(`/api/trainings/${t.id}/attachments`)
                  setAttachments(prev => ({ ...prev, [t.id]: at }))
                }
                setViewOpen(true)
              } catch (err) { /* unable to open training for athlete (silent) */ }
            }}
            renderItemContent={(t) => (
              <>
                <Typography>{t.title}</Typography>
                <Typography variant="body2">{new Date(t.trainingTime).toLocaleString()}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
                  {(t.groups||[]).map(g => <Chip key={g.id} label={g.name} size="small" />)}
                </Stack>
              </>
            )}
            renderActions={(t)=> (
              <Button variant="contained" onClick={async ()=>{
                try {
                  const { data: vt } = await api.get(`/api/athlete/trainings/${t.id}/view`)
                  setViewTraining(vt)
                  // compute athlete's own responses for this training from `filled` (available even when not visible)
                  const pre = (filled||[]).filter(r => r.training && String(r.training.id) === String(t.id) && r.questionnaire && vt.preQuestionnaire && r.questionnaire.id === vt.preQuestionnaire.id)
                  const post = (filled||[]).filter(r => r.training && String(r.training.id) === String(t.id) && r.questionnaire && vt.postQuestionnaire && r.questionnaire.id === vt.postQuestionnaire.id)
                  setTrainingResponses({ pre, post })
                  if (vt.visibleToAthletes) {
                    const { data: at } = await api.get(`/api/trainings/${t.id}/attachments`)
                    setAttachments(prev => ({ ...prev, [t.id]: at }))
                  }
                  setViewOpen(true)
                } catch (err) { /* unable to open training for athlete (silent) */ }
              }}>View</Button>
            )}
          />
        </Paper>
      </Box>

      <Box hidden={tab !== 1}>
        <Paper sx={{ p:2, mb:2 }}>
          <Typography variant="h6" sx={{ mb:2 }}>Pending Questionnaires</Typography>
          <Stack spacing={1}>
            {(pending||[]).map(item => {
              const t = trainings.find(x => x.id === item.trainingId)
              const title = t ? t.title : `#${item.trainingId}`
              const date = t ? new Date(t.trainingTime).toLocaleString() : null
              return (
                <Paper key={`${item.trainingId}-${item.questionnaireId}-${item.type}`} sx={{ p:2, display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <Typography>{title}{date ? ` — ${date}` : ''} — {item.type}</Typography>
                    <Typography variant="body2">Q: {allQuestionnaires.find(q=>q.id===item.questionnaireId)?.title || `ID ${item.questionnaireId}`}</Typography>
                  </div>
                  <Button variant="contained" onClick={()=>openQuestionnaire(item.trainingId, item.questionnaireId)}>Fill</Button>
                </Paper>
              )
            })}
          </Stack>
        </Paper>
        <Paper sx={{ p:2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:1 }}>
            <Typography variant="h6">Daily Check-in</Typography>
            <Button size="small" onClick={()=>setHistoryOpen(true)}>History</Button>
          </Stack>
          <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
            <TextField select label="Questionnaire" value={dailyQId} onChange={e=>setDailyQId(e.target.value)} sx={{ minWidth: 240 }}>
              {allQuestionnaires.map(q => <MenuItem key={q.id} value={q.id}>{q.title}</MenuItem>)}
            </TextField>
            <Button variant="contained" onClick={()=>{ const q=allQuestionnaires.find(x=>x.id===dailyQId); if (q){ setQStructure(q.structure); setQValues({}); setQContext({ trainingId: null, questionnaireId: dailyQId }); setQOpen(true) }}}>Open</Button>
          </Stack>
        </Paper>
      </Box>

      <Box hidden={tab !== 2}>
        <NotificationsInbox />
      </Box>
      <Dialog open={historyOpen} onClose={()=>setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Questionnaire History</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt:1 }}>
            {(() => {
              const byDate = {}
              ;(filled||[]).forEach(r => {
                const d = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : 'Unknown'
                if (!byDate[d]) byDate[d] = []
                byDate[d].push(r)
              })
              return Object.keys(byDate).sort((a,b)=> new Date(b) - new Date(a)).map(date => (
                <div key={date}>
                  <Typography variant="subtitle1">{date}</Typography>
                  {(byDate[date]||[]).map(r => (
                    <Paper key={r.id} sx={{ p:1, display:'flex', justifyContent:'space-between', alignItems:'center', mt:1 }}>
                      <div>
                        <Typography>{allQuestionnaires.find(q=>q.id===r.questionnaire?.id)?.title || `Q ${r.questionnaire?.id}`}</Typography>
                        <Typography variant="body2">Submitted at: {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}</Typography>
                      </div>
                      <div>
                        <Button size="small" onClick={()=>{ const q = allQuestionnaires.find(qt => qt.id === r.questionnaire?.id); setResponseViewStructure(q?.structure); try{ setResponseViewValues(typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses) }catch(e){ setResponseViewValues({}) } setResponseViewOpen(true) }}>View</Button>
                      </div>
                    </Paper>
                  ))}
                </div>
              ))
            })()}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={()=>setHistoryOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={qOpen} onClose={()=>setQOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Questionnaire</DialogTitle>
        <DialogContent><QuestionnaireForm structure={qStructure} values={qValues} onChange={setQValues} /></DialogContent>
        <DialogActions><Button onClick={()=>setQOpen(false)}>Cancel</Button><Button variant="contained" onClick={qContext.trainingId ? submit : dailySubmit}>Submit</Button></DialogActions>
      </Dialog>
      <Dialog open={viewOpen} onClose={()=>{ setViewOpen(false); setViewTraining(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>Training</DialogTitle>
        <DialogContent>
          {viewTraining && (
            <Stack spacing={2} sx={{ mt:1 }}>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography variant="h6">{viewTraining.title}</Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt:1 }}>Start / End</Typography>
                <Typography variant="body2">{new Date(viewTraining.trainingTime).toLocaleString()}{viewTraining.trainingEndTime ? ` — ${new Date(viewTraining.trainingEndTime).toLocaleString()}` : ''}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
                {(viewTraining.groups||[]).map(g => <Chip key={g.id} label={g.name} size="small" />)}
              </Stack>
              {/* description & attachments only shown when visibleToAthletes is true */}
              {viewTraining.visibleToAthletes && (
                <>
                  {viewTraining.description && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                      <Typography>{viewTraining.description}</Typography>
                    </>
                  )}
                  {attachments[viewTraining.id] && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">Attachments</Typography>
                      <ul>
                        {attachments[viewTraining.id].map(a => (
                          <li key={a.id}><a href="#" onClick={e => { e.preventDefault(); (async ()=>{ const resp = await api.get(`/api/trainings/attachments/${a.id}`, { responseType: 'blob' }); const url = window.URL.createObjectURL(resp.data); const aa = document.createElement('a'); aa.href = url; aa.download = a.filename || 'attachment'; document.body.appendChild(aa); aa.click(); aa.remove(); setTimeout(()=>window.URL.revokeObjectURL(url),10000) })() }}>{a.filename}</a></li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
              {/* always show questionnaires (pre/post) if set; athletes can view previous responses and open the questionnaire to fill */}
              {(viewTraining.preQuestionnaire || viewTraining.postQuestionnaire) ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary">Questionnaires</Typography>
                  <div>
                    <Typography variant="subtitle2">Pre</Typography>
                    {viewTraining.preQuestionnaire ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Typography variant="body2">{viewTraining.preQuestionnaire.title || `Q ${viewTraining.preQuestionnaire.id}`}</Typography>
                          <Button size="small" onClick={()=>openQuestionnaire(viewTraining.id, viewTraining.preQuestionnaire.id)}>Open</Button>
                        </div>
                        {(trainingResponses.pre||[]).length === 0 ? <Typography variant="body2">No pre-training response</Typography> : trainingResponses.pre.map(r => (
                          <div key={r.id} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">Submitted at: {new Date(r.submittedAt).toLocaleString()}</Typography>
                              <Button size="small" onClick={()=>{ try { const q = allQuestionnaires.find(qt => qt.id === r.questionnaire?.id); setResponseViewStructure(q?.structure); try{ setResponseViewValues(typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses) }catch(e){ setResponseViewValues({}) } setResponseViewOpen(true) } catch(e){} }}>View</Button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : <Typography variant="body2">No pre-questionnaire</Typography>}
                  </div>
                  <div>
                    <Typography variant="subtitle2">Post</Typography>
                    {viewTraining.postQuestionnaire ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Typography variant="body2">{viewTraining.postQuestionnaire.title || `Q ${viewTraining.postQuestionnaire.id}`}</Typography>
                          <Button size="small" onClick={()=>openQuestionnaire(viewTraining.id, viewTraining.postQuestionnaire.id)}>Open</Button>
                        </div>
                        {(trainingResponses.post||[]).length === 0 ? <Typography variant="body2">No post-training response</Typography> : trainingResponses.post.map(r => (
                          <div key={r.id} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">Submitted at: {new Date(r.submittedAt).toLocaleString()}</Typography>
                              <Button size="small" onClick={()=>{ try { const q = allQuestionnaires.find(qt => qt.id === r.questionnaire?.id); setResponseViewStructure(q?.structure); try{ setResponseViewValues(typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses) }catch(e){ setResponseViewValues({}) } setResponseViewOpen(true) } catch(e){} }}>View</Button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : <Typography variant="body2">No post-questionnaire</Typography>}
                  </div>
                </>
              ) : (
                // no questionnaires; if training not visible, show not-available message
                !viewTraining.visibleToAthletes ? <Typography variant="body2" color="text.secondary">This training is not available for athletes — only basic info is shown.</Typography> : null
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setViewOpen(false); setViewTraining(null) }}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={responseViewOpen} onClose={()=>setResponseViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Response</DialogTitle>
        <DialogContent>
          <QuestionnaireForm structure={responseViewStructure} values={responseViewValues} onChange={()=>{}} />
        </DialogContent>
        <DialogActions><Button onClick={()=>setResponseViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
