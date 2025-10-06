import React, {useEffect, useState} from 'react'
import { formatIsoDateTime } from '../common/dateUtils'
import api from '../api/client'
import { Button, ToggleButton, ToggleButtonGroup, Snackbar, Chip, Paper, Box, Tooltip, Link } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function NotificationsInbox(){
  const [list, setList] = useState([])
  const [filter, setFilter] = useState('all')
  const [snack, setSnack] = useState({open:false,msg:''})
  const navigate = useNavigate()
  useEffect(()=>{
    load();
    window.addEventListener('notifications-updated', load)
    const iv = setInterval(load, 15000)
    return ()=> { window.removeEventListener('notifications-updated', load); clearInterval(iv) }
  },[])
  const load = ()=> api.get('/api/notifications').then(r=> setList(r.data)).catch(()=>{})

  const [bulkLoading, setBulkLoading] = useState(false)

  const toggleRead = async (id, to) => {
    try{
      await api.post(`/api/notifications/${id}/${to ? 'read' : 'unread'}`)
      await load()
      window.dispatchEvent(new Event('notifications-updated'))
      setSnack({open:true,msg:'Updated'})
    } catch(e){ setSnack({open:true,msg:'Failed'}) }
  }

  const markAllRead = async () => {
    const unread = list.filter(n => !(n.isRead || n.read))
    if(unread.length === 0) return
    setBulkLoading(true)
    try {
      // Parallelize marking to minimize latency
      await Promise.all(unread.map(n => api.post(`/api/notifications/${n.id}/read`)))
      await load()
      window.dispatchEvent(new Event('notifications-updated'))
      setSnack({open:true,msg:`Marked ${unread.length} notification${unread.length>1?'s':''} as read`})
    } catch (e) {
      console.error(e)
      setSnack({open:true,msg:'Failed to mark all read'})
    } finally {
      setBulkLoading(false)
    }
  }

  // derive display list: unread first (newest->oldest), then read (newest->oldest)
  const sorted = [...list].sort((a,b)=>{
    const ar = !!(a.isRead || a.read); const br = !!(b.isRead || b.read)
    if (ar !== br) return ar ? 1 : -1 // unread first
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bt - at // newest first
  })
  const shown = sorted.filter(n => filter === 'all' ? true : !(n.isRead || n.read))

  const downloadAttachment = async (attachment) => {
    try {
      if (!attachment?.id) return
      const { data, headers } = await api.get(`/api/notifications/attachments/${attachment.id}`, { responseType: 'blob' })
      const blob = new Blob([data])
      let filename = attachment.filename || 'attachment'
      const dispo = headers['content-disposition'] || headers['Content-Disposition']
      if (dispo){
        const m = dispo.match(/filename="?([^";]+)"?/)
        if (m && m[1]) filename = m[1]
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch(e) {
      setSnack({ open:true, msg: 'Download failed' })
    }
  }

  return (
    <div>
      <h3>Notifications</h3>
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, alignItems:'center', mb:2 }}>
        <ToggleButtonGroup value={filter} exclusive onChange={(e,v)=>v && setFilter(v)}>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title="Reload notifications from server">
          <Button size="small" onClick={load}>Refresh</Button>
        </Tooltip>
        <Tooltip title="Mark all unread notifications as read">
          <span>
            <Button size="small" onClick={markAllRead} disabled={bulkLoading || !list.some(n=>!(n.isRead||n.read))}>{bulkLoading ? 'Working...' : 'Mark all read'}</Button>
          </span>
        </Tooltip>
      </Box>
      {shown.length===0 && <div>No notifications</div>}
      {shown.map(n=> {
        const read = !!(n.isRead || n.read)
        return (
          <Paper key={n.id} variant="outlined" sx={(theme)=>({
            p:1.2,
            mb:1,
            bgcolor: read ? theme.palette.action.hover : theme.palette.background.paper,
            borderColor: read ? theme.palette.divider : theme.palette.primary.main + (theme.palette.mode==='dark' ? 55 : 33),
            transition:'background-color 0.2s,border-color 0.2s'
          })}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:2, flexWrap:'wrap' }}>
              <Box sx={{ fontWeight:600, minWidth:0 }}>
                {n.title}
                {n.targetLabel && <Box component="span" sx={{ ml:1, fontSize:12, color:'text.secondary' }}>— {n.targetLabel}</Box>}
                {n.dispatched && <Box component="span" sx={{ ml:1, fontSize:11, color:'text.secondary' }}> sent {n.sentAt ? formatIsoDateTime(n.sentAt) : ''}</Box>}
              </Box>
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                <Box component="small" sx={{ color:'text.secondary' }}>{formatIsoDateTime(n.createdAt)}</Box>
                <Chip label={read ? 'Read' : 'Unread'} size="small" color={read ? 'primary' : 'default'} variant={read ? 'filled' : 'outlined'} />
              </Box>
            </Box>
            <Box sx={{ mt:0.75, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{n.body}</Box>
            {Array.isArray(n.attachments) && n.attachments.length > 0 && (
              <Box sx={{ mt:1, display:'flex', flexDirection:'column', gap:0.5 }}>
                {n.attachments.map(a => (
                  <Link key={a.id} underline="hover" href="#" onClick={(e)=>{ e.preventDefault(); downloadAttachment(a) }} sx={{ fontSize:12, display:'inline-flex', alignItems:'center', gap:0.5 }}>
                    📎 {a.filename}
                  </Link>
                ))}
              </Box>
            )}
            <Box sx={{ mt:1, display:'flex', gap:1, flexWrap:'wrap' }}>
              {n.trainingId && (
                <Button size="small" variant="outlined" onClick={()=> navigate('/dashboard/athlete/trainings')}>View training</Button>
              )}
              {n.questionnaireId && (
                <Button size="small" variant="contained" onClick={()=> navigate('/dashboard/athlete/questionnaires')}>Open questionnaire</Button>
              )}
              {read ? (
                <Button size="small" onClick={()=>toggleRead(n.id, false)}>Mark unread</Button>
              ) : (
                <Button size="small" onClick={()=>toggleRead(n.id, true)}>Mark read</Button>
              )}
            </Box>
          </Paper>
        )
      })}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack({open:false,msg:''})} message={snack.msg} />
    </div>
  )
}
