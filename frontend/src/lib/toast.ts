export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

type Listener = (toast: ToastMessage) => void

const listeners = new Set<Listener>()
let nextId = 1

export function toast(message: string, type: ToastType = 'error') {
  const item: ToastMessage = { id: nextId++, type, message }
  listeners.forEach((listener) => listener(item))
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
