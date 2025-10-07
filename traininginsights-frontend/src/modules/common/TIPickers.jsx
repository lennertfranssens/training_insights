import React, { useState, useEffect, useRef } from 'react'
import { TextField, Stack, IconButton, Popover, Grid, Typography, useTheme } from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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
  const [raw, setRaw] = useState(value ? dayjs(value).format('DD/MM/YYYY') : '')
  const lastValueRef = useRef(value)

  // Sync when upstream value changes externally (e.g., form reset)
  useEffect(()=>{
    if (value !== lastValueRef.current) {
      lastValueRef.current = value
      setRaw(value ? dayjs(value).format('DD/MM/YYYY') : '')
    }
  }, [value])

  const [anchorEl, setAnchorEl] = useState(null)

  const openCal = (e)=>{ setAnchorEl(e.currentTarget) }
  const closeCal = ()=> setAnchorEl(null)
  const popOpen = Boolean(anchorEl)

  const handleChange = (e)=>{
    let newVal = e.target.value.replace(/[^0-9/]/g,'') // allow digits and slashes only
    // Auto-insert slashes when typing digits straight through
    const digits = newVal.replace(/\//g,'')
    if (e.nativeEvent && e.nativeEvent.inputType !== 'deleteContentBackward') {
      if (digits.length <= 8) {
        if (digits.length >= 5) newVal = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
        else if (digits.length >= 3) newVal = `${digits.slice(0,2)}/${digits.slice(2)}`
        else newVal = digits
      }
    }
    // Prevent multiple slashes / malformed
    newVal = newVal.replace(/\/+/g,'/')
    setRaw(newVal)
    // Only attempt validation when length matches full pattern
    if(newVal.length === 10){
      const parsed = parseDate(newVal)
      if(!parsed){ onChange && onChange(null,{valid:false,reason:'format'}); return }
      if(disablePast && parsed.isBefore(dayjs().startOf('day'))) { onChange && onChange(null,{valid:false,reason:'past'}); return }
      if(minDate && parsed.isBefore(dayjs(minDate).startOf('day'))) { onChange && onChange(null,{valid:false,reason:'min'}); return }
      if(maxDate && parsed.isAfter(dayjs(maxDate).startOf('day'))) { onChange && onChange(null,{valid:false,reason:'max'}); return }
      onChange && onChange(parsed.format('YYYY-MM-DD'),{valid:true})
    } else {
      // Partial input: inform invalid (format) but don't wipe text
      onChange && onChange(null,{valid:false,reason:'partial'})
    }
  }
  const today = dayjs()
  const parsedTyped = (raw && raw.length>=7 && /\d{2}\/\d{2}\/\d{4}/.test(raw)) ? dayjs(raw.split('/').reverse().join('-')) : null
  const initialMonth = (parsedTyped && parsedTyped.isValid()) ? parsedTyped.startOf('month') : (value ? dayjs(value).startOf('month') : today.startOf('month'))
  const [calendarMonth, setCalendarMonth] = useState(initialMonth)

  // When value or raw changes to a different month, sync calendarMonth
  useEffect(()=>{
    if (parsedTyped && parsedTyped.isValid()) {
      if (!parsedTyped.isSame(calendarMonth,'month')) setCalendarMonth(parsedTyped.startOf('month'))
    } else if (value) {
      const v = dayjs(value)
      if (v.isValid() && !v.isSame(calendarMonth,'month')) setCalendarMonth(v.startOf('month'))
    }
  }, [raw, value])

  const startOfMonth = calendarMonth.startOf('month')
  const daysInMonth = calendarMonth.daysInMonth()
  // Build Monday-first weeks
  const weeks = []
  let currentWeek = new Array((startOfMonth.day()+6)%7).fill(null) // shift so Monday=0
  for (let d=1; d<=daysInMonth; d++) {
    const dateObj = calendarMonth.date(d)
    currentWeek.push(dateObj)
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = [] }
  }
  if (currentWeek.length>0){ while(currentWeek.length<7) currentWeek.push(null); weeks.push(currentWeek) }

  const theme = useTheme()
  const pickDate = (d)=>{
    if(!d) return
    const iso = d.format('YYYY-MM-DD')
    setRaw(d.format('DD/MM/YYYY'))
    onChange && onChange(iso,{valid:true})
    closeCal()
  }

  return (
    <>
      <TextField label={label} value={raw} onChange={handleChange} placeholder='dd/mm/yyyy' required={required} error={error} helperText={helperText||'dd/mm/yyyy'} inputProps={{ maxLength:10 }} InputProps={{ endAdornment: (
        <IconButton size='small' onClick={openCal} aria-label='open calendar'>
          <CalendarMonthIcon fontSize='small' />
        </IconButton>
      )}} />
      <Popover open={popOpen} anchorEl={anchorEl} onClose={closeCal} anchorOrigin={{ vertical:'bottom', horizontal:'left' }}>
        <Stack sx={{ p:1, width: 220 }} spacing={1}>
          <Stack direction='row' alignItems='center' justifyContent='space-between'>
            <IconButton size='small' onClick={()=>setCalendarMonth(m=>m.subtract(1,'month'))} aria-label='previous month'><ChevronLeftIcon fontSize='small' /></IconButton>
            <Typography variant='caption' sx={{ textAlign:'center', flex:1 }}>{calendarMonth.format('MMMM YYYY')}</Typography>
            <IconButton size='small' onClick={()=>setCalendarMonth(m=>m.add(1,'month'))} aria-label='next month'><ChevronRightIcon fontSize='small' /></IconButton>
          </Stack>
          <Grid container columns={7} spacing={0.5} sx={{ textAlign:'center' }}>
            {['M','T','W','T','F','S','S'].map(d=> <Grid item xs={1} key={d}><Typography variant='caption' sx={{ fontWeight:600 }}>{d}</Typography></Grid>)}
            {weeks.map((w,i)=> w.map((dayObj,j)=>{
              const key = `${i}-${j}`
              if(!dayObj) return <Grid item xs={1} key={key}><span style={{ display:'inline-block', width:24 }} /></Grid>
              const disabled = (disablePast && dayObj.isBefore(dayjs().startOf('day'))) || (minDate && dayObj.isBefore(dayjs(minDate))) || (maxDate && dayObj.isAfter(dayjs(maxDate)))
              const selected = value && dayjs(value).isSame(dayObj,'day')
              const isToday = dayObj.isSame(dayjs(),'day')
              const palette = theme.palette
              const bgSelected = palette.primary.main
              const bgDefault = palette.mode === 'dark' ? palette.background.paper : 'white'
              const borderColor = palette.divider
              const colorSelected = palette.primary.contrastText
              const colorDisabled = palette.text.disabled
              const colorDefault = palette.text.primary
              const hoverBg = palette.action.hover
              return (
                <Grid item xs={1} key={key}>
                  <button onClick={()=>!disabled && pickDate(dayObj)} disabled={disabled} style={{
                    width:30, height:30, borderRadius:6, border:`1px solid ${selected ? bgSelected : borderColor}`,
                    background: selected ? bgSelected : (isToday ? (palette.mode==='dark' ? palette.primary.dark : '#e3f2fd') : bgDefault),
                    color: disabled ? colorDisabled : (selected ? colorSelected : colorDefault),
                    cursor: disabled ? 'default':'pointer',
                    fontWeight: isToday && !selected ? 600 : 400,
                    transition:'background .15s,border .15s',
                  }}
                  onMouseEnter={e=>{ if(!disabled && !selected) e.currentTarget.style.background = hoverBg }}
                  onMouseLeave={e=>{ if(!disabled && !selected) e.currentTarget.style.background = isToday ? (palette.mode==='dark' ? palette.primary.dark : '#e3f2fd') : bgDefault }}
                  >{dayObj.date()}</button>
                </Grid>
              )
            }))}
          </Grid>
        </Stack>
      </Popover>
    </>
  )
}

