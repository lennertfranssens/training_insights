import React, { createContext, useContext, useState } from 'react'
import { Snackbar, Button } from '@mui/material'

const SnackbarContext = createContext(null)

export function useSnackbar(){ return useContext(SnackbarContext) }

export default function SnackbarProvider({ children }){
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [actionLabel, setActionLabel] = useState(null)
  const [actionFn, setActionFn] = useState(null)
  const [duration, setDuration] = useState(4000)

  const showSnackbar = (msg, opts = {}) => {
    setMessage(msg)
    setActionLabel(opts.actionLabel || null)
    setActionFn(() => opts.action || null)
    setDuration(opts.duration || 4000)
    setOpen(true)
  }

  const handleClose = () => { setOpen(false); setActionFn(null); setActionLabel(null) }

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        message={message}
        action={actionFn ? <Button color="inherit" size="small" onClick={() => { actionFn(); handleClose() }}>{actionLabel || 'Action'}</Button> : null}
      />
    </SnackbarContext.Provider>
  )
}
