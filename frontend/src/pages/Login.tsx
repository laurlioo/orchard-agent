import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Apple, Shield, User } from 'lucide-react'
import { AuthApi, setSession, getToken, homePath } from '../api/client'

type LoginKind = 'admin' | 'worker'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'loading' | 'login' | 'setup'>('loading')
  const [kind, setKind] = useState<LoginKind>('admin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [workerPhone, setWorkerPhone] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [setupRequiresToken, setSetupRequiresToken] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (getToken()) {
      navigate(homePath(), { replace: true })
      return
    }
    AuthApi.status()
      .then((s) => {
        setMode(s.initialized ? 'login' : 'setup')
        setSetupRequiresToken(Boolean(s.setup_token_required))
      })
      .catch(() => setMode('login'))
  }, [navigate])

  const goHome = (role: string) => {
    navigate(role === 'worker' ? '/me' : '/worklogs', { replace: true })
  }

  const submit = async () => {
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'setup') {
        if (!username.trim()) return setError('请输入用户名')
        if (!password) return setError('请输入密码')
        if (password.length < 6) return setError('密码至少 6 位')
        if (password !== confirm) return setError('两次密码不一致')
        if (setupRequiresToken && !setupToken.trim()) return setError('请输入初始化密钥')
        const res = await AuthApi.setup(username.trim(), password, setupToken.trim())
        setSession(res.access_token, res.role, res.username)
        goHome(res.role)
        return
      }
      if (kind === 'worker') {
        if (!workerName.trim()) return setError('请输入姓名')
        if (!workerPhone.trim()) return setError('请输入登记手机号')
        const res = await AuthApi.workerLogin(workerName.trim(), workerPhone.trim())
        setSession(res.access_token, res.role, res.username)
        goHome(res.role)
        return
      }
      if (!username.trim()) return setError('请输入用户名')
      if (!password) return setError('请输入密码')
      const res = await AuthApi.login(username.trim(), password)
      setSession(res.access_token, res.role, res.username)
      goHome(res.role)
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-white mb-3">
            <Apple size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">果园管理 Agent</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSetup ? '首次初始化管理员账号' : '请选择登录方式'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          {isSetup && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              系统尚未初始化。请先创建管理员账号，之后工人可用档案姓名查询自己的工时工资。
            </div>
          )}

          {!isSetup && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setKind('admin')
                  setError('')
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm ${
                  kind === 'admin'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Shield size={18} />
                管理员登录
                <span className="text-[10px] text-slate-500">可修改全部数据</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setKind('worker')
                  setError('')
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm ${
                  kind === 'worker'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <User size={18} />
                工人查询
                <span className="text-[10px] text-slate-500">用姓名看工时工资</span>
              </button>
            </div>
          )}

          <div className="space-y-3">
            {isSetup || kind === 'admin' ? (
              <>
                <label className="block">
                  <span className="text-xs text-slate-600">管理员用户名</span>
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
                {isSetup && setupRequiresToken && (
                  <label className="block">
                    <span className="text-xs text-slate-600">初始化密钥</span>
                    <input
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submit()}
                      placeholder="由部署环境 SETUP_TOKEN 提供"
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-xs text-slate-600">姓名（与工人档案一致）</span>
                  <input
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="例如：张三"
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-600">登记手机号（身份校验）</span>
                  <input
                    value={workerPhone}
                    onChange={(e) => setWorkerPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="与工人档案登记的手机号一致"
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  登录后可查看自己的每日、每月工时和工资，不能修改数据。
                </p>
              </>
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
            ) : kind === 'worker' ? (
              '查询我的工时工资'
            ) : (
              '管理员登录'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
