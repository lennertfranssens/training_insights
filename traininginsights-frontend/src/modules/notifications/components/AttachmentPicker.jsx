import React, { useCallback, useState } from 'react'
import { Stack, Button, Typography, LinearProgress, IconButton, Box } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Close'

// Presentational attachment selector / list / progress
export function AttachmentPicker({ files, errors, maxMb, percent, totalBytes, onAdd, onRemove, disabled }){
  const humanTotal = totalBytes < 1024*1024 ? `${(totalBytes/1024).toFixed(0)} KB` : `${(totalBytes/1024/1024).toFixed(2)} MB`
  const [dragActive, setDragActive] = useState(false)
  const handleDrag = useCallback((e)=>{
    e.preventDefault(); e.stopPropagation()
    if (disabled) return
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    if (e.type === 'dragleave') setDragActive(false)
  }, [disabled])
  const handleDrop = useCallback((e)=>{
    e.preventDefault(); e.stopPropagation()
    if (disabled) return
    setDragActive(false)
    if (e.dataTransfer?.files?.length){ onAdd(e.dataTransfer.files) }
  }, [onAdd, disabled])
  return (
    <Stack spacing={1} sx={{ mt:1 }} onDragEnter={handleDrag}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Button variant="outlined" component="label" size="small" disabled={disabled}>
          Add files
          <input type="file" hidden multiple onChange={e=> onAdd(e.target.files)} />
        </Button>
        {files.length > 0 && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth:240 }}>
            <Typography variant="caption" sx={{ whiteSpace:'nowrap' }}>{files.length} file{files.length>1?'s':''} • {humanTotal} / {maxMb} MB</Typography>
            <Box sx={{ flex:1, minWidth:100 }}>
              <LinearProgress variant="determinate" value={percent} sx={{ height:6, borderRadius:1 }} />
            </Box>
          </Stack>
        )}
      </Stack>
      {errors && errors.length>0 && (
        <Stack>{errors.map((er,i)=><Typography key={i} variant="caption" color="error">{er}</Typography>)}</Stack>
      )}
      {files.length>0 && (
        <Stack spacing={0.5} sx={{ maxHeight:140, overflow:'auto' }}>
          {files.map((f,i)=>(
            <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ border:'1px solid', borderColor:'divider', p:0.5, borderRadius:1 }}>
              <Typography variant="caption" sx={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name} ({(f.size/1024).toFixed(1)} KB)</Typography>
              <IconButton size="small" onClick={()=>onRemove(i)} disabled={disabled}><DeleteIcon fontSize="inherit" /></IconButton>
            </Stack>
          ))}
        </Stack>
      )}
      {/* Drag overlay zone */}
      <Box
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        sx={{
          mt:0.5,
          p:2,
          textAlign:'center',
          border:'2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius:1,
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          transition:'background-color 120ms, border-color 120ms',
          cursor: disabled ? 'not-allowed' : 'copy',
          color: 'text.secondary',
          fontSize: 12
        }}
      >
        {disabled ? 'Sending…' : dragActive ? 'Release to add files' : 'Drag & drop files here'}
      </Box>
    </Stack>
  )
}
export default AttachmentPicker
