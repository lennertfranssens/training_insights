import React from 'react'
import TextField from '@mui/material/TextField'
import { parseBelgianDate, formatBelgianDate, belgianToIso, isoToBelgian } from './dateUtils'

// Lightweight custom pickers (no MUI X dependency) built on text inputs.
// They enforce Belgian formats and propagate both display and raw values.

export function BelgianDatePicker({ label='Date', value, onChange, error, helperText, required }){
  // value expected: ISO (yyyy-MM-dd) or ''
  const display = isoToBelgian(value)
  const handle = (e) => {
    const raw = e.target.value
    // allow partial typing; only convert when valid
    const parsed = parseBelgianDate(raw)
    if (parsed){
      const iso = belgianToIso(raw)
      onChange && onChange(iso, raw)
    } else {
      // propagate raw as empty iso to indicate invalid/incomplete
      onChange && onChange(null, raw)
    }
  }
  return <TextField label={label} value={display} onChange={handle} placeholder="dd/mm/yyyy" error={error} helperText={helperText || 'dd/mm/yyyy'} required={required} />
}

export function BelgianTimePicker({ label='Time', value, onChange, error, helperText, required }){
  // value: HH:mm or ''
  const handle = (e) => {
    const raw = e.target.value
    if (/^\d{2}:\d{2}$/.test(raw)){
      onChange && onChange(raw)
    } else {
      onChange && onChange(null)
    }
  }
  return <TextField label={label} value={value || ''} onChange={handle} placeholder="HH:mm" error={error} helperText={helperText || 'HH:mm (24u)'} required={required} />
}

export function BelgianDateTimePicker({ label='Date & time', value, onChange, error, helperText, required }){
  // value ISO date + time? For simplicity combine custom controls (could be improved later)
  // Expect value shape: { date: 'yyyy-MM-dd', time: 'HH:mm' }
  const dateIso = value?.date || '';
  const time = value?.time || '';
  const setDate = (iso) => { onChange && onChange({ date: iso || '', time }) }
  const setTime = (t) => { onChange && onChange({ date: dateIso, time: t || '' }) }
  return (
    <div style={{ display:'flex', gap:8 }}>
      <BelgianDatePicker label={label} value={dateIso} onChange={(iso)=>setDate(iso)} error={error} helperText={helperText} required={required} />
      <BelgianTimePicker label="" value={time} onChange={(t)=>setTime(t)} />
    </div>
  )
}
