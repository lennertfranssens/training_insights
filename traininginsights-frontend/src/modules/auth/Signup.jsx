import React, { useState, useEffect } from 'react'
import { Container, Paper, Typography, TextField, Button, Stack, MenuItem, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import api from '../api/client'
const categories = ['CADET','SCHOLIER','JUNIOR','SENIOR']
export default function Signup(){
  const { signup } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', athleteCategory:'SENIOR', birthDate: '', clubId: '' })
  const [clubs, setClubs] = useState([])
  const [loadingClubs, setLoadingClubs] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    api.get('/api/public/clubs').then(res => {
      if (mounted) setClubs(res.data || [])
    }).catch(() => {
      if (mounted) setClubs([])
    }).finally(() => { if (mounted) setLoadingClubs(false) })
    return () => { mounted = false }
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null)
    const payload = { ...form }
    if (!payload.clubId) delete payload.clubId
    try {
      await signup(payload)
      nav('/dashboard')
    } catch (err) {
      if (err?.response?.status === 400 && err?.response?.data?.token === 'INVALID_CLUB') {
        setError('Selected club is invalid.')
      } else {
        setError('Signup failed. Please check inputs.')
      }
    }
  }
  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 6 }}>
        <Typography variant="h5" gutterBottom>Create an athlete account</Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="First name" value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} />
            <TextField label="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} />
            <TextField label="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
            <TextField label="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
            <TextField select label="Athlete Category" value={form.athleteCategory} onChange={e=>setForm({...form, athleteCategory:e.target.value})}>
              {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField type="date" label="Birth date" InputLabelProps={{ shrink: true }} value={form.birthDate} onChange={e=>setForm({...form, birthDate: e.target.value})} />
            <TextField select label="Club (optional)" value={form.clubId} disabled={loadingClubs} onChange={e=>setForm({...form, clubId:e.target.value})} helperText="You can join a club now or later.">
              <MenuItem value="">-- No club --</MenuItem>
              {clubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <Button type="submit" variant="contained">Create account</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
