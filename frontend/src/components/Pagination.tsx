export default function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number
  limit: number
  offset: number
  onChange: (offset: number) => void
}) {
  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  return (
    <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
      <span>共 {total} 条</span>
      <div className="flex gap-2">
        <button
          disabled={!hasPrev}
          onClick={() => onChange(Math.max(0, offset - limit))}
          className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
        >
          上一页
        </button>
        <button
          disabled={!hasNext}
          onClick={() => onChange(offset + limit)}
          className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
