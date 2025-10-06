import React, { useEffect, useRef, useState } from 'react'
import { formatIsoDateTime } from '../common/dateUtils'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Stack, Paper, Typography, Button, Box, Switch, FormControlLabel, Popper, Fade, Paper as MuiPaper } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export function useGroupColor(){
  const theme = useTheme()
  const baseColors = theme.palette.mode === 'dark'
    ? ['#90caf9','#ffb74d','#a5d6a7','#ce93d8','#ffcc80','#81d4fa','#ef9a9a','#fff59d']
    : ['#1976d2','#ef6c00','#2e7d32','#6a1b9a','#ff9800','#0288d1','#d32f2f','#f9a825']
  const primary = theme.palette.primary.main
  const colorForGroupId = (gid) => {
    if(!gid) return primary
    let h = 0; const s = String(gid)
    for (let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0 }
    return baseColors[h % baseColors.length]
  }
  return { colorForGroupId }
}

export default function TrainingsListCalendar({
  trainings = [],
  filledResponses = [],
  // optional controlled view mode; if not provided the component will persist its own using localStorage
  viewMode: propViewMode,
  onViewModeChange,
  viewModeKey = 'trainings.viewMode',
  // optional initial date for calendar view (e.g., to jump to most relevant month)
  initialDate,
  onEventClick, // (trainingId, training) => void
  onDateClick, // (date) => void
  renderActions, // (training) => JSX actions
  renderItemContent, // (training) => JSX content shown in the item's main column (optional)
  onReschedule, // (trainingId, newStartDateISO, newEndDateISO|null) => Promise|void
  autoFocusToday = false // when true, jumps calendar view to today's date on mount / when switching to calendar
}){
  const [localView, setLocalView] = useState(()=>{
    if (propViewMode) return propViewMode
    try { return window.localStorage.getItem(viewModeKey) || 'calendar' } catch(e){ return 'calendar' }
  })
  const viewMode = propViewMode || localView
  const setViewMode = (v) => {
    if (!v) return
    if (propViewMode && onViewModeChange) return onViewModeChange(v)
    setLocalView(v)
    try { window.localStorage.setItem(viewModeKey, v) } catch(e){}
  }

  // Keep a ref to FullCalendar to be able to programmatically change the visible date
  const calendarRef = useRef(null)
  useEffect(()=>{
    if (initialDate && calendarRef.current && viewMode === 'calendar'){
      try { calendarRef.current.getApi().gotoDate(initialDate) } catch(e){}
    }
  }, [initialDate, viewMode])

  // If autoFocusToday is enabled, ensure we navigate to 'today' when entering calendar view (unless an explicit initialDate was provided)
  useEffect(()=>{
    if (!autoFocusToday) return
    if (viewMode !== 'calendar') return
    if (initialDate) return // initialDate takes precedence
    if (calendarRef.current){
      try { calendarRef.current.getApi().today() } catch(e){}
    }
  }, [autoFocusToday, viewMode, initialDate])

  const theme = useTheme()
  const primary = theme.palette.primary.main
  const textSecondary = theme.palette.text.secondary

  // Compact density toggle (persist per view key)
  const densityKey = viewModeKey + '.dense'
  const [dense, setDense] = useState(()=>{
    try { return window.localStorage.getItem(densityKey) === '1' } catch(e){ return false }
  })
  const toggleDense = () => {
    setDense(d => {
      const nv = !d; try { window.localStorage.setItem(densityKey, nv ? '1' : '0') } catch(e){}
      return nv
    })
  }

  // Tooltip state
  const [anchorEl, setAnchorEl] = useState(null)
  const [hoverTraining, setHoverTraining] = useState(null)
  const openTooltip = Boolean(anchorEl && hoverTraining)
  const handleMouseEnter = (info) => {
    try {
      const training = trainings.find(t => String(t.id) === String(info.event.id))
      setHoverTraining(training || null)
      setAnchorEl(info.el)
    } catch(e){}
  }
  const handleMouseLeave = () => {
    setAnchorEl(null); setHoverTraining(null)
  }

  // Deterministic group color mapping (hash group id)
  const baseColors = theme.palette.mode === 'dark'
    ? ['#90caf9','#ffb74d','#a5d6a7','#ce93d8','#ffcc80','#81d4fa','#ef9a9a','#fff59d']
    : ['#1976d2','#ef6c00','#2e7d32','#6a1b9a','#ff9800','#0288d1','#d32f2f','#f9a825']
  const colorForGroupId = (gid) => {
    if(!gid) return primary
    let h = 0; const s = String(gid)
    for (let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0 }
    return baseColors[h % baseColors.length]
  }
  const trainingPrimaryColor = (t) => {
    const gid = t?.groups && t.groups[0]?.id
    return colorForGroupId(gid)
  }

  // NOTE: If adding week/timeGrid or list views later, the global styles in App.jsx already
  // define core variables. You can extend with selectors like:
  //   '.fc-timegrid-slot' or '.fc-list-day-cushion' via GlobalStyles without touching this component.
  // Keep eventContent minimal and accessibility-friendly (aria-label added for response indicator).

  // Available calendar views: month (dayGridMonth) and week (timeGridWeek)
  const calendarViewKey = viewModeKey + '.calView'
  const [calView, setCalView] = useState(()=>{ try { return window.localStorage.getItem(calendarViewKey) || 'dayGridMonth' } catch(e){ return 'dayGridMonth' } })
  const changeCalView = (v) => { if(!v) return; setCalView(v); try { window.localStorage.setItem(calendarViewKey, v) } catch(e){}; if(calendarRef.current){ try { calendarRef.current.getApi().changeView(v) } catch(e){} } }

  const MIN_DURATION_MS = 15 * 60 * 1000 // 15 minutes

  return (
  <Box className="ti-calendar-wrapper" sx={{ '--ti-scrollbar-reserve': 'var(--ti-scrollbar-width,0px)' }}>
      {viewMode === 'calendar' && (
        <Box sx={{ display:'flex', justifyContent:'flex-end', alignItems:'center', mb:1, flexWrap:'wrap', gap:1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel control={<Switch size="small" checked={calView==='timeGridWeek'} onChange={()=> changeCalView(calView==='timeGridWeek' ? 'dayGridMonth' : 'timeGridWeek')} />} label={calView==='timeGridWeek' ? 'Week' : 'Month'} />
            <FormControlLabel control={<Switch size="small" checked={dense} onChange={toggleDense} />} label="Compact" />
          </Stack>
        </Box>
      )}
      {viewMode === 'calendar' ? (
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
          initialView={calView}
          height="auto"
          firstDay={1}
          initialDate={initialDate}
          editable={!!onReschedule}
          eventAllow={(dropInfo, draggedEvent)=>{
            // Prevent moving start before today's date (compare date portion)
            // In week view some browsers report undefined dropInfo.start briefly; allow in that case to avoid false reverts.
            try {
              const start = dropInfo.start || draggedEvent.start
              if (!start) {
                // permissive: allow move if start missing (FullCalendar will provide real start in eventDrop)
                return true
              }
              const today = new Date(); today.setHours(0,0,0,0)
              const allowed = start.getTime() >= today.getTime()
              return allowed
            } catch(e){
              // On any unexpected error be permissive so UX is not blocked
              return true
            }
          }}
          eventDrop={async (info)=>{
            if(!onReschedule) return
            const startIso = info.event.start?.toISOString() || null
            let endIso = info.event.end?.toISOString() || null
            // If training had an end time originally but FullCalendar didn't carry it (all-day or missing), attempt to shift by same delta
            try {
              const orig = trainings.find(t => String(t.id) === String(info.event.id))
              if (orig?.trainingEndTime && orig?.trainingTime && !info.event.end) {
                const deltaMs = new Date(startIso).getTime() - new Date(orig.trainingTime).getTime()
                endIso = new Date(new Date(orig.trainingEndTime).getTime() + deltaMs).toISOString()
              }
              // enforce min duration if both start/end exist
              if (orig?.trainingEndTime || endIso) {
                const s = new Date(startIso).getTime()
                const e = endIso ? new Date(endIso).getTime() : s + MIN_DURATION_MS
                if (e - s < MIN_DURATION_MS) {
                  endIso = new Date(s + MIN_DURATION_MS).toISOString()
                }
              }
            } catch(e){}
            // optimistic UI update (shift local trainings array) until reload by parent
            try {
              // Debug diagnostics to aid investigation if backend rejects
              // (Harmless in production; can be removed after confirming fix.)
              // eslint-disable-next-line no-console
              console.debug('[TrainingsListCalendar] eventDrop -> PATCH reschedule', { id: info.event.id, startIso, endIso })
              await onReschedule(String(info.event.id), startIso, endIso)
            } catch(e){
              // eslint-disable-next-line no-console
              console.warn('[TrainingsListCalendar] Reschedule failed; reverting event', e)
              info.revert()
            }
          }}
          // The calendar root element receives CSS variable overrides for theming
          dayCellContent={(arg)=> arg.dayNumberText }
          // Theme variables now applied globally in App.jsx
          events={(trainings||[]).map(t => ({ id: t.id, title: t.title, start: t.trainingTime, end: t.trainingEndTime || null, extendedProps:{ training: t } }))}
          eventContent={(arg)=>{
            // arg.event.id corresponds to training id
            const tId = String(arg.event.id)
            const hasResponse = (filledResponses||[]).some(r => String(r.training?.id) === tId || String(r.trainingId) === tId)
            const training = arg.event.extendedProps.training
            // compute time label (skip for all-day events)
            let timeLabel = ''
            try{
              if (!arg.event.allDay && arg.event.start){
                timeLabel = new Date(arg.event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            }catch(e){}
            const timeHtml = timeLabel ? `<span style=\"margin-right:8px;color:${textSecondary};font-size:0.9em;\">${timeLabel}</span>` : ''
            const color = trainingPrimaryColor(training)
            const groupDots = (training?.groups||[]).slice(0,3).map(g => `<span aria-label="group ${g.name}" role="img" style=\"display:inline-block;width:6px;height:6px;border-radius:50%;background:${colorForGroupId(g.id)};margin-left:4px;\"></span>`).join('')
            return {
              html: `<div style=\"display:flex;align-items:center;justify-content:space-between;width:100%;padding:${dense? '0 2px':'0 4px'};\"><div style=\"flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">${timeHtml}<span style=\"color:${color};font-weight:500;\">${arg.event.title}</span>${groupDots}</div>${hasResponse ? `<div aria-label=\"questionnaire response submitted\" role=\"img\" style=\"width:8px;height:8px;background:${color};border-radius:50%;margin-left:6px;\"></div>` : ''}</div>`
            }
          }}
          eventDidMount={(info)=>{
            try { info.el.style.cursor = 'pointer' } catch(e){}
            // Hover listeners for tooltip
            info.el.addEventListener('mouseenter', ()=> handleMouseEnter(info))
            info.el.addEventListener('mouseleave', handleMouseLeave)
          }}
          eventResize={async (info)=>{
            if(!onReschedule) return
            const startIso = info.event.start?.toISOString() || null
            const endIso = info.event.end?.toISOString() || null
            try {
              if (!startIso || !endIso) { info.revert(); return }
              const startMs = new Date(startIso).getTime()
              const endMs = new Date(endIso).getTime()
              if (endMs <= startMs) { info.revert(); return }
              if (endMs - startMs < MIN_DURATION_MS) {
                // extend to min duration
                const newEnd = new Date(startMs + MIN_DURATION_MS).toISOString()
                await onReschedule(String(info.event.id), startIso, newEnd)
              } else {
                await onReschedule(String(info.event.id), startIso, endIso)
              }
            } catch(e){ info.revert() }
          }}
          dateClick={(info)=>{ try { onDateClick && onDateClick(info.dateStr || info.date); } catch(e){} }}
          eventClick={(info)=>{ try { onEventClick && onEventClick(String(info.event.id), trainings.find(x=>String(x.id)===String(info.event.id))) } catch(e){} }}
        />
        ) : (
        <Stack spacing={1}>
          {(trainings||[]).map(t => (
            <Paper key={t.id} sx={{ p: dense ? 1 : 2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                {renderItemContent ? renderItemContent(t) : (
                  <>
                    <Typography>{t.title}</Typography>
                    <Typography variant="body2">{formatIsoDateTime(t.trainingTime)}</Typography>
                  </>
                )}
              </div>
              <div>
                {renderActions ? renderActions(t) : (
                  <Button onClick={()=>onEventClick && onEventClick(t.id, t)}>View</Button>
                )}
              </div>
            </Paper>
          ))}
        </Stack>
      )}
      <Popper
        open={openTooltip}
        anchorEl={anchorEl}
        placement="top"
        transition
        modifiers={[
          { name: 'offset', options: { offset: [0,8] } },
          { name: 'zIndex', enabled: true, phase: 'write', fn: ({ state }) => { state.styles.popper.zIndex = 2000 } }
        ]}
        style={{ zIndex: 2000 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={120}>
            <MuiPaper elevation={4} sx={{ p:1, maxWidth:240 }} role="tooltip">
              {hoverTraining ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight:600 }}>{hoverTraining.title}</Typography>
                  {hoverTraining.trainingTime && <Typography variant="caption" sx={{ display:'block', color:'text.secondary' }}>{formatIsoDateTime(hoverTraining.trainingTime)}{hoverTraining.trainingEndTime ? ' – ' + formatIsoDateTime(hoverTraining.trainingEndTime) : ''}</Typography>}
                  {hoverTraining.description && <Typography variant="body2" sx={{ mt:0.5, whiteSpace:'pre-wrap' }}>{hoverTraining.description.slice(0,160)}{hoverTraining.description.length>160?'…':''}</Typography>}
                  {(hoverTraining.groups||[]).length>0 && (
                    <Typography variant="caption" sx={{ mt:0.5, display:'block' }}>
                      Groups: {(hoverTraining.groups||[]).map(g=>g.name).join(', ')}
                    </Typography>
                  )}
                </>
              ) : null}
            </MuiPaper>
          </Fade>
        )}
      </Popper>
    </Box>
  )
}
