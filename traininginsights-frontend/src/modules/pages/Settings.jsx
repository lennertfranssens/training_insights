import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Paper, Typography, Stack, TextField, Button, List, ListItem, ListItemText, Box, Avatar } from '@mui/material'
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import TabletMacIcon from '@mui/icons-material/TabletMac'
import BrowserUpdatedIcon from '@mui/icons-material/BrowserUpdated'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'

// Very small, tolerant UA parser to extract device type, browser and OS information for display
function parseUserAgent(ua){
  if (!ua) return { type: 'unknown', browser: '', os: '', host: '' }
  const s = ua.toLowerCase()
  let type = 'desktop'
  if (s.includes('mobile') && !s.includes('ipad')) type = 'mobile'
  if (s.includes('tablet') || s.includes('ipad')) type = 'tablet'

  let browser = ''
  if (s.includes('chrome') && !s.includes('edg') && !s.includes('opr')) browser = 'Chrome'
  else if (s.includes('firefox')) browser = 'Firefox'
  else if (s.includes('safari') && !s.includes('chrome')) browser = 'Safari'
  else if (s.includes('edg') || s.includes('edge')) browser = 'Edge'
  else if (s.includes('opr') || s.includes('opera')) browser = 'Opera'

  let os = ''
  if (s.includes('windows')) os = 'Windows'
  else if (s.includes('macintosh') || s.includes('mac os')) os = 'macOS'
  else if (s.includes('android')) os = 'Android'
  else if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) os = 'iOS'
  else if (s.includes('linux')) os = 'Linux'

  // host: sometimes endpoints contain the push service host; fall back to the endpoint if needed
  let host = ''
  try {
    const m = ua.match(/https?:\/\/([\w.-]+)/)
    if (m && m[1]) host = m[1]
  } catch(e){}

  return { type, browser, os, host }
}
import { useSnackbar } from '../common/SnackbarProvider'

