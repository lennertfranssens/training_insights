import React, { useEffect, useState } from 'react'
import { Box, Grid, Card, CardContent, Typography, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PlaceholderText from '../common/PlaceholderText'
import api from '../api/client'

// Simple metric card component
function MetricCard({ label, value }){
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ mt: 1 }}>{value}</Typography>
      </CardContent>
    </Card>
  )
}

export default function MetricsDashboard(){
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [clubId, setClubId] = useState(() => {
    try { return localStorage.getItem('ti_metrics_club') || '' } catch { return '' }
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuper, setIsSuper] = useState(false)
  const [accessibleClubs, setAccessibleClubs] = useState([])
  const stored = JSON.parse(localStorage.getItem('ti_auth') || '{}')
  const roles = stored?.roles || []

  useEffect(() => {
    setIsSuper(roles.includes('ROLE_SUPERADMIN'))
    setIsAdmin(roles.includes('ROLE_ADMIN'))
  }, [roles])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // fetch metrics
        const params = {}
        if (clubId) params.clubId = clubId
        const res = await api.get('/api/metrics/dashboard', { params })
        setData(res.data)
        // If admin, derive accessible clubs from usersPerClub
        if (!isSuper && isAdmin && res.data?.usersPerClub){
          setAccessibleClubs(res.data.usersPerClub.map(c => ({ id: c.id, name: c.name })))
        }
      } catch (e){
        console.error('Failed to load metrics', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [clubId, isAdmin, isSuper])

  const handleClubChange = (e) => {
    const val = e.target.value
    setClubId(val)
    try { if (val) localStorage.setItem('ti_metrics_club', val); else localStorage.removeItem('ti_metrics_club') } catch {}
  }

  if (loading) return <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>
  if (!data) return <Box p={3}><Typography variant="body1">No metrics available.</Typography></Box>

  const cards = [
    { label: 'Total Clubs', value: data.totalClubs },
    { label: 'Total Users', value: data.totalUsers },
    { label: 'Inactive Users', value: data.inactiveUsers },
    { label: 'Emails Sent', value: data.totalEmailsSent },
    { label: 'Password Resets', value: data.totalPasswordResets },
    data.biggestClub ? { label: 'Biggest Club', value: `${data.biggestClub.name} (${data.biggestClub.userCount})` } : null
  ].filter(Boolean)

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">Metrics Dashboard</Typography>
        {isAdmin && !isSuper && accessibleClubs.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 220 }} variant="outlined">
            <InputLabel id="club-select-label" shrink>Club</InputLabel>
            <Select
              labelId="club-select-label"
              label="Club"
              value={clubId}
              onChange={handleClubChange}
              MenuProps={{ PaperProps:{ style:{ maxHeight: 320 }}}}
              displayEmpty
              renderValue={(selected)=>{
                if (selected === '') return <PlaceholderText italic>All My Clubs</PlaceholderText>
                const found = accessibleClubs.find(c => String(c.id) === String(selected))
                return found ? found.name : selected
              }}
              sx={{ '& .MuiSelect-select': { display:'flex', alignItems:'center' }}}
            >
              <MenuItem value=""><em>All My Clubs</em></MenuItem>
              {accessibleClubs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Box>
      <Grid container spacing={2}>
        {cards.map(c => (
          <Grid item key={c.label} xs={12} sm={6} md={4} lg={3}>
            <MetricCard label={c.label} value={c.value} />
          </Grid>
        ))}
      </Grid>
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>Users per Club</Typography>
        {data.usersPerClub && data.usersPerClub.length > 0 ? (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <Box component="th" sx={{ py: 1, pr:2 }}>Club</Box>
                <Box component="th" sx={{ py: 1 }}>Users</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {data.usersPerClub.map(c => (
                <Box component="tr" key={c.id} sx={{ borderBottom: '1px solid #eee' }}>
                  <Box component="td" sx={{ py: 0.5, pr:2 }}>{c.name}</Box>
                  <Box component="td" sx={{ py: 0.5 }}>{c.userCount}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        ) : <Typography variant="body2">No club data.</Typography>}
      </Box>
    </Box>
  )
}
