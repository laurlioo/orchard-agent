import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Wrench } from 'lucide-react'
import { chatWithAgent, type ChatMessage } from '../api/client'

interface ToolEvent {
  name: string
  args?: any
  preview?: string
  done: boolean
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tools, setTools] = useState<ToolEvent[]>([])
  const [streaming, setStreaming] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming, tools])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const nextHistory = [...messages, { role: 'user' as const, content: text }]
    setMessages(nextHistory)
    setLoading(true)
    setStreaming('')
    setTools([])

    let assistantText = ''
    const ac = new AbortController()
    abortRef.current = ac

    try {
      await chatWithAgent(
        text,
        messages,
        {
          onDelta: (chunk) => {
            assistantText += chunk
            setStreaming(assistantText)
          },
          onToolCall: (name, args) => {
            setTools((prev) => [...prev, { name, args, done: false }])
          },
          onToolResult: (name, preview) => {
            setTools((prev) =>
              prev.map((t) => (t.name === name && !t.done ? { ...t, preview, done: true } : t)),
            )
          },
          onDone: () => {
            setMessages([...nextHistory, { role: 'assistant', content: assistantText }])
            setStreaming('')
            setTools([])
          },
          onError: (msg) => {
            setMessages([
              ...nextHistory,
              { role: 'assistant', content: `出错：${msg}` },
            ])
            setStreaming('')
            setTools([])
          },
        },
        ac.signal,
      )
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages([
          ...nextHistory,
          { role: 'assistant', content: `请求失败：${e.message}` },
        ])
      }
    } finally {
      setLoading(false)
      setStreaming('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息区 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {messages.length === 0 && !streaming && (
          <div className="text-center text-slate-400 text-sm mt-8">
            <p>试试问我：</p>
            <ul className="mt-2 space-y-1">
              <li>「今天工资一共多少？」</li>
              <li>「生成今天的日报」</li>
              <li>「登记一条问题：李四上报苹果树叶有虫害」</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-emerald-700 text-white ml-auto'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {m.content}
          </div>
        ))}

        {/* 工具调用过程 */}
        {tools.map((t, i) => (
          <div
            key={i}
            className="max-w-[85%] px-3 py-2 rounded-lg text-xs bg-slate-100 border border-slate-200 text-slate-600"
          >
            <div className="flex items-center gap-1.5">
              <Wrench size={12} />
              <span className="font-mono">{t.name}</span>
              {t.done ? (
                <span className="text-emerald-600">✓ 已完成</span>
              ) : (
                <Loader2 size={12} className="animate-spin" />
              )}
            </div>
            {t.args && (
              <pre className="mt-1 text-[10px] text-slate-500 overflow-x-auto">
                {JSON.stringify(t.args)}
              </pre>
            )}
            {t.preview && (
              <pre className="mt-1 text-[10px] text-slate-500 max-h-24 overflow-auto whitespace-pre-wrap">
                {t.preview.slice(0, 300)}
                {t.preview.length > 300 ? '…' : ''}
              </pre>
            )}
          </div>
        ))}

        {/* 流式回复 */}
        {streaming && (
          <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-white border border-slate-200 text-slate-700 whitespace-pre-wrap">
            {streaming}
            <span className="inline-block w-1.5 h-3.5 bg-slate-400 ml-0.5 animate-pulse" />
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="p-2 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="问 Agent..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-emerald-400"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
