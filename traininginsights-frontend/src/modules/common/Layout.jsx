import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem, Avatar } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../auth/AuthContext'
export default function Layout(){
  const { auth, signout } = useAuth()
  const [anchor, setAnchor] = React.useState(null)
  const open = Boolean(anchor)
  const loc = useLocation()
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" edge="start" sx={{ mr: 2 }}><MenuIcon /></IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>TrainingInsights</Link></Typography>
          {auth ? (<>
              <Typography variant="body2" sx={{ mr: 2 }}>{auth.email}</Typography>
              <IconButton color="inherit" onClick={(e)=>setAnchor(e.currentTarget)}><Avatar>{auth.email?.[0]?.toUpperCase()}</Avatar></IconButton>
              <Menu open={open} anchorEl={anchor} onClose={()=>setAnchor(null)}>
                <MenuItem component={Link} to="/dashboard">Dashboard</MenuItem>
                <MenuItem onClick={() => { setAnchor(null); signout(); }}>Sign out</MenuItem>
              </Menu>
            </>) : (<MenuItem component={Link} to="/login" sx={{ color: 'white' }}>Sign in</MenuItem>)}
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}><Outlet key={loc.key} /></Box>
    </Box>
  )
}
