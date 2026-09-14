import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Apple } from 'lucide-react'
import { AuthApi, setToken, getToken } from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'loading' | 'login' | 'setup'>('loading')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // 已登录直接跳首页
    if (getToken()) {
      navigate('/', { replace: true })
      return
    }
    // 检查系统是否已初始化
    AuthApi.status()
      .then((s) => setMode(s.initialized ? 'login' : 'setup'))
      .catch(() => setMode('login'))
  }, [navigate])

  const submit = async () => {
    setError('')
    if (!username.trim()) return setError('请输入用户名')
    if (!password) return setError('请输入密码')

    if (mode === 'setup') {
      if (password.length < 6) return setError('密码至少 6 位')
      if (password !== confirm) return setError('两次密码不一致')
    }

    setSubmitting(true)
    try {
      const res =
        mode === 'setup'
          ? await AuthApi.setup(username.trim(), password)
          : await AuthApi.login(username.trim(), password)
      setToken(res.access_token)
      navigate('/', { replace: true })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  const isSetup = mode === 'setup'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-white mb-3">
            <Apple size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">果园管理 Agent</h1>
          <p className="text-xs text-slate-500 mt-1">{isSetup ? '首次初始化管理员账号' : '运营助手'}</p>
        </div>

        {/* 表单 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          {isSetup && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              系统尚未初始化。请创建一个管理员账号，之后可以为甲方/管理层分配只读账号。
            </div>
          )}

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-slate-600">用户名</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="admin"
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder={isSetup ? '至少 6 位' : '请输入密码'}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            </label>
            {isSetup && (
              <label className="block">
                <span className="text-xs text-slate-600">确认密码</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                />
              </label>
            )}
          </div>

          {error && <div className="mt-3 text-xs text-red-500">{error}</div>}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full mt-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                {isSetup ? '创建中...' : '登录中...'}
              </span>
            ) : isSetup ? (
              '创建管理员'
            ) : (
              '登录'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
