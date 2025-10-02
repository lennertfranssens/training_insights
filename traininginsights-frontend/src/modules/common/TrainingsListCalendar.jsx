import React, { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Stack, Paper, Typography, Button } from '@mui/material'

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
  renderItemContent // (training) => JSX content shown in the item's main column (optional)
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

  return (
    <div>
      {viewMode === 'calendar' ? (
        <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" height="auto" initialDate={initialDate}
          events={(trainings||[]).map(t => ({ id: t.id, title: t.title, start: t.trainingTime }))}
          eventContent={(arg)=>{
            // arg.event.id corresponds to training id
            const tId = String(arg.event.id)
            const hasResponse = (filledResponses||[]).some(r => String(r.training?.id) === tId || String(r.trainingId) === tId)
            // compute time label (skip for all-day events)
            let timeLabel = ''
            try{
              if (!arg.event.allDay && arg.event.start){
                timeLabel = new Date(arg.event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            }catch(e){}
            const timeHtml = timeLabel ? `<span style=\"margin-right:8px;color:#666;font-size:0.9em;\">${timeLabel}</span>` : ''
            return {
              html: `<div style="display:flex;align-items:center;justify-content:space-between;width:100%"><div style=\"flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">${timeHtml}${arg.event.title}</div>${hasResponse ? '<div style=\"width:8px;height:8px;background:#1976d2;border-radius:50%;margin-left:6px;\"></div>' : ''}</div>`
            }
          }}
          eventDidMount={(info)=>{
            try { info.el.style.cursor = 'pointer' } catch(e){}
          }}
          dateClick={(info)=>{ try { onDateClick && onDateClick(info.dateStr || info.date); } catch(e){} }}
          eventClick={(info)=>{ try { onEventClick && onEventClick(String(info.event.id), trainings.find(x=>String(x.id)===String(info.event.id))) } catch(e){} }}
        />
        ) : (
        <Stack spacing={1}>
          {(trainings||[]).map(t => (
            <Paper key={t.id} sx={{ p:2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                {renderItemContent ? renderItemContent(t) : (
                  <>
                    <Typography>{t.title}</Typography>
                    <Typography variant="body2">{new Date(t.trainingTime).toLocaleString()}</Typography>
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
    </div>
  )
}
