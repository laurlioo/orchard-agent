import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Download, FileBarChart } from 'lucide-react'
import { ReportsApi, localDateISO, type ReportData } from '../api/client'

const TYPES = [
  { key: 'daily', label: '日报' },
  { key: 'weekly', label: '周报' },
  { key: 'monthly', label: '月报' },
]

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localDateISO(d)
}

function monthStartISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function Reports() {
  const today = localDateISO()
  const [type, setType] = useState('daily')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState('')

  const selectType = (t: string) => {
    setType(t)
    if (t === 'daily') {
      setStart(today)
      setEnd(today)
    } else if (t === 'weekly') {
      setStart(daysAgoISO(6))
      setEnd(today)
    } else if (t === 'monthly') {
      setStart(monthStartISO())
      setEnd(today)
    }
  }

  const paramsFor = () => {
    const params: { report_type: string; start: string; end?: string } = { report_type: type, start }
    if (type !== 'daily') params.end = end
    return params
  }

  const gen = async () => {
    setLoading(true)
    setError('')
    try {
      const params = paramsFor()
      const report = await ReportsApi.get(params)
      setData(report)
      setSummaryLoading(true)
      ReportsApi.summary(params)
        .then((s) => setData((prev) => (prev ? { ...prev, summary: s.summary } : prev)))
        .catch(() => {})
        .finally(() => setSummaryLoading(false))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const download = async () => {
    try {
      await ReportsApi.export({ ...paramsFor(), with_summary: Boolean(data?.summary) })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const chartData = data?.categories.map((c) => ({
    name: c.name,
    产量: c.quantity,
    毛利: c.gross_profit,
  })) ?? []

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg md:text-xl font-bold mb-4">报表中心</h1>

      <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4">
        <div className="flex flex-wrap items-end gap-2 md:gap-3">
          <div className="flex gap-1">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => selectType(t.key)}
                className={`px-3 py-1.5 rounded text-sm ${
                  type === t.key ? 'bg-emerald-900 text-white' : 'border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="text-sm">
            <span className="block text-slate-600 mb-1">起始日期</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded"
            />
          </label>
          {type !== 'daily' && (
            <label className="text-sm">
              <span className="block text-slate-600 mb-1">结束日期</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded"
              />
            </label>
          )}
          <button
            onClick={gen}
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成报表'}
          </button>
          {data && (
            <button
              onClick={download}
              className="flex items-center gap-1 px-4 py-1.5 border border-emerald-400 text-emerald-600 rounded text-sm hover:bg-emerald-50"
            >
              <Download size={16} /> 下载 Excel
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            <Stat label="总产量" value={String(data.total_quantity)} />
            <Stat label="总销售额" value={`¥${data.total_revenue}`} />
            <Stat label="总毛利" value={`¥${data.total_gross_profit}`} highlight />
            <Stat label="正常+加班工时" value={`${data.total_hours}h + ${data.total_overtime_hours}h`} />
            <Stat label="正常+加班工资" value={`¥${data.total_regular_wages} + ¥${data.total_overtime_wages}`} />
            <Stat label="总工资" value={`¥${data.total_wages}`} />
          </div>

          {data.summary ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
                <FileBarChart size={16} /> AI 摘要
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.summary}</p>
            </div>
          ) : summaryLoading ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4 text-sm text-emerald-700">
              AI 摘要生成中...
            </div>
          ) : null}

          {chartData.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
              <h3 className="text-sm font-medium mb-3">各品类产量与毛利</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="qty" />
                  <YAxis yAxisId="profit" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="qty" dataKey="产量" fill="#10b981" />
                  <Bar yAxisId="profit" dataKey="毛利" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 text-sm font-medium">品类明细</div>
              <table className="w-full text-sm">
                <thead className="text-slate-600">
                  <tr>
                    <th className="px-3 py-1.5 text-left">品类</th>
                    <th className="px-3 py-1.5 text-left">数量</th>
                    <th className="px-3 py-1.5 text-left">销售额</th>
                    <th className="px-3 py-1.5 text-left">毛利</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((c) => (
                    <tr key={c.category_id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">{c.name}</td>
                      <td className="px-3 py-1.5">{c.quantity} {c.unit}</td>
                      <td className="px-3 py-1.5">¥{c.revenue}</td>
                      <td className="px-3 py-1.5 text-emerald-600">¥{c.gross_profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 text-sm font-medium">工资明细</div>
              <table className="w-full text-sm">
                <thead className="text-slate-600">
                  <tr>
                    <th className="px-3 py-1.5 text-left">工人</th>
                    <th className="px-3 py-1.5 text-left">正常工时</th>
                    <th className="px-3 py-1.5 text-left">加班工时</th>
                    <th className="px-3 py-1.5 text-left">正常工资</th>
                    <th className="px-3 py-1.5 text-left">加班工资</th>
                    <th className="px-3 py-1.5 text-left">总工资</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workers.map((w) => (
                    <tr key={w.worker_id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">{w.name}</td>
                      <td className="px-3 py-1.5">{w.hours}h</td>
                      <td className="px-3 py-1.5 text-amber-600">{w.overtime_hours > 0 ? `${w.overtime_hours}h` : '-'}</td>
                      <td className="px-3 py-1.5">¥{w.regular_wage}</td>
                      <td className="px-3 py-1.5 text-amber-600">{w.overtime_wage > 0 ? `¥${w.overtime_wage}` : '-'}</td>
                      <td className="px-3 py-1.5 font-medium">¥{w.wage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
