import React from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Reuse hashing logic to remain consistent with TrainingsListCalendar
function hashColor(gid, baseColors){
  if(!gid) return null
  let h = 0; const s = String(gid)
  for (let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0 }
  return baseColors[h % baseColors.length]
}

export default function GroupColorLegend({ groups }){
  const theme = useTheme()
  const baseColors = theme.palette.mode === 'dark'
    ? ['#90caf9','#ffb74d','#a5d6a7','#ce93d8','#ffcc80','#81d4fa','#ef9a9a','#fff59d']
    : ['#1976d2','#ef6c00','#2e7d32','#6a1b9a','#ff9800','#0288d1','#d32f2f','#f9a825']
  if (!groups || groups.length === 0) return null
  // unique by id
  const uniq = []
  const seen = new Set()
  groups.forEach(g => { if (g && g.id != null && !seen.has(g.id)){ seen.add(g.id); uniq.push(g) } })
  if (!uniq.length) return null
  return (
    <Box sx={{ mt:1, mb:1 }}>
      <Typography variant="caption" sx={{ fontWeight:500, display:'block', mb:0.5 }}>Group colors</Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={0.5}>
        {uniq.map(g => {
          const color = hashColor(g.id, baseColors)
          return (
            <Stack key={g.id} direction="row" spacing={0.75} alignItems="center" sx={{ fontSize:12 }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:color, display:'inline-block' }} />
              <span>{g.name}</span>
            </Stack>
          )
        })}
      </Stack>
    </Box>
  )
}
