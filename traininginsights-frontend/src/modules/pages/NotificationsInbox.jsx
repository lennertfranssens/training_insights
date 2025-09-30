import React, {useEffect, useState} from 'react'
import api from '../api/client'
import { Button, ToggleButton, ToggleButtonGroup, Snackbar, Chip } from '@mui/material'

export default function NotificationsInbox(){
  const [list, setList] = useState([])
  const [filter, setFilter] = useState('all')
  const [snack, setSnack] = useState({open:false,msg:''})
  useEffect(()=>{ load() ; window.addEventListener('notifications-updated', load); return ()=> window.removeEventListener('notifications-updated', load) },[])
  const load = ()=> api.get('/api/notifications').then(r=> setList(r.data)).catch(()=>{})

  const toggleRead = async (id, to) => {
    try{
      await api.post(`/api/notifications/${id}/${to ? 'read' : 'unread'}`)
      await load()
      window.dispatchEvent(new Event('notifications-updated'))
      setSnack({open:true,msg:'Updated'})
    } catch(e){ setSnack({open:true,msg:'Failed'}) }
  }

  const shown = list.filter(n => filter === 'all' ? true : !(n.isRead || n.read))

  return (
    <div>
      <h3>Notifications</h3>
      <ToggleButtonGroup value={filter} exclusive onChange={(e,v)=>v && setFilter(v)} sx={{ mb:2 }}>
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="unread">Unread</ToggleButton>
      </ToggleButtonGroup>
      {shown.length===0 && <div>No notifications</div>}
      {shown.map(n=> (
        <div key={n.id} style={{border:'1px solid #ddd', padding:8, marginBottom:8, background: (n.isRead || n.read) ? '#fafafa':'#fff' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontWeight:600}}>{n.title}{n.dispatched && <span style={{marginLeft:8, fontSize:11, color:'#666'}}>  sent {n.sentAt ? new Date(n.sentAt).toLocaleString() : ''}</span>}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div><small>{new Date(n.createdAt).toLocaleString()}</small></div>
              <div>
                <Chip label={(n.isRead || n.read) ? 'Read' : 'Unread'} size="small" color={(n.isRead || n.read) ? 'primary' : 'default'} variant={(n.isRead || n.read) ? 'filled' : 'outlined'} />
              </div>
            </div>
          </div>
          <div style={{marginTop:6}}>{n.body}</div>
          <div style={{marginTop:8}}>
            {(() => {
              const read = !!(n.isRead || n.read)
              return read ? <Button size="small" onClick={()=>toggleRead(n.id, false)}>Mark unread</Button> : <Button size="small" onClick={()=>toggleRead(n.id, true)}>Mark read</Button>
            })()}
          </div>
        </div>
      ))}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack({open:false,msg:''})} message={snack.msg} />
    </div>
  )
}
