import axios from 'axios'

// 后端地址：本地开发用 localhost，部署到 Vercel 时通过 VITE_API_BASE_URL 指定
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ---------- Token 管理 ----------
const TOKEN_KEY = 'orchard_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// 请求拦截：自动带上 Authorization header
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------- 通用 ----------
http.interceptors.response.use(
  (r) => r,
  (e) => {
    // 401: token 失效或未登录，清理并跳转登录页
    if (e?.response?.status === 401) {
      clearToken()
      // 避免登录页自身循环
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    const msg = e?.response?.data?.detail || e?.message || '请求失败'
    return Promise.reject(new Error(msg))
  },
)

export default http

// ---------- Auth ----------

export interface AuthUser {
  id: number
  username: string
  role: string
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  role: string
  username: string
}

export const AuthApi = {
  status: () => http.get<{ initialized: boolean }>('/auth/status').then((r) => r.data),
  setup: (username: string, password: string) =>
    http.post<LoginResponse>('/auth/setup', { username, password }).then((r) => r.data),
  login: (username: string, password: string) =>
    http.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data),
  me: () => http.get<AuthUser>('/auth/me').then((r) => r.data),
  register: (data: { username: string; password: string; role: string }) =>
    http.post<AuthUser>('/auth/register', data).then((r) => r.data),
}

// ---------- 类型 ----------
export interface Worker {
  id: number
  name: string
  phone: string
  role: string
  hourly_rate: number
  overtime_rate: number
  active: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  unit: string
  unit_price: number
  cost_per_unit: number
  created_at: string
}

export interface WorkLog {
  id: number
  worker_id: number
  date: string
  hours: number  // 正常工时
  overtime_hours: number  // 加班工时
  task_desc: string
  created_at: string
  worker?: Worker
}

export interface ProductionLog {
  id: number
  category_id: number
  date: string
  quantity: number
  notes: string
  created_at: string
  category?: Product
}

export interface Issue {
  id: number
  reporter_name: string
  reporter_role: string
  category: string
  content: string
  status: string
  assignee: string
  reply: string
  created_at: string
}

export interface WageRow {
  worker_id: number
  name: string
  role: string
  hourly_rate: number
  overtime_rate: number
  hours: number  // 正常工时
  overtime_hours: number  // 加班工时
  regular_wage: number
  overtime_wage: number
  wage: number
}

export interface WageSummary {
  period: string
  workers: WageRow[]
  total_hours: number
  total_overtime_hours: number
  total_regular_wages: number
  total_overtime_wages: number
  total_wages: number
}

export interface CategoryRow {
  category_id: number
  name: string
  unit: string
  quantity: number
  unit_price: number
  cost_per_unit: number
  revenue: number
  cost: number
  gross_profit: number
}

export interface ReportData {
  period_start: string
  period_end: string
  report_type: string
  categories: CategoryRow[]
  workers: WageRow[]
  total_quantity: number
  total_revenue: number
  total_cost: number
  total_gross_profit: number
  total_hours: number
  total_overtime_hours: number
  total_regular_wages: number
  total_overtime_wages: number
  total_wages: number
  summary: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ---------- API 模块 ----------

export const WorkersApi = {
  list: (activeOnly = false) =>
    http.get<Worker[]>('/workers', { params: { active_only: activeOnly } }).then((r) => r.data),
  create: (data: Partial<Worker>) => http.post<Worker>('/workers', data).then((r) => r.data),
  update: (id: number, data: Partial<Worker>) =>
    http.patch<Worker>(`/workers/${id}`, data).then((r) => r.data),
  remove: (id: number) => http.delete(`/workers/${id}`),
}

export const ProductsApi = {
  list: () => http.get<Product[]>('/products').then((r) => r.data),
  create: (data: Partial<Product>) => http.post<Product>('/products', data).then((r) => r.data),
  update: (id: number, data: Partial<Product>) =>
    http.patch<Product>(`/products/${id}`, data).then((r) => r.data),
  remove: (id: number) => http.delete(`/products/${id}`),
}

export const WorkLogsApi = {
  list: (params: { start?: string; end?: string; worker_id?: number } = {}) =>
    http.get<WorkLog[]>('/worklogs', { params }).then((r) => r.data),
  create: (data: Partial<WorkLog>) => http.post<WorkLog>('/worklogs', data).then((r) => r.data),
  update: (id: number, data: Partial<WorkLog>) =>
    http.patch<WorkLog>(`/worklogs/${id}`, data).then((r) => r.data),
  remove: (id: number) => http.delete(`/worklogs/${id}`),
}

export const ProductionLogsApi = {
  list: (params: { start?: string; end?: string; category_id?: number } = {}) =>
    http.get<ProductionLog[]>('/production-logs', { params }).then((r) => r.data),
  create: (data: Partial<ProductionLog>) =>
    http.post<ProductionLog>('/production-logs', data).then((r) => r.data),
  update: (id: number, data: Partial<ProductionLog>) =>
    http.patch<ProductionLog>(`/production-logs/${id}`, data).then((r) => r.data),
  remove: (id: number) => http.delete(`/production-logs/${id}`),
}

export const IssuesApi = {
  list: (params: { status?: string; category?: string } = {}) =>
    http.get<Issue[]>('/issues', { params }).then((r) => r.data),
  create: (data: Partial<Issue>) => http.post<Issue>('/issues', data).then((r) => r.data),
  update: (id: number, data: Partial<Issue>) =>
    http.patch<Issue>(`/issues/${id}`, data).then((r) => r.data),
  remove: (id: number) => http.delete(`/issues/${id}`),
}

export const WagesApi = {
  get: (start: string, end: string) =>
    http.get<WageSummary>('/wages', { params: { start, end } }).then((r) => r.data),
}

export const ReportsApi = {
  get: (params: { report_type?: string; start?: string; end?: string; with_summary?: boolean }) =>
    http.get<ReportData>('/reports', { params }).then((r) => r.data),
  exportUrl: (params: { report_type?: string; start?: string; end?: string; with_summary?: boolean }) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString()
    const token = getToken()
    const authParam = token ? `&token=${encodeURIComponent(token)}` : ''
    return `${API_BASE_URL}/reports/export?${qs}${authParam}`
  },
}

// ---------- Agent chat（SSE 流式） ----------

export interface ChatStreamCallbacks {
  onDelta: (text: string) => void
  onToolCall?: (name: string, args: any) => void
  onToolResult?: (name: string, preview: string) => void
  onDone?: () => void
  onError?: (msg: string) => void
}

export async function chatWithAgent(
  message: string,
  history: ChatMessage[],
  cb: ChatStreamCallbacks,
  signal?: AbortSignal,
) {
  const token = getToken()
  const res = await fetch(`${API_BASE_URL}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error('Agent 请求失败')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let currentEvent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const raw = line.slice(6)
        try {
          const data = JSON.parse(raw)
          switch (currentEvent) {
            case 'delta':
              cb.onDelta(data.content)
              break
            case 'tool_call':
              cb.onToolCall?.(data.name, data.args)
              break
            case 'tool_result':
              cb.onToolResult?.(data.name, data.preview)
              break
            case 'done':
              cb.onDone?.()
              break
            case 'error':
              cb.onError?.(data.message)
              break
          }
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }
}
