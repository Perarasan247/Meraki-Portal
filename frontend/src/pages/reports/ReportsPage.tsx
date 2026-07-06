import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AskResponse {
  answer: string
  data_used: Record<string, unknown>
}

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const SUGGESTIONS = [
  'How many enquiries do we have?',
  'Which program has the most enrollments?',
  'What is the total revenue collected?',
  'List all active batches',
  'Show pending fee summary',
  'What is the conversion rate?',
]

const GREETING = "Hi! I'm your AI Reports Assistant. Ask me anything about your enquiries, enrollments, batches, expenses, or campaigns."

export default function ReportsPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: 'greeting', role: 'assistant', content: GREETING },
  ])
  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const askMutation = useMutation({
    mutationFn: (question: string) => api.post<AskResponse>('/reports/ask', { question }),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: res.answer }])
    },
    onError: () => {
      toast.error('Could not get an answer')
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, something went wrong answering that question.' },
      ])
    },
  })

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, askMutation.isPending])

  function submitQuestion(question: string) {
    const trimmed = question.trim()
    if (!trimmed || askMutation.isPending) return
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: trimmed }])
    setInput('')
    askMutation.mutate(trimmed)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-(--color-primary)" /> AI Reports Assistant
          </h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Ask questions about your live data, in plain English.</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card)">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submitQuestion(s)}
                  className="cursor-pointer rounded-full border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-xs font-medium text-(--color-foreground) transition-colors hover:bg-(--color-muted)"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {askMutation.isPending && <TypingIndicator />}
        </div>

        <form
          className="flex items-center gap-2 border-t border-(--color-border) p-3"
          onSubmit={(e) => {
            e.preventDefault()
            submitQuestion(input)
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your data…"
            disabled={askMutation.isPending}
          />
          <Button type="submit" disabled={!input.trim()} loading={askMutation.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-(--color-primary) text-(--color-primary-foreground)'
            : 'bg-(--color-muted) text-(--color-foreground)',
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-(--color-muted) px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-(--color-muted-foreground) motion-safe:animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
