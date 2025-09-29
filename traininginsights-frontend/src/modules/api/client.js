import axios from 'axios'

// Single source of truth for the API base (defaults to '/api' for nginx proxy)
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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