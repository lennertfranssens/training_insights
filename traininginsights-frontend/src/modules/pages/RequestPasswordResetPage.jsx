import React, { useState } from 'react'
import api from '../api/client'
import { Container, Paper, Typography, TextField, Button, Stack, Alert, Link } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function RequestPasswordResetPage(){
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('')
    if (!email) { setErr('Email required'); return }
    try { await api.post('/api/auth/password-reset/request', { email }); setMsg('If the email exists, a reset link was sent.') } catch { setErr('Request failed') }
  }
  return (
    <Container maxWidth="sm" sx={{ mt:6 }}>
      <Paper sx={{ p:4 }}>
        <Typography variant="h5" gutterBottom>Request Password Reset</Typography>
        {err && <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>}
        {msg && <Alert severity="info" sx={{ mb:2 }}>{msg}</Alert>}
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField label="Email" value={email} onChange={e=>setEmail(e.target.value)} fullWidth />
            <Button type="submit" variant="contained">Send reset link</Button>
            <Link component={RouterLink} to="/login" underline="hover" sx={{ fontSize:14, textAlign:'center' }}>Back to login</Link>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
