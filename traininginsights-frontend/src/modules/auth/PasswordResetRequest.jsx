import React, { useState } from 'react';
import api from '../api/client';

export default function PasswordResetRequest(){
  const [email,setEmail] = useState('');
  const [message,setMessage] = useState(null);

  function submit(e){
    e.preventDefault();
    setMessage(null);
    api.post('/api/auth/password-reset/start',{email}).then(()=>{
      setMessage('If an active account exists, an email was sent.');
    }).catch(()=> setMessage('Request failed (still, we pretend success).'));
  }

  return (
    <div style={{maxWidth:400, margin:'40px auto'}}>
      <h2>Reset Password</h2>
      <form onSubmit={submit}>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <button type="submit">Send Reset Email</button>
      </form>
      {message && <div style={{marginTop:10}}>{message}</div>}
    </div>
  );
}
