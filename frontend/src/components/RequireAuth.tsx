import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken, AuthApi } from '../api/client'

/** 路由守卫：未登录跳 /login，已登录放行。 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'fail'>('checking')
  const token = getToken()

  useEffect(() => {
    if (!token) {
      setState('fail')
      return
    }
    // 校验 token 是否有效
    AuthApi.me()
      .then(() => setState('ok'))
      .catch(() => setState('fail'))
  }, [token])

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">验证中...</div>
      </div>
    )
  }
  if (state === 'fail') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
