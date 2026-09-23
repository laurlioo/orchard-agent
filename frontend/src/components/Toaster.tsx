import { useEffect, useState } from 'react'
import { subscribeToasts, type ToastMessage } from '../lib/toast'

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    return subscribeToasts((item) => {
      setToasts((prev) => [...prev, item])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 3000)
    })
  }, [])

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-xs">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
            item.type === 'error'
              ? 'bg-red-500'
              : item.type === 'success'
                ? 'bg-emerald-700'
                : 'bg-slate-700'
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}
