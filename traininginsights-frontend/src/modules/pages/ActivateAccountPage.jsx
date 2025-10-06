import React, { useState, useEffect } from 'react'
import api from '../api/client'
import { Container, Paper, Typography, TextField, Button, Stack, Alert } from '@mui/material'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function ActivateAccountPage(){
  const [sp] = useSearchParams()
  const tokenFromUrl = sp.get('token') || ''
  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const navigate = useNavigate()
  useEffect(()=>{ setToken(tokenFromUrl) }, [tokenFromUrl])
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('')
    if (!token || !password) { setErr('Token and password required'); return }
    if (password !== confirm) { setErr('Passwords do not match'); return }
    try {
      await api.post('/api/auth/activate', { token, password })
      setMsg('Account activated. You can now sign in. Redirecting...')
      setTimeout(()=> navigate('/login'), 1500)
    } catch(e){ setErr('Activation failed (token invalid or expired)') }
  }
  return (
    <Container maxWidth="sm" sx={{ mt:6 }}>
      <Paper sx={{ p:4 }}>
        <Typography variant="h5" gutterBottom>Activate Account</Typography>
        {err && <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>}
        {msg && <Alert severity="success" sx={{ mb:2 }}>{msg}</Alert>}
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField label="Token" value={token} onChange={e=>setToken(e.target.value)} fullWidth />
            <TextField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} fullWidth />
            <TextField label="Confirm Password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} fullWidth />
            <Button type="submit" variant="contained">Activate</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
