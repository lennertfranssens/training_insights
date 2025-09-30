import React, {useState} from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Snackbar } from '@mui/material'
import api from '../api/client'

export default function ComposeNotification({open, onClose, sendUrl, onSend}){
  const [form, setForm] = useState({title:'', body:''})
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState({ open:false, msg:'' })

  async function send(){
    setSaving(true)
    try{ await api.post(sendUrl, { title: form.title, body: form.body }) ; onClose(); }
    catch(e){ alert('Send failed'); }
    finally{ setSaving(false) }
  }

  async function sendWithSnack(){
    setSaving(true)
    try{
      let results = null
      if (onSend){
        results = await onSend({ title: form.title, body: form.body })
      } else {
        await api.post(sendUrl, { title: form.title, body: form.body })
      }
      // If backend returned send results, show summary
      if (results && Array.isArray(results)){
        const successCount = results.filter(r => !r.error).length
        const failCount = results.length - successCount
        setSnack({ open:true, msg:`Sent: ${successCount}, Failed: ${failCount}` })
        console.info('Notification send results', results)
      } else {
        setSnack({ open:true, msg:'Sent' })
      }
      window.dispatchEvent(new Event('notifications-updated'))
      onClose()
    }catch(e){ setSnack({ open:true, msg:'Send failed' }) }
    finally{ setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Compose notification</DialogTitle>
      <DialogContent>
        <TextField label="Title" fullWidth value={form.title} onChange={e=>setForm({...form, title:e.target.value})} sx={{mb:2}} />
        <TextField label="Body" fullWidth multiline rows={6} value={form.body} onChange={e=>setForm({...form, body:e.target.value})} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={sendWithSnack} disabled={saving}>Send</Button>
      </DialogActions>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack({open:false,msg:''})} message={snack.msg} />
    </Dialog>
  )
}
