import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { WorkersApi, type Worker } from '../api/client'

export default function Workers() {
  const [list, setList] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Worker> | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setList(await WorkersApi.list())
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!editing?.name) return alert('姓名必填')
    try {
      if (editing.id) {
        await WorkersApi.update(editing.id, editing)
      } else {
        await WorkersApi.create(editing)
      }
      setEditing(null)
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">工人管理</h1>
        <button
          onClick={() => setEditing({ name: '', phone: '', role: '工人', hourly_rate: 0, active: true })}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600"
        >
          <Plus size={16} /> 新增工人
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">姓名</th>
              <th className="px-4 py-2 text-left">电话</th>
              <th className="px-4 py-2 text-left">岗位</th>
              <th className="px-4 py-2 text-left">时薪 (元/小时)</th>
              <th className="px-4 py-2 text-left">状态</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">加载中...</td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">暂无工人，点击右上角新增</td>
              </tr>
            ) : (
              list.map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{w.name}</td>
                  <td className="px-4 py-2 text-slate-600">{w.phone || '-'}</td>
                  <td className="px-4 py-2">{w.role}</td>
                  <td className="px-4 py-2">{w.hourly_rate}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        w.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {w.active ? '在岗' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <button onClick={() => setEditing(w)} className="text-slate-500 hover:text-emerald-600">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`删除 ${w.name}?`)) {
                          await WorkersApi.remove(w.id)
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

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setEditing(null)}>
          <div className="bg-white p-5 rounded-lg w-80" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-4">{editing.id ? '编辑工人' : '新增工人'}</h2>
            <div className="space-y-3">
              <Field label="姓名" value={editing.name || ''} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="电话" value={editing.phone || ''} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <Field label="岗位" value={editing.role || ''} onChange={(v) => setEditing({ ...editing, role: v })} />
              <Field
                label="时薪"
                type="number"
                value={String(editing.hourly_rate ?? 0)}
                onChange={(v) => setEditing({ ...editing, hourly_rate: parseFloat(v) || 0 })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active ?? true}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                在岗
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm">
                取消
              </button>
              <button onClick={save} className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded text-sm">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-emerald-400"
      />
    </label>
  )
}
