import React, { useState } from 'react'
import { Container, Paper, Typography, TextField, Button, Stack, MenuItem } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
const categories = ['CADET','SCHOLIER','JUNIOR','SENIOR']
export default function Signup(){
  const { signup } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', athleteCategory:'SENIOR' })
  const onSubmit = async (e) => { e.preventDefault(); await signup(form); nav('/dashboard') }
  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 6 }}>
        <Typography variant="h5" gutterBottom>Create an athlete account</Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="First name" value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} />
            <TextField label="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} />
            <TextField label="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
            <TextField label="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
            <TextField select label="Athlete Category" value={form.athleteCategory} onChange={e=>setForm({...form, athleteCategory:e.target.value})}>
              {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Button type="submit" variant="contained">Create account</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
