import React, { useEffect, useState } from 'react'
import { Paper, Typography, Stack, TextField, Button, Alert, CircularProgress } from '@mui/material'
import api from '../api/client'
import { useSnackbar } from '../common/SnackbarProvider'

// Simple URL validation: require http/https, host, optional port
function validateBaseUrl(value){
  if (!value) return 'Base URL is required'
  let v = value.trim()
  if (!/^https?:\/\//i.test(v)) return 'Must start with http:// or https://'
  try {
    const u = new URL(v)
    if (!u.hostname) return 'Host required'
    // forbid trailing spaces; allow trailing slash but normalize below
  } catch(e){ return 'Invalid URL: ' + e.message }
  return ''
}

export default function SuperAdminBaseUrlSettings(){
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [dbValue, setDbValue] = useState(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // { ok: boolean, message: string }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/config/base-url')
      if (data && data.baseUrl){
        setValue(data.baseUrl)
        setDbValue(data.baseUrl)
      } else {
        // fallback: fetch unified config to show current effective base URL
        try { const { data: unified } = await api.get('/api/config'); if (unified?.baseUrl) setValue(unified.baseUrl) } catch(e){}
      }
    } catch(e){ /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const onChange = (e) => {
    const v = e.target.value
    setValue(v)
    setError(validateBaseUrl(v))
  }

  const save = async () => {
    const err = validateBaseUrl(value)
    setError(err)
    if (err) return
    setSaving(true)
    try {
      // Normalize: drop trailing slash except root
      let toSave = value.trim()
      if (toSave.length > 1 && toSave.endsWith('/')) toSave = toSave.slice(0, -1)
      const { data } = await api.post('/api/config/base-url', { baseUrl: toSave })
      setDbValue(data.baseUrl)
      showSnackbar('Base URL updated')
      // Force refresh of cached global config if parts of app depend on it
      window.dispatchEvent(new Event('config-updated'))
    } catch(e){ showSnackbar('Save failed: ' + (e.response?.data?.message || e.message || '')) }
    finally { setSaving(false) }
  }

  const preview = () => {
    const err = validateBaseUrl(value)
    if (err) { setError(err); return }
    let url = value.trim()
    if (url.length > 1 && url.endsWith('/')) url = url.slice(0, -1)
    // Open in new tab without giving the new page access to window.opener
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const testConnectivity = async () => {
    const err = validateBaseUrl(value)
    if (err) { setError(err); return }
    setTesting(true)
    setTestResult(null)
    let base = value.trim()
    if (base.length > 1 && base.endsWith('/')) base = base.slice(0, -1)
    const start = performance.now()
    try {
      // Try unified config first; fallback to /api/config/base-url
      const res = await fetch(base + '/api/config', { method: 'GET' })
      const latency = Math.round(performance.now() - start)
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText)
      const json = await res.json().catch(()=>null)
      setTestResult({ ok: true, message: `Success (${latency} ms). Reported baseUrl: ${json?.baseUrl || 'n/a'}` })
    } catch(e){
      const latency = Math.round(performance.now() - start)
      setTestResult({ ok: false, message: `Failed (${latency} ms): ${e.message}` })
    } finally { setTesting(false) }
  }

  // If dbValue is null (no override yet) treat any non-empty valid value as dirty so Save is enabled.
  const dirty = dbValue === null ? !!value.trim() : value.trim() !== dbValue

  return (
    <Paper sx={{ p:2 }}>
      <Typography variant="h6" sx={{ mb:1 }}>Base URL Configuration</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>
        Defines the absolute base URL (including protocol and port) used for generating links in emails and other outbound contexts.
      </Typography>
      {loading ? (
        <Stack direction="row" spacing={2} alignItems="center"><CircularProgress size={20} /> <Typography variant="body2">Loading...</Typography></Stack>
      ) : (
        <Stack spacing={2}>
          <TextField
            label="Base URL"
            value={value}
            onChange={onChange}
            error={!!error}
            helperText={error || 'Example: https://app.example.com:8443'}
            fullWidth
            disabled={saving}
          />
          {dirty && !error && (
            <Alert severity="info">Unsaved changes</Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={save} disabled={!!error || saving || !dirty}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button variant="outlined" disabled={dbValue===null || !dirty || saving} onClick={()=>{ setValue(dbValue || ''); setError('') }}>Reset</Button>
            <Button variant="text" onClick={load} disabled={saving}>Reload</Button>
            <Button variant="outlined" color="secondary" onClick={preview} disabled={!!error || !value.trim()}>Preview</Button>
            <Button variant="outlined" onClick={testConnectivity} disabled={!!error || testing || !value.trim()}>{testing ? 'Testing...' : 'Test'}</Button>
          </Stack>
          {testResult && (
            <Alert severity={testResult.ok ? 'success' : 'error'}>{testResult.message}</Alert>
          )}
          <Typography variant="caption" color="text.secondary">A trailing slash will be removed automatically.</Typography>
        </Stack>
      )}
    </Paper>
  )
}
