import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Award, RotateCcw } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { QuizSubmitResult, StudentQuiz, StudentQuizQuestion } from '@/lib/types'

type AnswerMap = Record<string, string | string[] | boolean>

function buildPayload(questions: StudentQuizQuestion[], answers: AnswerMap) {
  const out: Record<string, unknown> = {}
  for (const q of questions) {
    const a = answers[q.id]
    if (q.type === 'single_choice') out[q.id] = a ? [a] : []
    else if (q.type === 'multi_choice') out[q.id] = Array.isArray(a) ? a : []
    else out[q.id] = a ?? (q.type === 'true_false' ? false : '')
  }
  return out
}

export function QuizRunner({ quiz, onSubmitted }: { quiz: StudentQuiz; onSubmitted: () => void }) {
  const [answers, setAnswers] = React.useState<AnswerMap>({})
  const [result, setResult] = React.useState<QuizSubmitResult | null>(null)

  const attemptsLeft =
    quiz.max_attempts == null ? null : Math.max(0, quiz.max_attempts - quiz.attempts_used)
  const locked = attemptsLeft === 0 && !result

  const submit = useMutation({
    mutationFn: () =>
      api.post<QuizSubmitResult>(`/student/quizzes/${quiz.id}/submit`, {
        answers: buildPayload(quiz.questions, answers),
      }),
    onSuccess: (data) => {
      setResult(data)
      onSubmitted()
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not submit quiz'),
  })

  const resultById = React.useMemo(() => {
    const m: Record<string, QuizSubmitResult['results'][number]> = {}
    result?.results.forEach((r) => (m[r.question_id] = r))
    return m
  }, [result])

  function setAnswer(qid: string, value: AnswerMap[string]) {
    setAnswers((prev) => ({ ...prev, [qid]: value }))
  }

  function retry() {
    setResult(null)
    setAnswers({})
    quiz.attempts_used += 1 // reflect the just-used attempt locally
  }

  return (
    <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-muted)/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-(--color-primary)" />
          <h4 className="font-display font-semibold">{quiz.title}</h4>
        </div>
        <div className="flex items-center gap-2 text-xs text-(--color-muted-foreground)">
          <Badge variant="default">Pass ≥ {quiz.pass_percentage}%</Badge>
          <Badge variant="default">
            {quiz.max_attempts == null ? 'Unlimited attempts' : `${attemptsLeft ?? quiz.max_attempts} attempt(s) left`}
          </Badge>
        </div>
      </div>

      {result && (
        <div
          className={cn(
            'mb-4 flex items-center gap-3 rounded-lg border p-4',
            result.passed
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
              : 'border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10',
          )}
        >
          {result.passed ? (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-8 w-8 shrink-0 text-rose-500" />
          )}
          <div>
            <p className="font-display text-lg font-bold">
              {result.score}% — {result.passed ? 'Passed' : 'Not passed'}
            </p>
            <p className="text-sm text-(--color-muted-foreground)">
              You need {result.pass_percentage}% to pass. Attempt #{result.attempt_no}.
            </p>
          </div>
        </div>
      )}

      <ol className="space-y-5">
        {quiz.questions.map((q, idx) => {
          const r = resultById[q.id]
          return (
            <li key={q.id}>
              <div className="mb-2 flex items-start gap-2">
                <span className="font-display text-sm font-semibold text-(--color-muted-foreground)">
                  {idx + 1}.
                </span>
                <p className="font-medium">{q.prompt}</p>
                {r && (
                  <span className="ml-auto">
                    {r.correct ? (
                      <Badge variant="success">Correct</Badge>
                    ) : (
                      <Badge variant="danger">Incorrect</Badge>
                    )}
                  </span>
                )}
              </div>
              <div className="pl-5">
                <QuestionInput q={q} answer={answers[q.id]} disabled={!!result || locked} onChange={setAnswer} />
                {r && r.explanation && (
                  <p className="mt-2 rounded-md bg-(--color-card) px-3 py-2 text-xs text-(--color-muted-foreground)">
                    <span className="font-medium text-(--color-foreground)">Explanation: </span>
                    {r.explanation}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-5 flex justify-end">
        {result ? (
          attemptsLeft !== 0 ? (
            <Button variant="outline" onClick={retry}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          ) : (
            <p className="text-sm text-(--color-muted-foreground)">No attempts remaining.</p>
          )
        ) : locked ? (
          <p className="text-sm text-(--color-muted-foreground)">You've used all your attempts.</p>
        ) : (
          <Button loading={submit.isPending} onClick={() => submit.mutate()}>
            Submit quiz
          </Button>
        )}
      </div>
    </div>
  )
}

function QuestionInput({
  q, answer, disabled, onChange,
}: {
  q: StudentQuizQuestion
  answer: AnswerMap[string] | undefined
  disabled: boolean
  onChange: (qid: string, value: AnswerMap[string]) => void
}) {
  if (q.type === 'short_answer') {
    return (
      <Input
        value={(answer as string) ?? ''}
        disabled={disabled}
        placeholder="Type your answer"
        onChange={(e) => onChange(q.id, e.target.value)}
      />
    )
  }

  if (q.type === 'true_false') {
    const val = answer as boolean | undefined
    return (
      <div className="flex gap-2">
        {[true, false].map((b) => (
          <button
            key={String(b)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(q.id, b)}
            className={cn(
              'cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
              val === b
                ? 'border-(--color-primary) bg-(--color-sidebar-active) text-(--color-primary)'
                : 'border-(--color-border) hover:bg-(--color-muted)',
            )}
          >
            {b ? 'True' : 'False'}
          </button>
        ))}
      </div>
    )
  }

  // single_choice / multi_choice
  const multi = q.type === 'multi_choice'
  const selected = multi ? ((answer as string[]) ?? []) : answer
  return (
    <div className="space-y-2">
      {q.options.map((opt) => {
        const isSel = multi ? (selected as string[]).includes(opt.id) : selected === opt.id
        return (
          <label
            key={opt.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
              disabled && 'cursor-not-allowed opacity-80',
              isSel ? 'border-(--color-primary) bg-(--color-sidebar-active)' : 'border-(--color-border) hover:bg-(--color-muted)',
            )}
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={q.id}
              disabled={disabled}
              checked={isSel}
              onChange={() => {
                if (multi) {
                  const cur = (selected as string[]) ?? []
                  onChange(q.id, cur.includes(opt.id) ? cur.filter((x) => x !== opt.id) : [...cur, opt.id])
                } else {
                  onChange(q.id, opt.id)
                }
              }}
              className="h-4 w-4"
            />
            {opt.text}
          </label>
        )
      })}
    </div>
  )
}
