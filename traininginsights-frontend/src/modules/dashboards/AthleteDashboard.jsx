import React, { useEffect, useState } from 'react'
import { formatIsoDateTime, formatIsoDate } from '../common/dateUtils'
import api from '../api/client'
import { Paper, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Box, Tabs, Tab, Pagination } from '@mui/material'
import { useSnackbar } from '../common/SnackbarProvider'
import QuestionnaireForm from '../common/QuestionnaireForm'
import TrainingsListCalendar from '../common/TrainingsListCalendar'
import UnreadBadge from '../common/UnreadBadge'
import NotificationsInbox from '../pages/NotificationsInbox'
import GroupColorLegend from '../common/GroupColorLegend'
export default function AthleteDashboard({ initialSection }){
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
  // pagination for pending questionnaires
  const [pendingPage, setPendingPage] = useState(1)
  const [presenceSaving, setPresenceSaving] = useState(false)
  const [presenceStatus, setPresenceStatus] = useState(null) // { present: bool, updatedAt }
  const [presenceMap, setPresenceMap] = useState({}) // trainingId -> { present, updatedAt }
  // read persisted view mode (matches TrainingsPage)
  const storedView = typeof window !== 'undefined' ? window.localStorage.getItem('trainings.viewMode') : null
  const [viewMode, setViewMode] = useState(storedView || 'calendar')
  // allow athletes to switch between upcoming-only and all trainings (including past)
  const storedRange = typeof window !== 'undefined' ? window.localStorage.getItem('trainings.range') : null
  const [trainingRange, setTrainingRange] = useState(storedRange || 'all') // 'upcoming' | 'all'
  const sectionToTab = (s) => {
    if (!s) return 0
    const key = String(s).toLowerCase()
    if (key === 'questionnaires') return 1
    if (key === 'notifications') return 2
    return 0
  }
  const [tab, setTab] = useState(sectionToTab(initialSection))
  React.useEffect(()=>{ setTab(sectionToTab(initialSection)) }, [initialSection])
  React.useEffect(()=>{
    const handler = (e) => {
      const s = e?.detail?.section
      if (!s) return
      if (s === 'trainings') setTab(0)
      if (s === 'questionnaires') setTab(1)
      if (s === 'notifications') setTab(2)
    }
    window.addEventListener('navigate-dashboard', handler)
    return () => window.removeEventListener('navigate-dashboard', handler)
  },[])
  const load = async () => {
    const trainingsReq = trainingRange === 'all' ? api.get('/api/athlete/trainings/all') : api.get('/api/athlete/trainings/upcoming')
    const [t, p, q, f] = await Promise.all([ trainingsReq, api.get('/api/athlete/questionnaires/pending'), api.get('/api/questionnaires'), api.get('/api/athlete/questionnaires/filled') ])
    const qList = q.data || []
    setTrainings(t.data); setPending(p.data); setAllQuestionnaires(qList); setFilled(f.data || [])
    const firstDaily = qList.find(x => x.daily)
    setDailyQId(firstDaily ? firstDaily.id : '')
    // Fetch presence for each training (could be optimized later with backend batch endpoint)
    try {
      const presEntries = await Promise.all((t.data||[]).map(async tr => {
        try { const { data } = await api.get(`/api/athlete/trainings/${tr.id}/presence`); return [tr.id, { present: data.present, updatedAt: data.updatedAt }] } catch(e){ return [tr.id, null] }
      }))
      const map = {}
      presEntries.forEach(([id,val])=>{ if(val) map[id]=val })
      setPresenceMap(map)
    } catch(e){}
  }
  useEffect(()=>{ load() }, [trainingRange])
  // keep current page within bounds when pending list changes
  useEffect(()=>{
    const total = Math.max(1, Math.ceil(((pending||[]).length)/10))
    if (pendingPage > total) setPendingPage(total)
  }, [pending])
  const { showSnackbar } = useSnackbar()

  // One-click enable push for athletes (don't auto-subscribe on page load)
  const enablePush = async () => {
    const ua = navigator.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isIOS && !isStandalone) { showSnackbar('On iOS, first Add to Home Screen, then open the app and enable notifications there.', { duration: 8000 }); return }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { showSnackbar('Push not supported in this browser', { duration: 5000 }); return }
    if (!window.isSecureContext) { showSnackbar('Push requires HTTPS. Please use a secure (https://) URL.', { duration: 8000 }); return }
    try{
      // Ask for permission first within the gesture
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') { showSnackbar('Push permission not granted', { duration: 6000 }); return }
      }
      const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const { data: vapid } = await api.get('/api/push/vapid-public')
      const converted = await urlBase64ToUint8Array(vapid)
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: converted })
      await api.post('/api/push/subscribe', { endpoint: sub.endpoint, keys: { p256dh: arrayBufferToBase64(sub.getKey('p256dh')), auth: arrayBufferToBase64(sub.getKey('auth')) } })
      showSnackbar('Push enabled')
    } catch(e){
      console.error(e)
      const msg = e?.message || ''
      if (msg.includes('NotAllowedError')) {
        showSnackbar('Notifications are blocked. On iOS, check Settings > Notifications > TrainingInsights.', { duration: 9000 })
      } else if (msg.includes('AbortError') || msg.includes('NotSupportedError')) {
        showSnackbar('Push not available. Ensure PWA is opened from Home Screen (iOS 16.4+).', { duration: 9000 })
      } else {
        showSnackbar('Failed to enable push: ' + (e?.response?.data?.message || msg || e), { duration: 8000 })
      }
    }
  }

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
  const openQuestionnaire = async (trainingId, questionnaireId, phase = null) => {
    const q = allQuestionnaires.find(x => x.id === questionnaireId); if (!q) return
    // try to prefill values if an existing submission exists (for daily or previous submissions)
    let values = {}
    // Prefer DAILY phase for training-less (daily) check-ins; otherwise fallback to any training-less response for that questionnaire
    let existing = null
    if (trainingId) {
      existing = filled.find(r => r.questionnaire?.id === questionnaireId && r.training && String(r.training.id) === String(trainingId))
    } else {
      const candidates = filled.filter(r => r.questionnaire?.id === questionnaireId && !r.training)
      existing = candidates.find(r => (r.phase === 'DAILY' || r.type === 'DAILY')) || candidates[0]
    }
    if (existing && existing.responses){
      try { values = JSON.parse(existing.responses) } catch (e) { values = {} }
    }
    setQStructure(q.structure); setQValues(values); setQContext({ trainingId, questionnaireId, phase }); setQOpen(true)
  }
  const submit = async () => {
    await api.post('/api/athlete/questionnaires/submit', { trainingId: qContext.trainingId, questionnaireId: qContext.questionnaireId, responses: JSON.stringify(qValues), phase: qContext.phase || 'DEFAULT' })
    setQOpen(false); await load()
  }
  const dailySubmit = async () => {
    if (!dailyQId) return
    await api.post('/api/athlete/questionnaires/submit', { trainingId: null, questionnaireId: dailyQId, responses: JSON.stringify(qValues), phase: 'DAILY' })
    setQOpen(false); await load()
  }
  return (
    <Box>
      <Paper sx={{ p:1, mb:2 }}>
        <div style={{ marginTop: 0 }}>
          <Button size="small" variant="outlined" onClick={enablePush}>Enable notifications</Button>
        </div>
      </Paper>

      <Box hidden={tab !== 0}>
        <Paper sx={{ p:2, mb:2 }}>
          <Typography variant="h6" sx={{ mb:1 }}>Trainings</Typography>
          <Box sx={{ display:'flex', alignItems:'center', borderBottom: 1, borderColor: 'divider', mb:2 }}>
            <Tabs value={viewMode} onChange={(e,v)=>{ if (v){ setViewMode(v); try{ window.localStorage.setItem('trainings.viewMode', v) } catch(e){} } }} sx={{ minHeight: 'auto' }} TabIndicatorProps={{ sx: { height: 2 }}}>
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
            // Pass a Boolean myPresence (calendar/list stripe logic expects true/false/undefined)
            // presenceMap stores objects { present, updatedAt }; extract the boolean
            trainings={trainings.map(tr => ({ ...tr, myPresence: presenceMap[tr.id]?.present }))}
            filledResponses={filled}
            viewMode={viewMode}
            onViewModeChange={(v)=>{ setViewMode(v); try{ window.localStorage.setItem('trainings.viewMode', v) }catch(e){} }}
            autoScrollTodayInList={trainingRange === 'all'}
            initialDate={(() => {
              // When showing all trainings, jump calendar to the most recent past training if available,
              // otherwise to the next upcoming training, else today.
              if (viewMode !== 'calendar') return undefined
              const list = trainings || []
              if (!list.length) return undefined
              try{
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
              } catch(e) {}
              return undefined
            })()}
            onEventClick={async (id, t)=>{
              try {
                if (!t) t = trainings.find(x=>String(x.id) === String(id))
                const { data: vt } = await api.get(`/api/athlete/trainings/${t.id}/view`)
                setViewTraining(vt)
                // presence info returned as vt.myPresence
                if (vt.myPresence) setPresenceStatus({ present: !!vt.myPresence.present, updatedAt: vt.myPresence.updatedAt })
                else setPresenceStatus(null)
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
                <Typography variant="body2">{formatIsoDateTime(t.trainingTime)}</Typography>
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
                  if (vt.myPresence) setPresenceStatus({ present: !!vt.myPresence.present, updatedAt: vt.myPresence.updatedAt })
                  else setPresenceStatus(null)
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
          {viewMode === 'calendar' && (
            <GroupColorLegend
              groups={(()=>{
                const seen = new Map()
                ;(trainings||[]).forEach(t => (t.groups||[]).forEach(g => { if (g && g.id != null && !seen.has(g.id)) seen.set(g.id, g) }))
                return Array.from(seen.values())
              })()}
            />
          )}
        </Paper>
      </Box>

      <Box hidden={tab !== 1}>
        {/* Daily Check-in first */}
        <Paper sx={{ p:2, mb:2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:1 }}>
            <Typography variant="h6">Daily Check-in</Typography>
            <Button size="small" onClick={()=>setHistoryOpen(true)}>History</Button>
          </Stack>
          {(() => {
            const dailyList = (allQuestionnaires || []).filter(q => !!q.daily)
            if (!dailyList.length) return <Typography variant="body2" color="text.secondary">No daily questionnaires available. Ask your trainer to enable a daily questionnaire.</Typography>
            return (
              <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
                <TextField select label="Questionnaire" value={dailyQId} onChange={e=>setDailyQId(e.target.value)} sx={{ minWidth: 240 }}>
                  {dailyList.map(q => <MenuItem key={q.id} value={q.id}>{q.title}</MenuItem>)}
                </TextField>
                <Button variant="contained" disabled={!dailyQId} onClick={()=>{ if (dailyQId) openQuestionnaire(null, dailyQId, 'DAILY') }}>Open</Button>
              </Stack>
            )
          })()}
        </Paper>
        {/* Pending Questionnaires with pagination */}
        <Paper sx={{ p:2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb:2 }}>
            <Typography variant="h6">Pending Questionnaires</Typography>
            {pending && pending.length > 10 && (
              <Pagination count={Math.max(1, Math.ceil(pending.length/10))} page={pendingPage} onChange={(e,v)=>setPendingPage(v)} size="small" />
            )}
          </Stack>
          {(() => {
            if (!pending || pending.length === 0) return <Typography variant="body2">No pending questionnaires</Typography>
            // Enrich with training title/time for ordering
            const enriched = (pending||[]).map(item => {
              const t = trainings.find(x=>String(x.id)===String(item.trainingId))
              const time = t?.trainingTime ? new Date(t.trainingTime).getTime() : 0
              return {
                ...item,
                trainingTime: time,
                trainingTitle: t ? t.title : `Training ${item.trainingId}`,
                trainingDateStr: t?.trainingTime ? formatIsoDateTime(t.trainingTime) : ''
              }
            }).sort((a,b)=> a.trainingTime - b.trainingTime)
            const total = Math.max(1, Math.ceil(enriched.length/10))
            const page = Math.min(pendingPage, total)
            const slice = enriched.slice((page-1)*10, (page-1)*10 + 10)
            return (
              <Stack spacing={1}>
                {slice.map(item => (
                  <Paper key={`${item.trainingId}-${item.questionnaireId}-${item.type}`} sx={{ p:1.5, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <Box sx={{ minWidth:0 }}>
                      <Typography variant="subtitle2" noWrap>{item.trainingTitle}{item.trainingDateStr ? ` — ${item.trainingDateStr}` : ''}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{item.type} — {allQuestionnaires.find(q=>q.id===item.questionnaireId)?.title || `Q ${item.questionnaireId}`}</Typography>
                    </Box>
                    <Button size="small" variant="contained" onClick={()=>openQuestionnaire(item.trainingId, item.questionnaireId, item.type)}>Fill</Button>
                  </Paper>
                ))}
                {enriched.length > 10 && (
                  <Box sx={{ display:'flex', justifyContent:'flex-end', mt:1 }}>
                    <Pagination count={total} page={page} onChange={(e,v)=>setPendingPage(v)} size="small" />
                  </Box>
                )}
              </Stack>
            )
          })()}
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
                const d = r.submittedAt ? formatIsoDate(r.submittedAt) : 'Unknown'
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
                        <Typography variant="body2">Submitted at: {r.submittedAt ? formatIsoDateTime(r.submittedAt) : '—'}</Typography>
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
                <Typography variant="body2">{formatIsoDateTime(viewTraining.trainingTime)}{viewTraining.trainingEndTime ? ` — ${formatIsoDateTime(viewTraining.trainingEndTime)}` : ''}</Typography>
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
                          <Button size="small" onClick={()=>openQuestionnaire(viewTraining.id, viewTraining.preQuestionnaire.id, 'PRE')}>Open</Button>
                        </div>
                        {(trainingResponses.pre||[]).length === 0 ? <Typography variant="body2">No pre-training response</Typography> : trainingResponses.pre.map(r => (
                          <div key={r.id} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">Submitted at: {formatIsoDateTime(r.submittedAt)}</Typography>
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
                          <Button size="small" onClick={()=>openQuestionnaire(viewTraining.id, viewTraining.postQuestionnaire.id, 'POST')}>Open</Button>
                        </div>
                        {(trainingResponses.post||[]).length === 0 ? <Typography variant="body2">No post-training response</Typography> : trainingResponses.post.map(r => (
                          <div key={r.id} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">Submitted at: {formatIsoDateTime(r.submittedAt)}</Typography>
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
              {/* Presence toggle */}
              <div>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt:1 }}>My Presence</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt:0.5 }}>
                  <Button size="small" variant={presenceStatus?.present ? 'contained' : 'outlined'} color={presenceStatus?.present ? 'success' : 'primary'} disabled={presenceSaving} onClick={async ()=>{
                    if (!viewTraining) return; setPresenceSaving(true)
                    try { const { data } = await api.post(`/api/athlete/trainings/${viewTraining.id}/presence`, { present: true }); setPresenceStatus({ present: true, updatedAt: data.updatedAt }); showSnackbar('Marked present') } catch(e){ showSnackbar('Failed: ' + (e?.response?.data?.message || e.message)) } finally { setPresenceSaving(false) }
                  }}>Present</Button>
                  <Button size="small" variant={presenceStatus && !presenceStatus.present ? 'contained' : 'outlined'} color={presenceStatus && !presenceStatus.present ? 'warning' : 'primary'} disabled={presenceSaving} onClick={async ()=>{
                    if (!viewTraining) return; setPresenceSaving(true)
                    try { const { data } = await api.post(`/api/athlete/trainings/${viewTraining.id}/presence`, { present: false }); setPresenceStatus({ present: false, updatedAt: data.updatedAt }); showSnackbar('Marked absent') } catch(e){ showSnackbar('Failed: ' + (e?.response?.data?.message || e.message)) } finally { setPresenceSaving(false) }
                  }}>Absent</Button>
                  {presenceStatus && (
                    <Typography variant="caption" color="text.secondary">Updated: {presenceStatus.updatedAt ? formatIsoDateTime(presenceStatus.updatedAt) : ''}</Typography>
                  )}
                </Stack>
              </div>
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
