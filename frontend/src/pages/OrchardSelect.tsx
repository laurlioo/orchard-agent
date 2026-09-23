import { Navigate, useNavigate } from 'react-router-dom'
import { Apple, Leaf } from 'lucide-react'
import { isWorker, setOrchard, type Orchard } from '../api/client'

export default function OrchardSelect() {
  const navigate = useNavigate()

  if (isWorker()) return <Navigate to="/me" replace />

  const choose = (orchard: Orchard) => {
    setOrchard(orchard)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold text-center mb-2">选择果园</h1>
        <p className="text-sm text-slate-500 text-center mb-6">请选择要管理的果园</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => choose('peach')}
            className="flex flex-col items-center gap-3 rounded-2xl bg-pink-200 hover:bg-pink-300 text-pink-900 py-10 shadow-sm"
          >
            <Apple size={40} />
            <span className="text-lg font-bold">桃园管理</span>
          </button>
          <button
            onClick={() => choose('grape')}
            className="flex flex-col items-center gap-3 rounded-2xl bg-purple-200 hover:bg-purple-300 text-purple-900 py-10 shadow-sm"
          >
            <Leaf size={40} />
            <span className="text-lg font-bold">葡萄园管理</span>
          </button>
        </div>
      </div>
    </div>
  )
}
