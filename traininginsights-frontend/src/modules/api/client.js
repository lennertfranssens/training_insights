import axios from 'axios'

// Single source of truth for the API base (defaults to '' so calls like '/api/...' work in dev)
// Set VITE_API_BASE in your env if you need a different base (for example when deploying behind a proxy).
const API_BASE = import.meta.env.VITE_API_BASE || ''

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use(config => {
  const auth = JSON.parse(localStorage.getItem('ti_auth') || '{}')
  if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('ti_auth')
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
export { API_BASE }