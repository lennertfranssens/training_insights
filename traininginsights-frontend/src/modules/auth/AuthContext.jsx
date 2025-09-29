import React, { createContext, useContext, useState } from 'react'
import api from '../api/client'
const AuthContext = createContext(null)
export function AuthProvider({ children }){
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('ti_auth') || 'null'))
  const signin = async (email, password) => {
    const res = await api.post('/api/auth/signin', { email, password })
    const data = res.data
    const payload = { token: data.token, roles: data.roles, email: data.email, userId: data.userId }
    setAuth(payload); localStorage.setItem('ti_auth', JSON.stringify(payload)); return payload
  }
  const signup = async (payload) => {
    const res = await api.post('/api/auth/signup', payload)
    const data = res.data
    const authData = { token: data.token, roles: data.roles, email: data.email, userId: data.userId }
    setAuth(authData); localStorage.setItem('ti_auth', JSON.stringify(authData)); return authData
  }
  const signout = () => { setAuth(null); localStorage.removeItem('ti_auth') }
  return <AuthContext.Provider value={{ auth, signin, signup, signout }}>{children}</AuthContext.Provider>
}
export function useAuth(){ return useContext(AuthContext) }
