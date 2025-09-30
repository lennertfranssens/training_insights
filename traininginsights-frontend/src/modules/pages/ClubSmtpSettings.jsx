import React, {useEffect, useState} from 'react';
import api from '../api/client';

export default function ClubSmtpSettings({clubId}){
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({smtpHost:'', smtpPort:'', smtpUsername:'', smtpPassword:'', smtpFrom:'', smtpUseTls:true});
  const [message, setMessage] = useState(null);

  useEffect(()=>{
    if (!clubId) return;
    setLoading(true);
    api.get(`/api/clubs/admin/${clubId}/smtp`).then(res => {
      setForm({
        smtpHost: res.data.smtpHost || '',
        smtpPort: res.data.smtpPort || '',
        smtpUsername: res.data.smtpUsername || '',
        smtpPassword: res.data.smtpPassword || '',
        smtpFrom: res.data.smtpFrom || '',
        smtpUseTls: res.data.smtpUseTls == null ? true : res.data.smtpUseTls,
      });
    }).catch(e => { setMessage('Failed to load'); }).finally(()=>setLoading(false));
  },[clubId]);

  function onChange(e){
    const {name, value, type, checked} = e.target;
    setForm(prev => ({...prev, [name]: type==='checkbox' ? checked : value}));
  }

  function onSave(){
    setMessage(null);
    const payload = {...form, smtpPort: form.smtpPort ? parseInt(form.smtpPort) : null};
    api.put(`/api/clubs/admin/${clubId}/smtp`, payload).then(()=> setMessage('Saved')).catch(()=> setMessage('Save failed'));
  }

  if (!clubId) return <div>Select a club to edit SMTP settings</div>;
  if (loading) return <div>Loading...</div>;
  return (
    <div style={{maxWidth:600}}>
      <h3>SMTP settings for club {clubId}</h3>
      <div>
        <label>SMTP Host</label>
        <input name="smtpHost" value={form.smtpHost} onChange={onChange} />
      </div>
      <div>
        <label>SMTP Port</label>
        <input name="smtpPort" value={form.smtpPort} onChange={onChange} />
      </div>
      <div>
        <label>SMTP Username</label>
        <input name="smtpUsername" value={form.smtpUsername} onChange={onChange} />
      </div>
      <div>
        <label>SMTP Password</label>
        <input type="password" name="smtpPassword" value={form.smtpPassword} onChange={onChange} />
      </div>
      <div>
        <label>From address</label>
        <input name="smtpFrom" value={form.smtpFrom} onChange={onChange} />
      </div>
      <div>
        <label>Use TLS</label>
        <input type="checkbox" name="smtpUseTls" checked={!!form.smtpUseTls} onChange={onChange} />
      </div>
      <div style={{marginTop:8}}>
        <button onClick={onSave}>Save</button>
        {message && <span style={{marginLeft:8}}>{message}</span>}
      </div>
    </div>
  )
}
