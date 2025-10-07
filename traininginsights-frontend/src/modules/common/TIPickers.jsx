import React from 'react'
import { TextField, Stack } from '@mui/material'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

// Unified 24h date/time pickers with validation.
// We keep lightweight text-based approach to avoid MUI X license concerns.
// Exposed components:
//  - TIDateInput: dd/MM/yyyy
//  - TITimeInput: HH:mm (24h)
//  - TIDateTimeInputs: combined date + time with constraint helpers
// Validation contract: onChange(valueIso | null, meta) where meta = { valid:boolean, reason?:string }

function parseDate(str){
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null
  const [d,m,y] = str.split('/').map(Number)
  const dt = dayjs(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, 'YYYY-MM-DD', true)
  return dt.isValid() ? dt : null
}
function parseTime(str){
  if(!/^\d{2}:\d{2}$/.test(str)) return null
  const [h,min] = str.split(':').map(Number)
  if(h>23||min>59) return null
  return { h, min }
}

export function TIDateInput({ label='Date', value, onChange, required, error, helperText, disablePast, minDate, maxDate }){
  // value expected ISO date (yyyy-MM-dd) or ''
  const display = value ? dayjs(value).format('DD/MM/YYYY') : ''
  const handle = (e)=>{
    const raw = e.target.value
    const parsed = parseDate(raw)
    if(!parsed){ onChange && onChange(null,{valid:false,reason:'format'}); return }
    if(disablePast && parsed.isBefore(dayjs().startOf('day'))) { onChange && onChange(null,{valid:false,reason:'past'}); return }
    if(minDate && parsed.isBefore(dayjs(minDate).startOf('day'))) { onChange && onChange(null,{valid:false,reason:'min'}); return }
    if(maxDate && parsed.isAfter(dayjs(maxDate).startOf('day'))) { onChange && onChange(null,{valid:false,reason:'max'}); return }
    onChange && onChange(parsed.format('YYYY-MM-DD'),{valid:true})
  }
  return <TextField label={label} value={display} onChange={handle} placeholder='dd/mm/yyyy' required={required} error={error} helperText={helperText||'dd/mm/yyyy'} />
}

export function TITimeInput({ label='Time', value, onChange, required, error, helperText }){
  // value expected HH:mm
  const handle = (e)=>{
    const raw = e.target.value
    const parsed = parseTime(raw)
    if(!parsed){ onChange && onChange(null,{valid:false,reason:'format'}); return }
    onChange && onChange(raw,{valid:true})
  }
  return <TextField label={label} value={value||''} onChange={handle} placeholder='HH:mm' required={required} error={error} helperText={helperText||'HH:mm (24h)'} />
}

export function TIDateTimeInputs({ date, time, onChange, required, errorDate, errorTime, helperDate, helperTime, minDateTimeIso, maxDateTimeIso, enforceOrderWith }){
  // enforceOrderWith: { date:ISO, time:HH:mm } meaning current (date,time) must be after enforceOrderWith
  const dateIso = date || ''
  const timeStr = time || ''
  const emit = (d,t)=>{ onChange && onChange({ date:d, time:t }) }
  const validateOrder = (d,t)=>{
    if(!enforceOrderWith) return true
    const other = enforceOrderWith
    if(!d||!t||!other.date||!other.time) return true
    const thisDt = dayjs(`${d}T${t}:00`)
    const otherDt = dayjs(`${other.date}T${other.time}:00`)
    return thisDt.isAfter(otherDt)
  }
  return (
    <Stack direction='row' spacing={1}>
      <TIDateInput label='Date' value={dateIso} onChange={(val)=>{ emit(val||'', timeStr) }} required={required} error={errorDate} helperText={helperDate} />
      <TITimeInput label='Time' value={timeStr} onChange={(val)=>{ emit(dateIso, val||'') }} required={required} error={errorTime} helperText={helperTime} />
    </Stack>
  )
}
