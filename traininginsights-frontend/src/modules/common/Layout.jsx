import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem, Avatar, Drawer, List, ListItemButton, ListItemText, Divider } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import UnreadBadge from './UnreadBadge'
import { getNavItems } from './RoleNav'
import { useAuth } from '../auth/AuthContext'
import { useThemeMode } from './ThemeContext'
export default function Layout(){
  const { auth, signout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = React.useState(null)
  const { mode, resolvedMode, cycleMode } = useThemeMode()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const open = Boolean(anchor)
  const loc = useLocation()
  const roles = auth?.roles || []
  const navItems = getNavItems(roles)
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" sx={{ overflow: 'hidden' }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
          {auth && (
            <IconButton color="inherit" edge="start" sx={{ mr: 1 }} onClick={()=>setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>TrainingInsights</Link>
          </Typography>
          {auth ? (
            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <IconButton color="inherit" sx={{ mr: { xs: 0.5, sm: 1 } }} onClick={()=>{ window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: { section: 'notifications' } })); navigate('/dashboard/notifications') }}>
                <UnreadBadge>
                  <NotificationsIcon />
                </UnreadBadge>
              </IconButton>
              <IconButton color="inherit" onClick={(e)=>setAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 34, height: 34 }}>{auth.email?.[0]?.toUpperCase()}</Avatar>
              </IconButton>
              <Menu open={open} anchorEl={anchor} onClose={()=>setAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Box sx={{ px: 2, pt: 1, pb: 1 }}>
                  <Typography variant="subtitle2" sx={{ maxWidth: 240, wordBreak: 'break-all' }}>{auth.email}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { cycleMode(); }}>
                  Theme: {mode === 'system' ? `System (${resolvedMode})` : mode.charAt(0).toUpperCase()+mode.slice(1)}
                </MenuItem>
                <Divider />
                <MenuItem component={Link} to="/dashboard" onClick={()=>setAnchor(null)}>Dashboard</MenuItem>
                <MenuItem component={Link} to="/dashboard/settings" onClick={()=>setAnchor(null)}>Settings</MenuItem>
                <Divider />
                <MenuItem onClick={() => { setAnchor(null); signout(); navigate('/login', { replace: true }) }}>Sign out</MenuItem>
              </Menu>
            </Box>
          ) : (
            <MenuItem component={Link} to="/login" sx={{ color: 'white' }}>Sign in</MenuItem>
          )}
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
      <Box sx={{ p: { xs: 1.5, sm: 2 }, overflowX: 'hidden' }}><Outlet key={loc.key} /></Box>
    </Box>
  )
}
