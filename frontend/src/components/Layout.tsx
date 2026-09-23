import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  Apple,
  Wallet,
  FileBarChart,
  AlertTriangle,
  MessageCircle,
  X,
  Menu,
  LogOut,
} from 'lucide-react'
import ChatPanel from './ChatPanel'
import { clearToken, getRole, getUsername, isWorker } from '../api/client'

const STAFF_NAV = [
  { to: '/workers', label: '工人管理', icon: Users },
  { to: '/worklogs', label: '每日工时', icon: ClipboardList },
  { to: '/production', label: '每日产量', icon: Apple },
  { to: '/wages', label: '工资查询', icon: Wallet },
  { to: '/reports', label: '报表中心', icon: FileBarChart },
  { to: '/issues', label: '问题工单', icon: AlertTriangle },
]

const WORKER_NAV = [{ to: '/me', label: '我的工时工资', icon: Wallet }]

export default function Layout() {
  const [chatOpen, setChatOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const worker = isWorker()

  const logout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="h-full flex">
      {/* 桌面侧边栏 */}
      <aside className="hidden md:flex w-56 bg-emerald-900 text-slate-100 flex-col">
        <SidebarContent onNavigate={() => {}} onLogout={logout} />
      </aside>

      {/* 移动端抽屉 */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-emerald-900 text-slate-100 z-50 flex flex-col animate-[slidein_0.2s_ease-out]">
            <SidebarContent
              onNavigate={() => setMenuOpen(false)}
              onLogout={logout}
              showClose
              onClose={() => setMenuOpen(false)}
            />
          </aside>
        </>
      )}

      {/* 主内容 */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* 移动端顶栏 */}
        <header className="md:hidden flex items-center justify-between px-3 py-2.5 bg-emerald-900 text-white sticky top-0 z-30">
          <button onClick={() => setMenuOpen(true)} className="p-1">
            <Menu size={22} />
          </button>
          <span className="text-sm font-medium">{worker ? '我的工时工资' : '果园 Agent'}</span>
          <button onClick={logout} className="p-1">
            <LogOut size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* 浮动聊天按钮：仅管理人员可见 */}
      {!worker && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 w-12 h-12 md:w-14 md:h-14 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg flex items-center justify-center transition z-30"
          title="打开 Agent 对话"
        >
          <MessageCircle size={22} />
        </button>
      )}

      {!worker && chatOpen && (
        <div className="fixed bottom-0 right-0 left-0 md:bottom-6 md:right-6 md:left-auto md:w-96 h-[70vh] md:h-[32rem] bg-white shadow-2xl border border-slate-200 flex flex-col z-50 rounded-t-lg md:rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-700 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="font-medium">Agent 助手</span>
            </div>
            <button onClick={() => setChatOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <ChatPanel />
        </div>
      )}

      <style>{`
        @keyframes slidein {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

function SidebarContent({
  onNavigate,
  onLogout,
  showClose = false,
  onClose,
}: {
  onNavigate: () => void
  onLogout: () => void
  showClose?: boolean
  onClose?: () => void
}) {
  return (
    <>
      <div className="px-4 py-5 border-b border-emerald-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">果园 Agent</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {getUsername() || '运营助手'} ·{' '}
            {getRole() === 'admin' ? '管理员' : getRole() === 'worker' ? '工人' : '只读'}
          </p>
        </div>
        {showClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>
      <nav className="flex-1 py-3">
        {(isWorker() ? WORKER_NAV : STAFF_NAV).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-emerald-800 transition ${
                isActive ? 'bg-emerald-800 border-l-4 border-emerald-400' : 'border-l-4 border-transparent'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={onLogout}
        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-emerald-800 border-t border-emerald-800"
      >
        <LogOut size={18} />
        退出登录
      </button>
    </>
  )
}