export default function Settings(){
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', address:'', password:'', dailyReminderTime: '' })
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ (async ()=>{ try { const { data } = await api.get('/api/users/me'); setForm({ firstName: data.firstName||'', lastName: data.lastName||'', email: data.email||'', phone: data.phone||'', address: data.address||'', dailyReminderTime: data.dailyReminderTime||'', password: '' }); } catch(e){} finally { setLoading(false) } })() }, [])

  const save = async () => {
    if (form.password && form.password.length > 0 && form.password.length < 6) { showSnackbar('Password must be at least 6 characters'); return }
    const payload = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, address: form.address, password: form.password || null, dailyReminderTime: form.dailyReminderTime };
    await api.put('/api/users/me', payload);
    showSnackbar('Settings saved')
    setForm({...form, password: ''});
  }

  // Push subscription helpers
  const [subscriptions, setSubscriptions] = useState([])
  const loadSubscriptions = async () => { try { const { data } = await api.get('/api/push/my'); setSubscriptions(data || []) } catch(e) { setSubscriptions([]) } }

  async function urlBase64ToUint8Array(base64String) {
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

  const { showSnackbar } = useSnackbar()

  const enablePush = async () => {
    // iOS requires installing to Home Screen and only shows permission there (iOS 16.4+)
    const ua = navigator.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isIOS && !isStandalone) {
      showSnackbar('On iOS, first Add to Home Screen, then open the app and enable notifications there.', { duration: 8000 })
      return
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { showSnackbar('Push not supported in this browser', { duration: 5000 }); return }
    if (!window.isSecureContext) { showSnackbar('Push requires HTTPS. Please use a secure (https://) URL.', { duration: 8000 }); return }
    try{
      // Request permission first to keep it within the user gesture on Safari
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') { showSnackbar('Push permission not granted', { duration: 6000 }); return }
      }
      const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      // Ensure activated SW (Safari sometimes needs this before subscribe)
      await navigator.serviceWorker.ready
      const { data: vapid } = await api.get('/api/push/vapid-public')
      const converted = await urlBase64ToUint8Array(vapid)
      // Reuse existing sub if present to avoid quota/duplicate issues
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: converted })
      await api.post('/api/push/subscribe', { endpoint: sub.endpoint, keys: { p256dh: arrayBufferToBase64(sub.getKey('p256dh')), auth: arrayBufferToBase64(sub.getKey('auth')) } })
      showSnackbar('Push enabled')
      await loadSubscriptions()
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

  const unsubscribe = async (id) => {
    try{ await api.post(`/api/push/unsubscribe/${id}`); await loadSubscriptions(); showSnackbar('Unsubscribed') } catch(e){ showSnackbar('Failed to unsubscribe', { duration: 5000 }) }
  }

  useEffect(()=>{ loadSubscriptions() }, [])

  if (loading) return <Typography>Loading...</Typography>

  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6">Settings</Typography>
      <Stack spacing={2} sx={{ mt:2 }}>
        <TextField label="First name" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} />
        <TextField label="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} />
        <TextField label="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
        <TextField label="Phone" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
        <TextField label="Address" value={form.address} onChange={e=>setForm({...form, address: e.target.value})} />
  <TextField type="password" label="New password (leave empty to keep)" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} helperText={form.password && form.password.length>0 ? (form.password.length<6? 'Minimum 6 characters' : 'OK') : ' '} error={!!form.password && form.password.length>0 && form.password.length<6} />
        <TextField type="time" label="Daily reminder time" InputLabelProps={{ shrink: true }} value={form.dailyReminderTime || ''} onChange={e=>setForm({...form, dailyReminderTime: e.target.value})} />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={save}>Save</Button>
        </Stack>
        <div>
          <Typography variant="subtitle1" sx={{ mt:2 }}>Browser push notifications</Typography>
          <div style={{ marginTop:8, marginBottom:8 }}>
            <Button variant="outlined" onClick={enablePush} sx={{ mr:1 }}>Enable notifications</Button>
            <Button variant="outlined" onClick={async ()=>{ try { const { data } = await api.post('/api/push/test'); showSnackbar(`Test push sent to ${data.sent||0}/${data.subscriptions||0} subscriptions`, { duration: 6000 }); await loadSubscriptions(); } catch(e){ showSnackbar('Failed to send test push', { duration: 6000 }) } }} sx={{ mr:1 }}>Send test notification</Button>
            <Button variant="outlined" onClick={loadSubscriptions}>Refresh subscriptions</Button>
          </div>
          {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
            <div style={{ marginTop: 8, padding: 12, background: '#fff4e5', border: '1px solid #ffe0b2' }}>
              <strong>Notifications are blocked</strong>
              <div style={{ marginTop:6 }}>Your browser is blocking notifications for this site. To re-enable notifications, open your browser site settings and allow notifications for this domain, then click "Enable notifications" here.</div>
              <div style={{ marginTop:8 }}>
                Helpful links: <a href="https://support.google.com/chrome/answer/3220216" target="_blank" rel="noreferrer">Chrome</a> · <a href="https://support.mozilla.org/en-US/kb/push-notifications-firefox" target="_blank" rel="noreferrer">Firefox</a> · <a href="https://support.apple.com/guide/safari/manage-website-settings-ibrw8b71a36b/mac" target="_blank" rel="noreferrer">Safari</a>
              </div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            {subscriptions.length === 0 ? <div>No subscriptions</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subscriptions.map(s => {
                  const info = parseUserAgent(s.userAgent || '')
                  const Icon = info.type === 'mobile' ? PhoneIphoneIcon : info.type === 'tablet' ? TabletMacIcon : info.type === 'desktop' ? DesktopWindowsIcon : DevicesOtherIcon
                  return (
                    <Box key={s.id} sx={{ border: '1px solid #eee', p:1.5, borderRadius:1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <Box sx={{ display:'flex', alignItems:'center', gap:2, minWidth:0 }}>
                        <Avatar sx={{ bgcolor: '#f5f5f5', color: '#444' }}><Icon /></Avatar>
                        <Box sx={{ minWidth:0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.browser || 'Browser' } — {info.os || ''}</div>
                          <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.host || (s.endpoint || '')}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop:4 }}>{s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}</div>
                        </Box>
                      </Box>
                      <div>
                        <Button size="small" onClick={()=>unsubscribe(s.id)}>Unsubscribe</Button>
                      </div>
                    </Box>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Stack>
    </Paper>
  )
}
