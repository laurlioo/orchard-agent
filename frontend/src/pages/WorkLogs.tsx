import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  WorkLogsApi,
  WorkersApi,
  isAdmin,
  localDateISO,
  type WorkLog,
  type Worker,
} from '../api/client'

const emptyForm = { worker_id: 0, hours: 8, overtime_hours: 0, task_desc: '' }

export default function WorkLogs() {
  const admin = isAdmin()
  const [list, setList] = useState<WorkLog[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [date, setDate] = useState(localDateISO())
  const [editing, setEditing] = useState<Partial<WorkLog> | null>(null)

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

  const openCreate = () => setEditing({ ...emptyForm, date })

  const openEdit = (l: WorkLog) =>
    setEditing({
      id: l.id,
      worker_id: l.worker_id,
      date: l.date,
      hours: l.hours,
      overtime_hours: l.overtime_hours,
      task_desc: l.task_desc,
    })

  const submit = async () => {
    if (!editing) return
    if (!editing.worker_id) return alert('请选择工人')
    const totalHours = (editing.hours || 0) + (editing.overtime_hours || 0)
    if (totalHours <= 0) return alert('正常工时和加班工时不能都为 0')
    try {
      if (editing.id) {
        await WorkLogsApi.update(editing.id, {
          hours: editing.hours,
          overtime_hours: editing.overtime_hours,
          task_desc: editing.task_desc,
        })
      } else {
        const dup = list.find((l) => l.worker_id === editing.worker_id)
        if (dup) {
          if (!confirm('该工人当日已有工时，是否改为编辑原记录？')) return
          await WorkLogsApi.update(dup.id, {
            hours: editing.hours,
            overtime_hours: editing.overtime_hours,
            task_desc: editing.task_desc,
          })
        } else {
          await WorkLogsApi.create({ ...editing, date } as WorkLog)
        }
      }
      setEditing(null)
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const remove = async (l: WorkLog) => {
    if (!confirm('删除这条记录?')) return
    try {
      await WorkLogsApi.remove(l.id)
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
          {admin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-800"
            >
              <Plus size={16} /> 录入
            </button>
          )}
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">工人</th>
              <th className="px-4 py-2 text-left">岗位</th>
              <th className="px-4 py-2 text-left">正常工时</th>
              <th className="px-4 py-2 text-left">加班工时</th>
              <th className="px-4 py-2 text-left">任务描述</th>
              {admin && <th className="px-4 py-2 text-left">操作</th>}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={admin ? 6 : 5} className="text-center py-6 text-slate-400">
                  该日暂无工时记录
                </td>
              </tr>
            ) : (
              list.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{l.worker?.name ?? `#${l.worker_id}`}</td>
                  <td className="px-4 py-2 text-slate-600">{l.worker?.role ?? '-'}</td>
                  <td className="px-4 py-2">{l.hours}h</td>
                  <td className="px-4 py-2">
                    {l.overtime_hours > 0 ? (
                      <span className="text-amber-600">{l.overtime_hours}h</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{l.task_desc || '-'}</td>
                  {admin && (
                    <td className="px-4 py-2 flex gap-2">
                      <button onClick={() => openEdit(l)} className="text-slate-500 hover:text-emerald-600">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(l)} className="text-slate-500 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                    {l.worker?.role ?? '-'} · 正常 {l.hours}h
                    {l.overtime_hours > 0 && (
                      <span className="text-amber-600"> · 加班 {l.overtime_hours}h</span>
                    )}
                  </div>
                </div>
                {admin && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(l)} className="text-slate-500">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => remove(l)} className="text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              {l.task_desc && (
                <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">{l.task_desc}</div>
              )}
            </div>
          ))
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 px-4"
          onClick={() => setEditing(null)}
        >
          <div className="bg-white p-5 rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-4">{editing.id ? '编辑工时' : '录入工时'} ({date})</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">工人</span>
                <select
                  value={editing.worker_id}
                  disabled={Boolean(editing.id)}
                  onChange={(e) => setEditing({ ...editing, worker_id: parseInt(e.target.value) })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded disabled:bg-slate-50"
                >
                  <option value={0}>请选择</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} - {w.role} - ¥{w.hourly_rate}/h ({w.overtime_rate}x加班)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">正常工时 (小时)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={editing.hours}
                  onChange={(e) => setEditing({ ...editing, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">加班工时 (小时)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={editing.overtime_hours}
                  onChange={(e) =>
                    setEditing({ ...editing, overtime_hours: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">任务描述</span>
                <input
                  value={editing.task_desc || ''}
                  onChange={(e) => setEditing({ ...editing, task_desc: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
                  placeholder="如：苹果采摘、分拣、养护..."
                />
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm"
              >
                取消
              </button>
              <button onClick={submit} className="flex-1 px-3 py-2 bg-emerald-700 text-white rounded text-sm">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