export function TITimeInput({ label='Time', value, onChange, required, error, helperText }){
  // Controlled external value is canonical HH:mm. We maintain a local raw for partial typing.
  const [raw, setRaw] = useState(value||'')
  const lastValueRef = useRef(value)
  useEffect(()=>{
    if (value !== lastValueRef.current) {
      lastValueRef.current = value
      setRaw(value||'')
    }
  }, [value])

  const handle = (e)=>{
    let txt = e.target.value.replace(/[^0-9:]/g,'')
    // Auto-insert colon after HH if user types 3rd digit and colon missing
    if (/^\d{3}$/.test(txt)) {
      txt = txt.slice(0,2) + ':' + txt.slice(2)
    }
    // Prevent multiple colons
    txt = txt.replace(/:+/g,':')
    // Trim to max length 5
    if (txt.length > 5) txt = txt.slice(0,5)
    setRaw(txt)
    if (txt.length < 5) {
      onChange && onChange(null,{ valid:false, reason:'partial' })
      return
    }
    const parsed = parseTime(txt)
    if(!parsed){ onChange && onChange(null,{valid:false,reason:'format'}); return }
    onChange && onChange(txt,{valid:true})
  }
  return <TextField label={label} value={raw} onChange={handle} placeholder='HH:mm' required={required} error={error} helperText={helperText||'HH:mm (24h)'} inputProps={{ maxLength:5 }} />
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
