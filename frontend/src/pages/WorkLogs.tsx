import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { WorkLogsApi, WorkersApi, type WorkLog, type Worker } from '../api/client'

export default function WorkLogs() {
  const [list, setList] = useState<WorkLog[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Partial<WorkLog>>({ worker_id: 0, hours: 8, task_desc: '' })

  const load = async () => {
    try {
      setList(await WorkLogsApi.list({ start: date, end: date }))
    } catch (e: any) {
      alert(e.message)
    }
  }

  useEffect(() => {
    WorkersApi.list(true).then(setWorkers)
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const submit = async () => {
    if (!form.worker_id) return alert('请选择工人')
    if (!form.hours || form.hours <= 0) return alert('工时必须大于 0')
    try {
      await WorkLogsApi.create({ ...form, date } as any)
      setAdding(false)
      setForm({ worker_id: 0, hours: 8, task_desc: '' })
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h1 className="text-lg md:text-xl font-bold">每日工时</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-sm"
          />
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600"
          >
            <Plus size={16} /> 录入
          </button>
        </div>
      </div>

      {/* 桌面：表格 */}
      <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">工人</th>
              <th className="px-4 py-2 text-left">岗位</th>
              <th className="px-4 py-2 text-left">工时 (h)</th>
              <th className="px-4 py-2 text-left">任务描述</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">该日暂无工时记录</td>
              </tr>
            ) : (
              list.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{l.worker?.name ?? `#${l.worker_id}`}</td>
                  <td className="px-4 py-2 text-slate-600">{l.worker?.role ?? '-'}</td>
                  <td className="px-4 py-2">{l.hours}</td>
                  <td className="px-4 py-2 text-slate-600">{l.task_desc || '-'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={async () => {
                        if (confirm('删除这条记录?')) {
                          await WorkLogsApi.remove(l.id)
                          load()
                        }
                      }}
                      className="text-slate-500 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端：卡片 */}
      <div className="md:hidden space-y-2">
        {list.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">该日暂无工时记录</div>
        ) : (
          list.map((l) => (
            <div key={l.id} className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{l.worker?.name ?? `#${l.worker_id}`}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {l.worker?.role ?? '-'} · {l.hours}h
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('删除这条记录?')) {
                      await WorkLogsApi.remove(l.id)
                      load()
                    }
                  }}
                  className="text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {l.task_desc && (
                <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
                  {l.task_desc}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 px-4" onClick={() => setAdding(false)}>
          <div className="bg-white p-5 rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-4">录入工时 ({date})</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">工人</span>
                <select
                  value={form.worker_id}
                  onChange={(e) => setForm({ ...form, worker_id: parseInt(e.target.value) })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                >
                  <option value={0}>请选择</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} - {w.role} - ¥{w.hourly_rate}/h
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">工时 (小时)</span>
                <input
                  type="number"
                  step="0.5"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">任务描述</span>
                <input
                  value={form.task_desc || ''}
                  onChange={(e) => setForm({ ...form, task_desc: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                  placeholder="如：苹果采摘、分拣、养护..."
                />
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setAdding(false)} className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm">
                取消
              </button>
              <button onClick={submit} className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded text-sm">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
