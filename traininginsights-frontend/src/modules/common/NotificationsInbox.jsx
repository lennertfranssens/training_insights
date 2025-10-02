import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Stack, Typography, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Button, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Pagination, Select, MenuItem, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread'

export default function NotificationsInbox(){
  const [notifications, setNotifications] = useState([])
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [active, setActive] = useState(null)
  const navigate = useNavigate()

  const load = async (p = page, size = pageSize) => {
    try {
      // try server-side pagination first
      const { data } = await api.get('/api/notifications', { params: { page: p - 1, size } })
      // if backend returns a page object (content/totalPages) use it
      if (data && data.content) {
        const content = data.content || []
        // sort unread first, then by createdAt desc
        content.sort((a,b)=>{
          const ar = !!(a.isRead || a.read); const br = !!(b.isRead || b.read)
          if (ar !== br) return ar ? 1 : -1
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return bt - at
        })
        setNotifications(content)
        setTotalPages(data.totalPages || 1)
      } else if (Array.isArray(data)) {
        // fallback: client-side paginate
        const arr = (data || []).slice().sort((a,b)=>{
          const ar = !!(a.isRead || a.read); const br = !!(b.isRead || b.read)
          if (ar !== br) return ar ? 1 : -1
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return bt - at
        })
        setTotalPages(Math.max(1, Math.ceil(arr.length / size)))
        const start = (p - 1) * size
        setNotifications(arr.slice(start, start + size))
      } else {
        setNotifications([]); setTotalPages(1)
      }
    } catch (e) { /* ignore */ }
  }

  useEffect(()=>{ load(); const handler = ()=> load(); window.addEventListener('notifications-updated', handler); const iv = setInterval(load, 15000); return ()=> { window.removeEventListener('notifications-updated', handler); clearInterval(iv) } }, [page, pageSize])

  const toggleRead = async (id, markRead) => {
    try {
      await api.post(`/api/notifications/${id}/${markRead ? 'read' : 'unread'}`)
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (e) { }
  }

  const openDetail = (n) => { setActive(n); setDetailOpen(true); if (!n.isRead) toggleRead(n.id, true) }

  return (
    <Paper sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
        <Typography variant="h6">Notifications</Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControlLabel control={<Switch checked={onlyUnread} onChange={(e)=>{ setOnlyUnread(e.target.checked); setPage(1); } } />} label="Only unread" />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Typography variant="body2">Per page</Typography>
            <Select value={pageSize} size="small" onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1) }}>
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
            </Select>
          </div>
        </Stack>
      </Stack>
      <List>
        {(notifications || [])
          .filter(n => !onlyUnread || !(n.isRead || n.read))
          // ensure displayed page keeps ordering: unread first, newest first
          .sort((a,b)=>{
            const ar = !!(a.isRead || a.read); const br = !!(b.isRead || b.read)
            if (ar !== br) return ar ? 1 : -1
            const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return bt - at
          })
          .map(n => {
            const read = !!(n.isRead || n.read)
            return (
              <ListItem key={n.id} divider button onClick={()=>openDetail(n)}>
                <ListItemText primary={n.title} secondary={n.body && n.body.length > 200 ? `${n.body.slice(0,200)}...` : n.body} />
                <div style={{ marginLeft: 12 }}>
                  <Chip label={read ? 'Read' : 'Unread'} size="small" color={read ? 'primary' : 'default'} variant={read ? 'filled' : 'outlined'} />
                </div>
                <ListItemSecondaryAction>
                  <IconButton onClick={()=>toggleRead(n.id, !read)} title={read ? 'Mark unread' : 'Mark read'}>
                    {read ? <MarkEmailReadIcon /> : <MarkEmailUnreadIcon />}
                  </IconButton>
                  {n.trainingId && (
                    <Button size="small" sx={{ ml: 1 }} onClick={(e)=>{ e.stopPropagation(); navigate('/dashboard/athlete/trainings') }}>View training</Button>
                  )}
                  {n.questionnaireId && (
                    <Button size="small" variant="contained" sx={{ ml: 1 }} onClick={(e)=>{ e.stopPropagation(); navigate('/dashboard/athlete/questionnaires') }}>Open questionnaire</Button>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            )
          })}
      </List>
      <Stack direction="row" justifyContent="center" sx={{ mt:2 }}>
        <Pagination count={totalPages} page={page} onChange={(e,v)=>setPage(v)} />
      </Stack>

      <Dialog open={detailOpen} onClose={()=>setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{active?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{active?.body}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display:'block', mt:2 }}>{active?.sentAt ? `Sent at: ${new Date(active.sentAt).toLocaleString()}` : ''}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
