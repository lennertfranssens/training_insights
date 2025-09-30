import React, { useState } from 'react'
import api from '../api/client'
import { Paper, Button, Typography, Stack, Input } from '@mui/material'

export default function AdminBackupPage(){
  const [importResult, setImportResult] = useState(null)
  const [uploading, setUploading] = useState(false)

  const download = async () => {
    try{
      const res = await api.get('/api/admin/backup/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = 'ti-backup.json'; document.body.appendChild(a); a.click(); a.remove();
    }catch(e){ alert('Export failed') }
  }

  const onFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', f)
    try{
      const { data } = await api.post('/api/admin/backup/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(data)
    }catch(e){ alert('Import failed: ' + (e.message || e)) }
    finally{ setUploading(false) }
  }

  return (
    <Paper sx={{ p:2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Database backup</Typography>
        <Button variant="contained" onClick={download}>Download backup (JSON)</Button>
        <div>
          <label htmlFor="backup-upload">Upload backup JSON to import:</label>
          <input id="backup-upload" type="file" accept="application/json" onChange={onFile} disabled={uploading} />
        </div>
        {importResult && <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify(importResult, null, 2)}</pre>}
      </Stack>
    </Paper>
  )
}
