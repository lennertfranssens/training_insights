import React from 'react'
import { Alert, AlertTitle, Link as MuiLink, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

function isIOS() {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function IosInstallBanner(){
  const [dismissed, setDismissed] = React.useState(false)
  React.useEffect(()=>{
    const d = typeof window !== 'undefined' && window.localStorage.getItem('ti_ios_install_banner_dismissed') === '1'
    setDismissed(d)
  }, [])
  if (!isIOS() || isStandalone() || dismissed) return null
  const onClose = () => { try { window.localStorage.setItem('ti_ios_install_banner_dismissed', '1') } catch(e){}; setDismissed(true) }
  return (
    <Alert severity="info" icon={false} sx={{ borderRadius: 0, px: { xs: 2, sm: 3 }, py: 1.5 }}
           action={<IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>}>
      <AlertTitle sx={{ mb: 0.5 }}>Install to receive notifications on iPhone/iPad</AlertTitle>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
        1) Tap the Share button (square with an up arrow) • 2) Choose <strong>Add to Home Screen</strong> •
        3) Open TrainingInsights from your Home Screen and enable notifications in Settings.
        {' '}<MuiLink href="https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/" target="_blank" rel="noreferrer">Learn more</MuiLink>
      </div>
    </Alert>
  )
}
