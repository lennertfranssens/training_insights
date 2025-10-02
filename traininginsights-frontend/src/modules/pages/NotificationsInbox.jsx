import React, {useEffect, useState} from 'react'
import api from '../api/client'
import { Button, ToggleButton, ToggleButtonGroup, Snackbar, Chip } from '@mui/material'
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

  const toggleRead = async (id, to) => {
    try{
      await api.post(`/api/notifications/${id}/${to ? 'read' : 'unread'}`)
      await load()
      window.dispatchEvent(new Event('notifications-updated'))
      setSnack({open:true,msg:'Updated'})
    } catch(e){ setSnack({open:true,msg:'Failed'}) }
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
            <div style={{fontWeight:600}}>
              {n.title}
              {n.targetLabel && <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>— {n.targetLabel}</span>}
              {n.dispatched && <span style={{marginLeft:8, fontSize:11, color:'#666'}}>   sent {n.sentAt ? new Date(n.sentAt).toLocaleString() : ''}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div><small>{new Date(n.createdAt).toLocaleString()}</small></div>
              <div>
                <Chip label={(n.isRead || n.read) ? 'Read' : 'Unread'} size="small" color={(n.isRead || n.read) ? 'primary' : 'default'} variant={(n.isRead || n.read) ? 'filled' : 'outlined'} />
              </div>
            </div>
          </div>
          <div style={{marginTop:6}}>{n.body}</div>
          <div style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
            {n.trainingId && (
              <Button size="small" variant="outlined" onClick={()=> navigate('/dashboard/athlete/trainings')}>View training</Button>
            )}
            {n.questionnaireId && (
              <Button size="small" variant="contained" onClick={()=> navigate('/dashboard/athlete/questionnaires')}>Open questionnaire</Button>
            )}
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
