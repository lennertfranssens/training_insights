import React, { useMemo } from 'react'
import { TextField, MenuItem, Box, Typography, Stack, Slider, Checkbox, FormControlLabel } from '@mui/material'
export default function QuestionnaireForm({ structure, values, onChange }){
  const spec = useMemo(()=>{
    if (!structure) return { fields: [] }
    try { return typeof structure === 'string' ? JSON.parse(structure) : structure }
    catch { return { fields: [] } }
  }, [structure])
  const set = (name, value) => onChange({ ...values, [name]: value })
  return (
    <Stack spacing={2}>
      {(spec.fields || []).map(f => {
        const v = values?.[f.name] ?? ''
        switch(f.type){
          case 'number':
            return <TextField key={f.name} type="number" label={f.label || f.name} value={v}
              inputProps={{ min:f.min, max:f.max, step:f.step || 1 }}
              onChange={e=>set(f.name, Number(e.target.value))} fullWidth />
          case 'select':
            return <TextField key={f.name} select label={f.label || f.name} value={v}
              onChange={e=>set(f.name, e.target.value)} fullWidth>
              {(f.options || []).map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
          case 'slider':
            return <Box key={f.name}>
              <Typography gutterBottom>{f.label || f.name} ({v})</Typography>
              <Slider min={f.min ?? 0} max={f.max ?? 10} step={f.step || 1} value={Number(v) || 0}
                onChange={(e,val)=>set(f.name, val)} />
            </Box>
          case 'checkbox':
            return <FormControlLabel key={f.name} control={
              <Checkbox checked={!!v} onChange={e=>set(f.name, e.target.checked)} />
            } label={f.label || f.name} />
          case 'textarea':
            return <TextField key={f.name} multiline rows={f.rows || 3} label={f.label || f.name} value={v} onChange={e=>set(f.name, e.target.value)} fullWidth />
          default:
            return <TextField key={f.name} label={f.label || f.name} value={v} onChange={e=>set(f.name, e.target.value)} fullWidth />
        }
      })}
    </Stack>
  )
}
