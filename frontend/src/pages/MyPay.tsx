import { useEffect, useMemo, useState } from 'react'
import {
  WagesApi,
  WorkLogsApi,
  getUsername,
  localDateISO,
  type WageSummary,
  type WorkLog,
} from '../api/client'

function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${ym}-${String(last).padStart(2, '0')}`
  return { start, end }
}

export default function MyPay() {
  const name = getUsername()
  const today = localDateISO()
  const thisMonth = today.slice(0, 7)
  const [tab, setTab] = useState<'day' | 'month'>('day')
  const [day, setDay] = useState(today)
  const [month, setMonth] = useState(thisMonth)
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [wages, setWages] = useState<WageSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const range = useMemo(
    () => (tab === 'day' ? { start: day, end: day } : monthRange(month)),
    [tab, day, month],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [ls, ws] = await Promise.all([
          WorkLogsApi.list({ start: range.start, end: range.end }),
          WagesApi.get(range.start, range.end),
        ])
        if (!cancelled) {
          setLogs(ls)
          setWages(ws)
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [range.start, range.end])

  const row = wages?.workers[0]
  const title = tab === 'day' ? day : `${range.start} ~ ${range.end}`

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <h1 className="text-lg md:text-xl font-bold">你好，{name || '工人'}</h1>
      <p className="text-sm text-slate-500 mt-1">只能查看本人的工时和工资，如有疑问请联系管理员。</p>

      <div className="flex flex-wrap items-end gap-2 mt-4 mb-4">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('day')}
            className={`px-3 py-1.5 rounded text-sm ${
              tab === 'day' ? 'bg-slate-800 text-white' : 'border border-slate-200'
            }`}
          >
            每日
          </button>
          <button
            onClick={() => setTab('month')}
            className={`px-3 py-1.5 rounded text-sm ${
              tab === 'month' ? 'bg-slate-800 text-white' : 'border border-slate-200'
            }`}
          >
            每月
          </button>
        </div>
        {tab === 'day' ? (
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-sm"
          />
        ) : (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-sm"
          />
        )}
      </div>

      {error && <div className="text-sm text-red-500 mb-3">{error}</div>}
      {loading && <div className="text-sm text-slate-400 mb-3">加载中...</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="正常工时" value={`${wages?.total_hours ?? 0} h`} />
        <Stat label="加班工时" value={`${wages?.total_overtime_hours ?? 0} h`} />
        <Stat label="正常工资" value={`¥${wages?.total_regular_wages ?? 0}`} />
        <Stat label="总工资" value={`¥${wages?.total_wages ?? 0}`} highlight />
      </div>

      {row && (
        <div className="text-xs text-slate-500 mb-3">
          结算时段 {title} · 时薪 ¥{row.hourly_rate}/h
          {row.overtime_rate ? ` · 加班 ${row.overtime_rate} 倍` : ''}
          {wages && wages.total_overtime_wages > 0 ? ` · 加班工资 ¥${wages.total_overtime_wages}` : ''}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 text-sm font-medium">工时明细</div>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">该时段暂无工时记录</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">日期</th>
                <th className="px-4 py-2 text-left">正常</th>
                <th className="px-4 py-2 text-left">加班</th>
                <th className="px-4 py-2 text-left">任务</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{l.date}</td>
                  <td className="px-4 py-2">{l.hours}h</td>
                  <td className="px-4 py-2 text-amber-600">
                    {l.overtime_hours > 0 ? `${l.overtime_hours}h` : '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{l.task_desc || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-1 ${highlight ? 'text-emerald-700' : ''}`}>{value}</div>
    </div>
  )
}
