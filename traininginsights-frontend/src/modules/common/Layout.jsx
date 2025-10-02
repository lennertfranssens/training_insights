import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem, Avatar, Drawer, List, ListItemButton, ListItemText, Divider } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import UnreadBadge from './UnreadBadge'
import { getNavItems } from './RoleNav'
import { useAuth } from '../auth/AuthContext'
export default function Layout(){
  const { auth, signout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = React.useState(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const open = Boolean(anchor)
  const loc = useLocation()
  const roles = auth?.roles || []
  const navItems = getNavItems(roles)
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          {auth && (
            <IconButton color="inherit" edge="start" sx={{ mr: 1 }} onClick={()=>setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>TrainingInsights</Link></Typography>
          {auth ? (<>
              <Typography variant="body2" sx={{ mr: 2 }}>{auth.email}</Typography>
              <IconButton color="inherit" sx={{ mr: 1 }} onClick={()=>{ window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: { section: 'notifications' } })); navigate('/dashboard/notifications') }}>
                <UnreadBadge>
                  <NotificationsIcon />
                </UnreadBadge>
              </IconButton>
              <IconButton color="inherit" onClick={(e)=>setAnchor(e.currentTarget)}><Avatar>{auth.email?.[0]?.toUpperCase()}</Avatar></IconButton>
              <Menu open={open} anchorEl={anchor} onClose={()=>setAnchor(null)}>
                <MenuItem component={Link} to="/dashboard" onClick={()=>setAnchor(null)}>Dashboard</MenuItem>
                <MenuItem component={Link} to="/dashboard/settings" onClick={()=>setAnchor(null)}>Settings</MenuItem>
                <MenuItem onClick={() => { setAnchor(null); signout(); navigate('/login', { replace: true }) }}>Sign out</MenuItem>
              </Menu>
            </>) : (<MenuItem component={Link} to="/login" sx={{ color: 'white' }}>Sign in</MenuItem>)}
        </Toolbar>
      </AppBar>
      <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation" onClick={()=>setDrawerOpen(false)} onKeyDown={()=>setDrawerOpen(false)}>
          <Typography variant="h6" sx={{ p:2, pb:1 }}>Menu</Typography>
          <Divider />
          <List>
            {navItems.map(item => (
              <ListItemButton key={item.to || item.section} onClick={()=>{
                if (item.to) {
                  navigate(item.to)
                } else if (item.section) {
                  // fallback for legacy section-based nav
                  window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: { section: item.section } }));
                  navigate('/dashboard')
                }
              }}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box sx={{ p: 2 }}><Outlet key={loc.key} /></Box>
    </Box>
  )
}
