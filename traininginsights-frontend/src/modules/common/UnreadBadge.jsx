import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { Badge } from '@mui/material'
import { styled } from '@mui/material/styles'

// Compact badge: slightly smaller and positioned as a small overlay
const CompactBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    minWidth: 18,
    height: 18,
    padding: '0 4px',
    fontSize: '0.65rem',
    lineHeight: '18px',
    borderRadius: 9,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    transform: 'translate(50%, -50%)'
  }
}))

export default function UnreadBadge({ children, showZero = false, compact = true }){
  const [count, setCount] = useState(0)
  const load = ()=> api.get('/api/notifications/unread-count').then(r=> setCount(r.data)).catch(()=>{})
  useEffect(()=>{ load(); window.addEventListener('notifications-updated', load); return ()=> window.removeEventListener('notifications-updated', load) },[])

  // If showZero is false and count is 0, render children without badge
  if (!showZero && (!count || count <= 0)) return children || null

  const BadgeComp = compact ? CompactBadge : Badge
  // Cap display at 99+
  const display = count > 99 ? '99+' : count

  return (
    <BadgeComp badgeContent={display} color="error" showZero={showZero}>
      {children || null}
    </BadgeComp>
  )
}
