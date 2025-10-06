import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, MenuItem, Button, Backdrop, CircularProgress, LinearProgress, Alert } from '@mui/material'
import { useAttachmentManager } from '../notifications/hooks/useAttachmentManager'
import { useNotificationSend } from '../notifications/hooks/useNotificationSend'
import AttachmentPicker from '../notifications/components/AttachmentPicker'
import { useSnackbar } from '../common/SnackbarProvider'
import { useAuth } from '../auth/AuthContext'

export default function TrainerCreateNotificationPage(){
  const [clubs, setClubs] = useState([])
  const [selectedClubs, setSelectedClubs] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState('notification') // added channel state
  const { auth } = useAuth()

  useEffect(()=>{
    // load clubs but restrict to trainer's clubs (fallback: server may already filter)
    (async ()=>{
      try{
        const [{data:allClubs}, {data:me}, {data:allGroups}] = await Promise.all([api.get('/api/clubs'), api.get('/api/users/me'), api.get('/api/groups')])
        const allowed = (me?.clubIds || auth?.clubIds || [])
        const filtered = (allClubs || []).filter(c => allowed.includes(c.id))
        setClubs(filtered)
        // filter groups to those that belong to trainer's clubs and where trainer is listed
        const trainerGroups = (allGroups || []).filter(g => (g.trainerIds || []).includes(me?.id)).filter(g => (g.clubIds || []).some(cid => allowed.includes(cid)))
        setGroups(trainerGroups)
      }catch(e){
        // fallback to empty
        try{ const {data:allClubs} = await api.get('/api/clubs'); setClubs(allClubs || []) }catch(err){}
      }
    })()
  }, [])

  useEffect(()=>{
    try{
      const raw = sessionStorage.getItem('preselectedNotificationClubs')
      if (raw){
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length>0) setSelectedClubs(arr.filter(id => clubs.some(c=>c.id===id)))
        sessionStorage.removeItem('preselectedNotificationClubs')
      }
    }catch(e){}
  }, [clubs])

  const { showSnackbar } = useSnackbar()
  const buildSummaryMessage = (results, mode) => {
    try {
      const total = results.length
      const emailAttempted = results.filter(r=>r.emailAttempted).length
      const emailSent = results.filter(r=>r.emailSent).length
      const pushDispatched = results.filter(r=>r.dispatched).length
      const errors = results.filter(r=>r.error)
      let msg = `Sent to ${total} user${total!==1?'s':''}`
      if (mode !== 'notification') {
        msg += ` | email attempted: ${emailAttempted}`
        msg += `, email sent: ${emailSent}`
      }
      msg += ` | push dispatch: ${pushDispatched}`
      if (errors.length) msg += ` | errors: ${errors.length}`
      return msg
    } catch(e){ return 'Notifications dispatched' }
  }
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const cancelDisabled = progress.total > 0 && (progress.completed / progress.total) >= 0.95
  const [retryContext, setRetryContext] = useState(null)
  const attachments = useAttachmentManager()
  const { send: sendNotifications, buildSummary, cancel } = useNotificationSend()

  // attachments managed by hook
  const send = async () => {
    if (!title || !body) return showSnackbar('Provide title and body')
    try{
      setSending(true)
      const realGroups = (selectedGroups || []).filter(g => g !== -1)
      const usingGroups = realGroups.length > 0
      if (!usingGroups && (!selectedClubs || selectedClubs.length===0)) return showSnackbar('Select at least one club or group')
      const ids = usingGroups ? realGroups : selectedClubs
      const mode = usingGroups ? 'groups' : 'clubs'
      setProgress({ completed: 0, total: ids.length })
      const { results, error, cancelled, partial, completedTargets, totalTargets, remainingTargets, failedTargets, targetErrors } = await sendNotifications({ mode, ids, title, body, channel, attachments: attachments.files, onProgress: ({ completed, total }) => setProgress({ completed, total }) })
      if (cancelled) { 
        if (partial) {
          showSnackbar(`Send cancelled after ${completedTargets}/${totalTargets} targets`) 
          setRetryContext({ mode, remainingIds: remainingTargets, failedTargets, targetErrors, lastPayload: { title, body, channel } })
        } else {
          showSnackbar('Send cancelled')
        }
        return 
      }
      if (error){
        showSnackbar('Send failed: ' + error)
        if (remainingTargets && remainingTargets.length){
          setRetryContext({ mode, remainingIds: remainingTargets, failedTargets, targetErrors, lastPayload: { title, body, channel } })
        }
        return
      }
      showSnackbar(buildSummary(results, channel))
      // Clear fields & attachments after success
      setTitle('')
      setBody('')
      attachments.reset()
      setRetryContext(null)
    }catch(e){ showSnackbar('Send failed: ' + (e.response?.data?.message || e.message || e)) }
    finally { setSending(false); setProgress({ completed: 0, total: 0 }) }
  }

  const retryRemaining = async () => {
    if (!retryContext) return
    const { mode, remainingIds, lastPayload } = retryContext
    if (!remainingIds || remainingIds.length === 0) return
    try {
      setSending(true)
      setProgress({ completed: 0, total: remainingIds.length })
      const { results, error, cancelled, partial, completedTargets, totalTargets, remainingTargets } = await sendNotifications({ mode, ids: remainingIds, title: lastPayload.title, body: lastPayload.body, channel: lastPayload.channel, attachments: attachments.files, onProgress: ({ completed, total }) => setProgress({ completed, total }) })
      if (cancelled){
        showSnackbar(partial ? `Retry cancelled after ${completedTargets}/${totalTargets}` : 'Retry cancelled')
        return
      }
      if (error){
        showSnackbar('Retry failed: ' + error)
        return
      }
      showSnackbar(buildSummary(results, lastPayload.channel))
      if (!remainingTargets || remainingTargets.length === 0){
        setRetryContext(null)
      }
    } catch(e){ showSnackbar('Retry failed: ' + (e.message || e)) }
    finally { setSending(false); setProgress({ completed: 0, total: 0 }) }
  }

  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:2 }}>Create Notification</Typography>
      <Stack spacing={2}>
        {retryContext && (
          <Alert severity="warning" action={<Button color="inherit" size="small" onClick={retryRemaining}>Retry Remaining</Button>}>
            Partial send pending. {retryContext.remainingIds?.length || 0} target(s) remaining. {retryContext.failedTargets?.length ? `${retryContext.failedTargets.length} failed previously.`:''}
          </Alert>
        )}
        {/* Clubs: disabled when actual groups selected (groups override clubs) */}
        <TextField
          select
          label="Clubs"
          SelectProps={{ multiple: true, value: selectedClubs }}
          value={selectedClubs}
          onChange={e=> setSelectedClubs(Array.isArray(e.target.value)?e.target.value:[e.target.value])}
          disabled={selectedGroups && selectedGroups.filter(g => g !== -1).length > 0}
        >
          {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>

        {/* Groups: selecting real groups disables club selector; selecting NONE (-1) means send to full club(s) */}
        <TextField
          select
          label="Groups (optional)"
          SelectProps={{ multiple: true, value: selectedGroups }}
          value={selectedGroups}
          onChange={e=>{
            const raw = Array.isArray(e.target.value) ? e.target.value : [e.target.value]
            const v = raw.map(x => Number(x))
            if (v.includes(-1)) {
              setSelectedGroups([-1])
            } else {
              setSelectedGroups(v.filter(x => x !== -1))
            }
          }}
        >
          <MenuItem key={-1} value={-1}>
            &lt;NONE&gt; (send to full club)
          </MenuItem>
          {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>

        <TextField label="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <TextField label="Body" value={body} onChange={e=>setBody(e.target.value)} multiline minRows={3} />
        <TextField select label="Channel" value={channel} onChange={e=>setChannel(e.target.value)} helperText="Choose delivery channel">
          <MenuItem value="notification">In-app only</MenuItem>
          <MenuItem value="email">Email only</MenuItem>
          <MenuItem value="both">In-app + Email</MenuItem>
        </TextField>
        <AttachmentPicker
          files={attachments.files}
          errors={attachments.errors}
          maxMb={attachments.maxMb}
          percent={attachments.percent}
          totalBytes={attachments.totalBytes}
          onAdd={attachments.addFiles}
          onRemove={attachments.removeFile}
          disabled={sending}
        />
        <div>
          <Button variant="contained" onClick={send} disabled={sending}>Send</Button>
        </div>
      </Stack>
      <Backdrop open={sending} sx={{ color:'#fff', zIndex:(theme)=>theme.zIndex.modal + 1 }}>
        <Stack alignItems="center" spacing={2} sx={{ minWidth: 240 }}>
          <CircularProgress color="inherit" size={48} />
          {progress.total > 0 && (
            <LinearProgress variant="determinate" value={Math.min(100, (progress.completed / progress.total) * 100)} sx={{ width: '100%' }} />
          )}
          <Typography variant="caption">
            {progress.total > 0 ? `Sending... (${progress.completed} / ${progress.total})` : 'Sending...'}
          </Typography>
          <Button size="small" variant="outlined" color="inherit" onClick={cancel} disabled={cancelDisabled}>Cancel</Button>
        </Stack>
      </Backdrop>
    </Paper>
  )
}
