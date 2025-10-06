import { useCallback, useEffect, useState } from 'react'
import api from '../../api/client'

// Manages attachments: fetch max cap, validate per-file & combined, expose helpers.
export function useAttachmentManager(initialMaxMb){
  const [maxMb, setMaxMb] = useState(typeof initialMaxMb === 'number' ? initialMaxMb : 25)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])

  // Fetch config once (unless caller passes explicit initialMaxMb to skip)
  useEffect(()=>{
    if (typeof initialMaxMb === 'number') return
    let active = true
    async function load(){
      try{
        const r = await api.get('/api/config')
        if (!active) return
        if (r.data?.attachments && typeof r.data.attachments.maxMb === 'number') setMaxMb(r.data.attachments.maxMb)
      }catch(e){
        try{ const r2 = await api.get('/api/config/attachments'); if (active && typeof r2.data?.maxMb === 'number') setMaxMb(r2.data.maxMb) }catch(_){ }
      }
    }
    load(); return ()=>{ active = false }
  }, [initialMaxMb])

  const validate = useCallback((list)=>{
    const capBytes = maxMb * 1024 * 1024
    let total = 0
    const errs = []
    for (const f of list){
      total += f.size
      if (f.size > capBytes) errs.push(`${f.name} exceeds ${maxMb}MB per-file limit`)
    }
    if (total > capBytes) errs.push(`Combined attachments exceed ${maxMb}MB total cap`)
    return { errs, total }
  }, [maxMb])

  const addFiles = useCallback((input)=>{
    const incoming = Array.from(input || [])
    const all = [...files, ...incoming]
    const { errs } = validate(all)
    if (errs.length){ setErrors(errs); return false }
    setFiles(all); setErrors([]); return true
  }, [files, validate])

  const removeFile = useCallback((idx)=>{
    setFiles(prev=>{
      const copy = [...prev]; copy.splice(idx,1)
      const { errs } = validate(copy)
      setErrors(errs)
      return copy
    })
  }, [validate])

  const reset = useCallback(()=>{ setFiles([]); setErrors([]) }, [])

  const { total: totalBytes } = validate(files)
  const percent = Math.min(100, (totalBytes / (maxMb * 1024 * 1024)) * 100)

  return { maxMb, files, errors, totalBytes, percent, addFiles, removeFile, reset }
}
export default useAttachmentManager
