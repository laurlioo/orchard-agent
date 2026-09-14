import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../api/client'

/** 路由守卫：只要 localStorage 有 token 就放行，
 *  401 由 axios 拦截器统一处理（自动跳 /login）。
 *  不在启动时调 /auth/me，避免 Render 冷启动时卡住。
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
