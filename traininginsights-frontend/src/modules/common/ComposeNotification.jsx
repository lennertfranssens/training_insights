import React, {useState} from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Typography, Backdrop, CircularProgress } from '@mui/material'
import { useSnackbar } from './SnackbarProvider'
import { useAttachmentManager } from '../notifications/hooks/useAttachmentManager'
import { useNotificationSend } from '../notifications/hooks/useNotificationSend'
import AttachmentPicker from '../notifications/components/AttachmentPicker'

export default function ComposeNotification({open, onClose, sendUrl, onSend}){
  const [form, setForm] = useState({title:'', body:''})
  const [saving, setSaving] = useState(false)
  const { showSnackbar } = useSnackbar()
  const attachments = useAttachmentManager()
  const { send: sendNotifications } = useNotificationSend()

  async function sendWithSnack(){
    setSaving(true)
    try{
      let results = null
      if (onSend && attachments.files.length === 0){
        // delegate custom send handler (non-attachment path)
        results = await onSend({ title: form.title, body: form.body })
      } else {
        // Use unified send hook in 'single' mode; results may be [] if backend doesn't return array
        const { results: hookResults, error } = await sendNotifications({ mode: 'single', singleUrl: sendUrl, title: form.title, body: form.body, channel: undefined, attachments: attachments.files })
        if (error) throw new Error(error)
        results = hookResults
      }
      if (Array.isArray(results) && results.length){
        const successCount = results.filter(r => !r.error).length
        const failCount = results.length - successCount
        showSnackbar(`Sent: ${successCount}, Failed: ${failCount}`)
      } else {
        showSnackbar('Sent')
      }
      // Clear fields after success
      setForm({ title:'', body:'' })
      attachments.reset()
      onClose()
    }catch(e){ showSnackbar('Send failed') }
    finally{ setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Compose notification</DialogTitle>
      <DialogContent>
        <TextField label="Title" fullWidth value={form.title} onChange={e=>setForm({...form, title:e.target.value})} sx={{mb:2}} />
        <TextField label="Body" fullWidth multiline rows={6} value={form.body} onChange={e=>setForm({...form, body:e.target.value})} />
        <AttachmentPicker
          files={attachments.files}
          errors={attachments.errors}
          maxMb={attachments.maxMb}
          percent={attachments.percent}
          totalBytes={attachments.totalBytes}
          onAdd={attachments.addFiles}
          onRemove={attachments.removeFile}
          disabled={saving}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={sendWithSnack} disabled={saving || !form.title || !form.body}>Send</Button>
      </DialogActions>
      <Backdrop open={saving} sx={{ color:'#fff', zIndex: (theme)=> theme.zIndex.modal + 1 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress color="inherit" size={48} />
          <Typography variant="caption" sx={{ letterSpacing:0.5 }}>Sending...</Typography>
        </Stack>
      </Backdrop>
  {/* global snackbar provided by SnackbarProvider */}
    </Dialog>
  )
}
