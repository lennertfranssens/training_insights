import React, { useEffect, useRef, useState } from 'react'
import { formatIsoDateTime } from '../common/dateUtils'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Stack, Paper, Typography, Button, Box, Popper, Fade, Paper as MuiPaper, Pagination } from '@mui/material'
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
  autoFocusToday = false, // when true, jumps calendar view to today's date on mount / when switching to calendar
  autoScrollTodayInList = false // when true (list mode), scrolls to first training occurring today or later
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

  // (Removed compact density toggle)

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
  // Events longer than this are visually stretched to fill the slot height in timeGrid view.
  // Shorter events shrink to their content so they appear more compact.
  const LONG_EVENT_MS = 45 * 60 * 1000 // 45 minutes threshold for full-height styling

  // Auto-scroll (list mode) to first training occurring today or later when enabled
  const hasAutoScrolledRef = useRef(false)
  useEffect(()=>{
    if (viewMode !== 'list') { hasAutoScrolledRef.current = false; return }
    // Auto-scroll now handled by pagination (selecting correct page). Keeping hook placeholder if future in-page scrolling needed.
  }, [viewMode, trainings])

  // ===== List Pagination (10 per page) =====
  const PAGE_SIZE = 10
  const sortedTrainings = [...(trainings||[])].sort((a,b)=>{
    const ta = a.trainingTime ? new Date(a.trainingTime).getTime() : 0
    const tb = b.trainingTime ? new Date(b.trainingTime).getTime() : 0
    return ta - tb
  })
  const totalPages = Math.max(1, Math.ceil(sortedTrainings.length / PAGE_SIZE))
  const [listPage, setListPage] = useState(1)
  const computeTodayPage = () => {
    if (!sortedTrainings.length) return 1
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0)
    let idx = sortedTrainings.findIndex(t => {
      if (!t.trainingTime) return false
      const dt = new Date(t.trainingTime)
      return !isNaN(dt.getTime()) && dt.getTime() >= todayMidnight.getTime()
    })
    if (idx === -1) idx = sortedTrainings.length - 1
    return Math.floor(idx / PAGE_SIZE) + 1
  }
  // Determine default page focusing on first training today or upcoming when autoScrollTodayInList enabled
  useEffect(()=>{
    if (viewMode !== 'list') return
    if (!autoScrollTodayInList) return
    setListPage(computeTodayPage())
  }, [viewMode, autoScrollTodayInList, trainings])
  const pagedTrainings = sortedTrainings.slice((listPage-1)*PAGE_SIZE, listPage*PAGE_SIZE)

  return (
  <Box className="ti-calendar-wrapper" sx={{ '--ti-scrollbar-reserve': 'var(--ti-scrollbar-width,0px)' }}>
      {viewMode === 'calendar' && (
        <Box sx={{ display:'flex', justifyContent:'flex-end', alignItems:'center', mb:1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" variant="outlined" onClick={()=> changeCalView(calView==='timeGridWeek' ? 'dayGridMonth' : 'timeGridWeek')}>View: {calView==='timeGridWeek' ? 'Week view' : 'Month view'}</Button>
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
            const hasResponse = false // response dot removed (stripe conveys presence); keep var for potential future use
            const training = arg.event.extendedProps.training
            // Compute start / end times for stacked display in timeGrid view
            let startTimeLabel = ''
            let endTimeLabel = ''
            try {
              if (!arg.event.allDay && arg.event.start){
                startTimeLabel = new Date(arg.event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
              if (!arg.event.allDay && arg.event.end){
                endTimeLabel = new Date(arg.event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            } catch(e){}
            const isTimeGrid = arg.view.type === 'timeGridWeek' || arg.view.type === 'timeGridDay'
            const timeSection = isTimeGrid
              ? (startTimeLabel ? `<div style=\"font-size:0.7rem;line-height:1;color:${textSecondary};\">${startTimeLabel}${endTimeLabel?` – ${endTimeLabel}`:''}</div>` : '')
              : (startTimeLabel ? `<span style=\"margin-right:6px;color:${textSecondary};font-size:0.75rem;\">${startTimeLabel}${endTimeLabel?` – ${endTimeLabel}`:''}</span>` : '')
            const color = trainingPrimaryColor(training)
            const groupsArr = (training?.groups||[])
            const visibleGroups = groupsArr.slice(0,3)
            const hiddenCount = groupsArr.length > 3 ? groupsArr.length - 3 : 0
            const groupDots = visibleGroups.map(g => `<span aria-label=\"group ${g.name}\" role=\"img\" style=\"display:inline-block;width:6px;height:6px;border-radius:50%;background:${colorForGroupId(g.id)};margin-left:4px;flex-shrink:0;\"></span>`).join('') + (hiddenCount ? `<span style=\"margin-left:4px;font-size:10px;color:${textSecondary};flex-shrink:0;\" aria-label=\"+${hiddenCount} more groups\">+${hiddenCount}</span>` : '')
            // Recurrence indicator
            let recurHtml = ''
            try {
              if (training?.seriesId) {
                const recurColor = textSecondary
                const detached = training?.detached
                const title = detached ? 'Edited occurrence (detached from series)' : 'Recurring training'
                recurHtml = `<span aria-label=\"${title}\" title=\"${title}\" style=\"margin-left:4px;font-size:10px;line-height:1;display:inline-flex;align-items:center;color:${recurColor};\">↻${detached?'<sup style=\\"font-size:7px;margin-left:1px;color:#d32f2f;\\">×</sup>':''}</span>`
              }
            } catch(e){}
            // Lightened background to avoid harsh contrast when title text is colored
            // Derive a subtle translucent background using the base color
            // Presence-based stripe: green present, red absent, else group color or none
            // Presence stripe logic for athletes (Boolean myPresence): true=green, false=red, null/undefined=grey
            const presenceVal = training?.myPresence
            let stripe = '#9e9e9e' // grey default
            if (presenceVal === true) stripe = '#2e7d32'
            else if (presenceVal === false) stripe = '#d32f2f'
            const neutralBg = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
            const borderColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
            const stripeWidth = 4
            const pad = '0 4px'
            const leftBorder = `border-left:${stripeWidth}px solid ${stripe};`
            // Determine event duration to decide if we force full-height (long events) or allow shrink (short events)
            let durationMs = 0
            try {
              const s = arg.event.start?.getTime?.() || 0
              const e = arg.event.end?.getTime?.() || s
              durationMs = Math.max(0, e - s)
            } catch(e){}
            // Always paint full background area in timeGrid so the colored card fills the slot, but
            // only stretch inner flex for longer events. For very short events we keep inner auto height
            // so content doesn't look vertically stretched while background still fills.
            const isLong = isTimeGrid && durationMs >= LONG_EVENT_MS
            const outerHeight = isTimeGrid ? 'height:100%;' : 'height:auto;'
            const contentStretch = isLong ? 'height:100%;' : 'height:auto;'
            // Outer spacing (visual breathing room) while still letting colored card cover the formal event box.
            const gap = '1px' // tweakable
            const outerPad = `padding:${gap};`
            // Move border/background/stripe to outer so it fills slot; inner just handles layout.
            // For short events, limit visible vertical content. We'll allow time line + single title line.
            const clipStyles = !isLong && isTimeGrid ? 'overflow:hidden;' : ''
            return {
              html: `<div style=\"display:block;position:relative;width:100%;${outerHeight}${outerPad}box-sizing:border-box;\"><div style=\"display:flex;flex-direction:column;justify-content:flex-start;gap:2px;${contentStretch}${clipStyles}padding:${pad};background:${neutralBg};border:1px solid ${borderColor};${leftBorder}border-radius:4px;box-sizing:border-box;width:100%;height:100%;\">${timeSection}<div style=\"flex:0 0 auto;display:flex;align-items:center;min-width:0;\"><span style=\"white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\"><span style=\"color:inherit;font-weight:600;letter-spacing:.25px;\">${arg.event.title}</span></span>${recurHtml}<div style=\"display:flex;align-items:center;margin-left:4px;\">${groupDots}</div></div></div></div>`
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
        <Stack spacing={1} id="ti-trainings-list">
          {totalPages > 1 && (
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Button size="small" onClick={()=> setListPage(computeTodayPage())}>Today</Button>
              <Pagination size="small" page={listPage} count={totalPages} onChange={(e,p)=> setListPage(p)} />
            </Box>
          )}
          {pagedTrainings.map(t => {
            const presenceVal = t?.myPresence
            const stripeColor = presenceVal === true ? '#2e7d32' : (presenceVal === false ? '#d32f2f' : '#9e9e9e')
            return (
            <Paper key={t.id} data-training-time={t.trainingTime || ''} sx={{ p:2, display:'flex', justifyContent:'space-between', alignItems:'center', scrollMarginTop: '72px', borderLeft:'4px solid', borderLeftColor: stripeColor }}>
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
            )})}
          {totalPages > 1 && (
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Button size="small" onClick={()=> setListPage(computeTodayPage())}>Today</Button>
              <Pagination size="small" page={listPage} count={totalPages} onChange={(e,p)=> setListPage(p)} />
            </Box>
          )}
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

// Auto-scroll effect (placed after component to avoid reordering primary logic) - but needs hooks: so we keep inside component above? Alternative: integrate inside component.
