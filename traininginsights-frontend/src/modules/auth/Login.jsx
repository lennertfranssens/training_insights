import React, { useState } from 'react'
import { Container, Paper, Typography, TextField, Button, Stack, Alert, Link } from '@mui/material'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useAuth } from './AuthContext'
export default function Login(){
  const { signin } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const onSubmit = async (e) => {
    e.preventDefault(); setError('')
    try { await signin(email, password); nav('/dashboard') } catch { setError('Invalid credentials') }
  }
  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 6 }}>
        <Typography variant="h5" gutterBottom>Sign in</Typography>
        {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Email" value={email} onChange={e=>setEmail(e.target.value)} fullWidth />
            <TextField label="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" fullWidth />
            <Button type="submit" variant="contained">Sign in</Button>
            <Link component={RouterLink} to="/forgot" underline="hover" sx={{ fontSize:14, mt:1, textAlign:'center' }}>Forgot password?</Link>
            {/* Signup removed: link intentionally omitted */}
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
