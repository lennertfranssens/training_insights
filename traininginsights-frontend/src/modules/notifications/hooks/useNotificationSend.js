import { useCallback, useRef } from 'react'
import api from '../../api/client'

// Builds a rich summary similar to the pages implementation
function buildSummary(results, channel){
  try {
    const total = results.length
    const emailAttempted = results.filter(r=>r.emailAttempted).length
    const emailSent = results.filter(r=>r.emailSent).length
    const pushDispatched = results.filter(r=>r.dispatched).length
    const errors = results.filter(r=>r.error)
    let msg = `Sent to ${total} user${total!==1?'s':''}`
    if (channel !== 'notification') {
      msg += ` | email attempted: ${emailAttempted}`
      msg += `, email sent: ${emailSent}`
    }
    msg += ` | push dispatch: ${pushDispatched}`
    if (errors.length) msg += ` | errors: ${errors.length}`
    return msg
  } catch(e){ return 'Notifications dispatched' }
}

// Hook deciding strategy based on presence of attachments & mode
// modes: 'single' (direct URL), 'clubs', 'groups'
export function useNotificationSend(){
  const abortControllersRef = useRef(new Set())
  const cancelRequestedRef = useRef(false)

  const cancel = useCallback(()=>{
    cancelRequestedRef.current = true
    for (const c of abortControllersRef.current){
      try { c.abort() } catch(e){}
    }
    abortControllersRef.current.clear()
  }, [])

  const send = useCallback(async ({ mode, ids, singleUrl, title, body, channel, attachments, onProgress }) => {
    const hasFiles = attachments && attachments.length > 0
    try {
      cancelRequestedRef.current = false
      abortControllersRef.current.clear()
      if (mode === 'single') {
  if (hasFiles){
          const fd = new FormData(); fd.append('title', title); fd.append('body', body); if (channel) fd.append('channel', channel)
          attachments.forEach(f=>fd.append('files', f, f.name))
          const controller = new AbortController(); abortControllersRef.current.add(controller)
          const { data } = await api.post(singleUrl, fd, { headers:{ 'Content-Type':'multipart/form-data' }, signal: controller.signal })
          abortControllersRef.current.delete(controller)
          window.dispatchEvent(new Event('notifications-updated'))
          return { results: Array.isArray(data)?data:[], error: null }
        } else {
          const controller = new AbortController(); abortControllersRef.current.add(controller)
          const { data } = await api.post(singleUrl, { title, body, channel }, { signal: controller.signal })
          abortControllersRef.current.delete(controller)
          window.dispatchEvent(new Event('notifications-updated'))
          return { results: Array.isArray(data)?data:[], error: null }
        }
      }
      // batch modes
      if (mode === 'clubs' || mode === 'groups') {
        if (!ids || ids.length === 0) return { results: [], error: 'No target ids' }
        if (hasFiles){
          // limited concurrency multipart via per-target endpoints
          const aggregated = []
          const targetErrors = []
          const concurrency = 3
          const queue = [...ids]
          let completed = 0
          if (typeof onProgress === 'function') {
            try { onProgress({ completed, total: ids.length }) } catch(_){ }
          }
          const worker = async () => {
            while(queue.length){
              if (cancelRequestedRef.current) break
              const id = queue.shift()
              try {
                const fd = new FormData(); fd.append('title', title); fd.append('body', body); if (channel) fd.append('channel', channel)
                attachments.forEach(f=>fd.append('files', f, f.name))
                const url = mode === 'clubs' ? `/api/notifications/club/${id}/send` : `/api/notifications/group/${id}/send`
                const controller = new AbortController(); abortControllersRef.current.add(controller)
                const { data } = await api.post(url, fd, { headers:{ 'Content-Type':'multipart/form-data' }, signal: controller.signal })
                abortControllersRef.current.delete(controller)
                if (Array.isArray(data)) aggregated.push(...data)
              } catch(err){ 
                // capture error per target
                targetErrors.push({ id, message: err.response?.data?.message || err.message || String(err) })
              }
              finally {
                completed += 1
                if (typeof onProgress === 'function') {
                  try { onProgress({ completed, total: ids.length }) } catch(_){}
                }
              }
            }
          }
          // launch workers
          const workers = Array.from({ length: Math.min(concurrency, ids.length) }, ()=>worker())
          await Promise.all(workers)
          window.dispatchEvent(new Event('notifications-updated'))
          const cancelled = cancelRequestedRef.current
          const partial = cancelled && completed < ids.length
          const succeededIds = new Set(aggregated.map(r=>r.userId)) // assuming result objects contain userId
          const failedTargets = targetErrors.map(e=>e.id)
          const remainingTargets = cancelled ? queue.concat([]) : []
          return { results: aggregated, error: null, cancelled, partial, completedTargets: completed, totalTargets: ids.length, targetErrors, failedTargets, remainingTargets }
        } else {
          const endpoint = mode === 'clubs' ? '/api/notifications/batch/club/send' : '/api/notifications/batch/group/send'
          if (typeof onProgress === 'function') {
            try { onProgress({ completed: 0, total: ids.length }) } catch(_){ }
          }
          const controller = new AbortController(); abortControllersRef.current.add(controller)
          const { data } = await api.post(endpoint, { ids, title, body, channel }, { signal: controller.signal })
          abortControllersRef.current.delete(controller)
          if (typeof onProgress === 'function') {
            try { onProgress({ completed: ids.length, total: ids.length }) } catch(_){ }
          }
          window.dispatchEvent(new Event('notifications-updated'))
          return { results: data, error: null, cancelled: false, partial: false, completedTargets: ids.length, totalTargets: ids.length }
        }
      }
      return { results: [], error: 'Unsupported mode' }
    } catch(e){
      const cancelled = cancelRequestedRef.current
      if (cancelled) return { results: [], error: null, cancelled: true, partial: true }
      return { results: [], error: e.response?.data?.message || e.message || String(e), cancelled: false }
    }
  }, [])

  return { send, buildSummary, cancel }
}
export default useNotificationSend
