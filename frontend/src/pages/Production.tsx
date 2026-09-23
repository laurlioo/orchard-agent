import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import {
  ProductionLogsApi,
  ProductsApi,
  isAdmin,
  localDateISO,
  type ProductionLog,
  type Product,
} from '../api/client'
import { toast } from '../lib/toast'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 20

export default function Production() {
  const admin = isAdmin()
  const [tab, setTab] = useState<'logs' | 'categories'>('logs')
  const [logs, setLogs] = useState<ProductionLog[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [date, setDate] = useState(localDateISO())
  const [addingLog, setAddingLog] = useState(false)
  const [logForm, setLogForm] = useState<Partial<ProductionLog>>({ category_id: 0, quantity: 0, notes: '' })
  const [addingCat, setAddingCat] = useState(false)
  const [catForm, setCatForm] = useState<Partial<Product>>({ name: '', unit: '斤', unit_price: 0, cost_per_unit: 0 })
  const [editingCat, setEditingCat] = useState<Partial<Product> | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const load = async () => {
    const ps = await ProductsApi.list()
    setProducts(ps)
    if (tab === 'logs') {
      const res = await ProductionLogsApi.list({ start: date, end: date, limit: PAGE_SIZE, offset })
      setLogs(res.items)
      setTotal(res.total)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tab, offset])

  const submitLog = async () => {
    if (!logForm.category_id) return toast('请选择品类')
    if (!logForm.quantity || logForm.quantity <= 0) return toast('数量必须大于 0')
    try {
      const dup = logs.find((l) => l.category_id === logForm.category_id)
      if (dup) {
        if (!confirm('该品类当日已有产量，是否改为更新原记录？')) return
        await ProductionLogsApi.update(dup.id, { quantity: logForm.quantity, notes: logForm.notes })
      } else {
        await ProductionLogsApi.create({ ...logForm, date } as any)
      }
      setAddingLog(false)
      setLogForm({ category_id: 0, quantity: 0, notes: '' })
      load()
    } catch (e: any) {
      toast(e.message)
    }
  }

  const submitCat = async () => {
    if (!catForm.name) return toast('品类名必填')
    try {
      await ProductsApi.create(catForm)
      setAddingCat(false)
      setCatForm({ name: '', unit: '斤', unit_price: 0, cost_per_unit: 0 })
      load()
    } catch (e: any) {
      toast(e.message)
    }
  }

  const submitCatEdit = async () => {
    if (!editingCat?.id) return
    if (!editingCat.name) return toast('品类名必填')
    try {
      await ProductsApi.update(editingCat.id, editingCat)
      setEditingCat(null)
      load()
    } catch (e: any) {
      toast(e.message)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg md:text-xl font-bold">每日产量</h1>
        <div className="flex gap-2">
          {tab === 'logs' && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded text-sm"
            />
          )}
          {tab === 'logs' ? (
            admin ? (
              <button
                onClick={() => setAddingLog(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-800"
              >
                <Plus size={16} /> 录入产量
              </button>
            ) : null
          ) : admin ? (
            <button
              onClick={() => setAddingCat(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-800"
            >
              <Plus size={16} /> 新增品类
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setTab('logs')}
          className={`px-3 py-1 rounded text-sm ${tab === 'logs' ? 'bg-emerald-900 text-white' : 'bg-white border border-slate-200'}`}
        >
          产量记录
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`px-3 py-1 rounded text-sm ${tab === 'categories' ? 'bg-emerald-900 text-white' : 'bg-white border border-slate-200'}`}
        >
          品类管理
        </button>
      </div>

      {/* 桌面：表格 */}
      <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
        {tab === 'logs' ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">日期</th>
                <th className="px-4 py-2 text-left">品类</th>
                <th className="px-4 py-2 text-left">数量</th>
                <th className="px-4 py-2 text-left">单位</th>
                <th className="px-4 py-2 text-left">备注</th>
                {admin && <th className="px-4 py-2 text-left">操作</th>}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={admin ? 6 : 5} className="text-center py-6 text-slate-400">该日暂无产量</td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{l.date}</td>
                    <td className="px-4 py-2">{l.category?.name ?? `#${l.category_id}`}</td>
                    <td className="px-4 py-2">{l.quantity}</td>
                    <td className="px-4 py-2 text-slate-600">{l.category?.unit ?? '-'}</td>
                    <td className="px-4 py-2 text-slate-600">{l.notes || '-'}</td>
                    {admin && (
                      <td className="px-4 py-2">
                        <button
                          onClick={async () => {
                            if (confirm('删除?')) {
                              try {
                                await ProductionLogsApi.remove(l.id)
                                load()
                              } catch (e: any) {
                                toast(e.message)
                              }
                            }
                          }}
                          className="text-slate-500 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">品类</th>
                <th className="px-4 py-2 text-left">单位</th>
                <th className="px-4 py-2 text-left">售价</th>
                <th className="px-4 py-2 text-left">单位成本</th>
                <th className="px-4 py-2 text-left">单位毛利</th>
                {admin && <th className="px-4 py-2 text-left">操作</th>}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">暂无品类</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2">{p.unit}</td>
                    <td className="px-4 py-2">¥{p.unit_price}</td>
                    <td className="px-4 py-2">¥{p.cost_per_unit}</td>
                    <td className="px-4 py-2 text-emerald-600">¥{(p.unit_price - p.cost_per_unit).toFixed(2)}</td>
                    {admin && (
                      <td className="px-4 py-2 flex gap-2">
                        <button onClick={() => setEditingCat(p)} className="text-slate-500 hover:text-emerald-600">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('删除该品类?')) {
                              try {
                                await ProductsApi.remove(p.id)
                                load()
                              } catch (e: any) {
                                toast(e.message)
                              }
                            }
                          }}
                          className="text-slate-500 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 移动端：卡片 */}
      <div className="md:hidden space-y-2">
        {tab === 'logs' ? (
          logs.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm bg-white rounded-lg border border-slate-200">该日暂无产量</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{l.category?.name ?? `#${l.category_id}`}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {l.quantity} {l.category?.unit ?? ''} · {l.date}
                  </div>
                  {l.notes && <div className="text-xs text-slate-600 mt-1">{l.notes}</div>}
                </div>
                {admin && (
                  <button
                    onClick={async () => {
                      if (confirm('删除?')) {
                        try {
                          await ProductionLogsApi.remove(l.id)
                          load()
                        } catch (e: any) {
                          toast(e.message)
                        }
                      }
                    }}
                    className="text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )
        ) : products.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm bg-white rounded-lg border border-slate-200">暂无品类</div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  ¥{p.unit_price}/{p.unit} · 成本 ¥{p.cost_per_unit}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600 font-medium">
                  毛利 ¥{(p.unit_price - p.cost_per_unit).toFixed(2)}
                </span>
                {admin && (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCat(p)} className="text-slate-500">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('删除该品类?')) {
                          try {
                            await ProductsApi.remove(p.id)
                            load()
                          } catch (e: any) {
                            toast(e.message)
                          }
                        }
                      }}
                      className="text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {tab === 'logs' && (
        <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
      )}

      {addingLog && (
        <Modal title={`录入产量 (${date})`} onClose={() => setAddingLog(false)} onSubmit={submitLog}>
          <label className="block text-sm">
            <span className="text-slate-600">品类</span>
            <select
              value={logForm.category_id}
              onChange={(e) => setLogForm({ ...logForm, category_id: parseInt(e.target.value) })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            >
              <option value={0}>请选择</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (售价 ¥{p.unit_price}/{p.unit})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">数量</span>
            <input
              type="number"
              step="0.1"
              value={logForm.quantity}
              onChange={(e) => setLogForm({ ...logForm, quantity: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">备注</span>
            <input
              value={logForm.notes || ''}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
        </Modal>
      )}

      {addingCat && (
        <Modal title="新增品类" onClose={() => setAddingCat(false)} onSubmit={submitCat}>
          <label className="block text-sm">
            <span className="text-slate-600">品类名</span>
            <input
              value={catForm.name || ''}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
              placeholder="如：苹果"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">单位</span>
            <input
              value={catForm.unit || ''}
              onChange={(e) => setCatForm({ ...catForm, unit: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">售价 (元/单位)</span>
            <input
              type="number"
              step="0.1"
              value={catForm.unit_price}
              onChange={(e) => setCatForm({ ...catForm, unit_price: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">单位成本</span>
            <input
              type="number"
              step="0.1"
              value={catForm.cost_per_unit}
              onChange={(e) => setCatForm({ ...catForm, cost_per_unit: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
        </Modal>
      )}

      {editingCat && (
        <Modal title={`编辑品类 #${editingCat.id}`} onClose={() => setEditingCat(null)} onSubmit={submitCatEdit}>
          <label className="block text-sm">
            <span className="text-slate-600">品类名</span>
            <input
              value={editingCat.name || ''}
              onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">单位</span>
            <input
              value={editingCat.unit || ''}
              onChange={(e) => setEditingCat({ ...editingCat, unit: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">售价 (元/单位)</span>
            <input
              type="number"
              step="0.1"
              value={editingCat.unit_price}
              onChange={(e) => setEditingCat({ ...editingCat, unit_price: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">单位成本</span>
            <input
              type="number"
              step="0.1"
              value={editingCat.cost_per_unit}
              onChange={(e) => setEditingCat({ ...editingCat, cost_per_unit: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-2 py-1.5 border border-slate-200 rounded"
            />
          </label>
        </Modal>
      )}
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
  onSubmit,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 px-4" onClick={onClose}>
      <div className="bg-white p-5 rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold mb-4">{title}</h2>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm">
            取消
          </button>
          <button onClick={onSubmit} className="flex-1 px-3 py-2 bg-emerald-700 text-white rounded text-sm">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
