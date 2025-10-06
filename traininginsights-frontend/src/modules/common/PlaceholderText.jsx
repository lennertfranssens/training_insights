import React from 'react'
import { Typography } from '@mui/material'

/**
 * Consistent placeholder / muted inline text.
 * Props:
 *   children: node
 *   italic: boolean (optional)
 *   variant: MUI Typography variant (defaults to body2)
 */
export default function PlaceholderText({ children, italic=false, variant='body2', ...rest }){
  return (
    <Typography
      component="span"
      variant={variant}
      color="text.secondary"
      sx={{ fontStyle: italic ? 'italic' : 'normal', display:'inline' }}
      {...rest}
    >
      {children}
    </Typography>
  )
}
