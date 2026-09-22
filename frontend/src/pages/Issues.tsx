import { useEffect, useState } from 'react'
import { Plus, Reply } from 'lucide-react'
import { IssuesApi, isAdmin, type Issue } from '../api/client'

export default function Issues() {
  const admin = isAdmin()
  const [list, setList] = useState<Issue[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Partial<Issue>>({
    reporter_name: '',
    reporter_role: '果农',
    category: '种植养护',
    content: '',
  })
  const [replying, setReplying] = useState<Issue | null>(null)
  const [reply, setReply] = useState('')

  const load = async () => {
    try {
      setList(
        await IssuesApi.list(statusFilter ? { status: statusFilter } : {}),
      )
    } catch (e: any) {
      alert(e.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const submit = async () => {
    if (!form.reporter_name || !form.content) return alert('上报人和描述必填')
    try {
      await IssuesApi.create(form as any)
      setAdding(false)
      setForm({ reporter_name: '', reporter_role: '果农', category: '种植养护', content: '' })
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const closeIssue = async (i: Issue, newReply: string) => {
    try {
      await IssuesApi.update(i.id, { status: 'closed', reply: newReply || i.reply })
      setReplying(null)
      setReply('')
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg md:text-xl font-bold">问题工单</h1>
        <div className="flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-sm"
          >
            <option value="">全部</option>
            <option value="open">待处理</option>
            <option value="closed">已关闭</option>
          </select>
          {admin && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600"
            >
              <Plus size={16} /> 上报问题
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-white rounded-lg border border-slate-200">
            暂无工单
          </div>
        ) : (
          list.map((i) => (
            <div key={i.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{i.reporter_name}</span>
                    <span className="text-xs text-slate-500">{i.reporter_role}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{i.category}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        i.status === 'open'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {i.status === 'open' ? '待处理' : '已关闭'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{i.created_at}</div>
                </div>
                {admin && i.status === 'open' && (
                  <button
                    onClick={() => {
                      setReplying(i)
                      setReply(i.reply)
                    }}
                    className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    <Reply size={14} /> 处理
                  </button>
                )}
              </div>
              <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{i.content}</div>
              {i.reply && (
                <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-600 border-l-2 border-emerald-400">
                  <div className="text-xs text-slate-400 mb-1">回复：</div>
                  {i.reply}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 px-4" onClick={() => setAdding(false)}>
          <div className="bg-white p-5 rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-4">上报问题</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">上报人</span>
                <input
                  value={form.reporter_name || ''}
                  onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">角色</span>
                <select
                  value={form.reporter_role}
                  onChange={(e) => setForm({ ...form, reporter_role: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                >
                  <option>果农</option>
                  <option>管理层</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">分类</span>
                <input
                  value={form.category || ''}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">问题描述</span>
                <textarea
                  value={form.content || ''}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setAdding(false)} className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm">
                取消
              </button>
              <button onClick={submit} className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded text-sm">
                提交
              </button>
            </div>
          </div>
        </div>
      )}

      {replying && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 px-4" onClick={() => setReplying(null)}>
          <div className="bg-white p-5 rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-2">处理工单 #{replying.id}</h2>
            <p className="text-sm text-slate-600 mb-3">{replying.content}</p>
            <label className="block text-sm">
              <span className="text-slate-600">回复内容</span>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                placeholder="处理方案、采取的措施..."
              />
            </label>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setReplying(null)} className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm">
                取消
              </button>
              <button
                onClick={() => closeIssue(replying, reply)}
                className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded text-sm"
              >
                关闭工单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
