import React, { useState } from 'react';
import api from '../api/client';

export default function PasswordResetComplete(){
  const [token,setToken] = useState('');
  const [password,setPassword] = useState('');
  const [confirm,setConfirm] = useState('');
  const [message,setMessage] = useState(null);
  const [error,setError] = useState(null);

  function submit(e){
    e.preventDefault();
    setMessage(null); setError(null);
    if (password !== confirm){ setError('Passwords do not match'); return; }
    api.post('/api/auth/password-reset/complete',{token,password}).then(()=>{
      setMessage('Password reset; you can log in.');
    }).catch(()=> setError('Reset failed'));
  }

  return (
    <div style={{maxWidth:400, margin:'40px auto'}}>
      <h2>Complete Password Reset</h2>
      <form onSubmit={submit}>
        <div>
          <label>Reset Token</label>
          <input value={token} onChange={e=>setToken(e.target.value)} required />
        </div>
        <div>
          <label>New Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Confirm Password</label>
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
        </div>
        <button type="submit">Reset Password</button>
      </form>
      {message && <div style={{color:'green', marginTop:10}}>{message}</div>}
      {error && <div style={{color:'red', marginTop:10}}>{error}</div>}
    </div>
  );
}
