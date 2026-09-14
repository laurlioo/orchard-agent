import { useState } from 'react'
import { WagesApi, type WageSummary } from '../api/client'

export default function Wages() {
  const today = new Date().toISOString().slice(0, 10)
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [data, setData] = useState<WageSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const query = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await WagesApi.get(start, end))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg md:text-xl font-bold mb-4">工资查询</h1>

      <div className="flex flex-wrap items-end gap-2 md:gap-3 mb-4 bg-white p-4 rounded-lg border border-slate-200">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">开始日期</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded"
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">结束日期</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded"
          />
        </label>
        <button
          onClick={query}
          disabled={loading}
          className="px-4 py-1.5 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? '查询中...' : '查询'}
        </button>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
            <Stat label="区间" value={data.period} />
            <Stat label="总工时" value={`${data.total_hours}h`} />
            <Stat label="总工资" value={`¥${data.total_wages}`} highlight />
          </div>

          {/* 桌面：表格 */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left">工人</th>
                  <th className="px-4 py-2 text-left">岗位</th>
                  <th className="px-4 py-2 text-left">工时 (h)</th>
                  <th className="px-4 py-2 text-left">时薪</th>
                  <th className="px-4 py-2 text-left">工资 (元)</th>
                </tr>
              </thead>
              <tbody>
                {data.workers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">该区间暂无工时</td>
                  </tr>
                ) : (
                  data.workers.map((w) => (
                    <tr key={w.worker_id} className="border-t border-slate-100">
                      <td className="px-4 py-2">{w.name}</td>
                      <td className="px-4 py-2 text-slate-600">{w.role}</td>
                      <td className="px-4 py-2">{w.hours}</td>
                      <td className="px-4 py-2">¥{w.hourly_rate}/h</td>
                      <td className="px-4 py-2 font-medium">¥{w.wage}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片 */}
          <div className="md:hidden space-y-2">
            {data.workers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">该区间暂无工时</div>
            ) : (
              data.workers.map((w) => (
                <div key={w.worker_id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{w.name}</div>
                    <div className="text-xs text-slate-500">{w.role} · {w.hours}h · ¥{w.hourly_rate}/h</div>
                  </div>
                  <div className="text-base font-bold text-emerald-600">¥{w.wage}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-1 ${highlight ? 'text-emerald-700' : ''}`}>{value}</div>
    </div>
  )
}
