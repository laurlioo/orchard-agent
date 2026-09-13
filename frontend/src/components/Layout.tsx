import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  Apple,
  Wallet,
  FileBarChart,
  AlertTriangle,
  MessageCircle,
  X,
} from 'lucide-react'
import ChatPanel from './ChatPanel'

const NAV = [
  { to: '/workers', label: '工人管理', icon: Users },
  { to: '/worklogs', label: '每日工时', icon: ClipboardList },
  { to: '/production', label: '每日产量', icon: Apple },
  { to: '/wages', label: '工资查询', icon: Wallet },
  { to: '/reports', label: '报表中心', icon: FileBarChart },
  { to: '/issues', label: '问题工单', icon: AlertTriangle },
]

export default function Layout() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="flex h-full">
      {/* 侧边栏 */}
      <aside className="w-56 bg-slate-800 text-slate-100 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-700">
          <h1 className="text-lg font-bold">果园 Agent</h1>
          <p className="text-xs text-slate-400 mt-0.5">运营助手</p>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-700 transition ${
                  isActive ? 'bg-slate-700 border-l-4 border-emerald-400' : 'border-l-4 border-transparent'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* 浮动聊天按钮 */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition"
          title="打开 Agent 对话"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-500 text-white rounded-t-lg">
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
    </div>
  )
}
