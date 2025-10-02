import React, { useState } from 'react'
import api from '../api/client'
import { Paper, Button, Typography, Stack, Input } from '@mui/material'
import { useSnackbar } from '../common/SnackbarProvider'

export default function AdminBackupPage(){
  const [importResult, setImportResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const { showSnackbar } = useSnackbar()

  const download = async () => {
    try{
      const res = await api.get('/api/admin/backup/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = 'ti-backup.json'; document.body.appendChild(a); a.click(); a.remove();
  }catch(e){ showSnackbar('Export failed') }
  }

  const downloadZip = async () => {
    try{
      const res = await api.get('/api/admin/backup/export-zip', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }))
      const a = document.createElement('a'); a.href = url; a.download = 'ti-backup.zip'; document.body.appendChild(a); a.click(); a.remove();
    }catch(e){ showSnackbar('Export ZIP failed') }
  }

  const onFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', f)
    try{
      const isZip = f.type === 'application/zip' || f.name.endsWith('.zip')
      const url = isZip ? '/api/admin/backup/import-zip' : '/api/admin/backup/import'
      const { data } = await api.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(data)
  }catch(e){ showSnackbar('Import failed: ' + (e.message || e)) }
    finally{ setUploading(false) }
  }

  return (
    <Paper sx={{ p:2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Database backup</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={download}>Download data only (JSON)</Button>
          <Button variant="contained" onClick={downloadZip}>Download full backup (ZIP)</Button>
        </Stack>
        <div>
          <label htmlFor="backup-upload">Upload backup to import (JSON or ZIP):</label>
          <input id="backup-upload" type="file" accept="application/json,application/zip,.zip" onChange={onFile} disabled={uploading} />
        </div>
        {importResult && <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify(importResult, null, 2)}</pre>}
      </Stack>
    </Paper>
  )
}
