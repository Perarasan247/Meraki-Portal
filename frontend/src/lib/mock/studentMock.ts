/**
 * In-memory sample LMS data for the UI-preview build (VITE_DEV_BYPASS_AUTH).
 * Lets the student portal render — and stay interactive (mark-complete, quiz
 * grading) — with no backend. Never imported in a real build: api.ts only
 * dynamic-imports this when bypass auth is on.
 */
import type {
  QuizSubmitResult, StudentCourse, StudentCourseSummary, StudentModule,
  StudentQuiz, LessonBlock,
} from '@/lib/types'

// Per-course accent, drawn from our --color-chart-* palette for variety.
export const COURSE_ACCENTS = ['#059669', '#0d9488', '#0891b2', '#f59e0b', '#e11d48', '#2563eb']

// --- internal shapes (carry the answer key + completion state) ---
interface MockQuestion {
  id: string
  prompt: string
  type: 'single_choice' | 'multi_choice' | 'true_false' | 'short_answer'
  options: { id: string; text: string }[]
  correct: unknown[]
  points: number
  explanation: string | null
}
interface MockQuiz {
  id: string
  title: string
  pass_percentage: number
  max_attempts: number | null
  questions: MockQuestion[]
  attempts_used: number
  best_score: number | null
  passed: boolean
}
interface MockLesson {
  id: string
  title: string
  estimated_minutes: number | null
  blocks: LessonBlock[]
  quiz: MockQuiz | null
  completed: boolean
}
interface MockModule {
  id: string
  title: string
  description: string | null
  lessons: MockLesson[]
  quiz: MockQuiz | null
}
interface MockCourse {
  id: string
  title: string
  program: string
  blurb: string
  modules: MockModule[]
}

let uid = 0
function block(type: LessonBlock['type'], content: Record<string, unknown>): LessonBlock {
  return { id: `b${++uid}`, lesson_id: '', branch_id: '', type, order_index: 0, content, created_at: '' }
}
const reading = (markdown: string) => block('text', { markdown })
// `placeholder` makes the viewer show a clean poster instead of a live embed
// (YouTube blocks embeds on file:// origins, which is how the demo is shared).
const video = (youtube_id: string, caption: string) => block('video', { youtube_id, caption, placeholder: true })

function q(
  prompt: string,
  type: MockQuestion['type'],
  options: string[],
  correct: unknown[],
  explanation: string,
): MockQuestion {
  return {
    id: `q${++uid}`,
    prompt,
    type,
    options: options.map((text, i) => ({ id: `${String.fromCharCode(97 + i)}`, text })),
    correct,
    points: 1,
    explanation,
  }
}
function quiz(id: string, title: string, questions: MockQuestion[], passed = false, attempts = 0): MockQuiz {
  return { id, title, pass_percentage: 70, max_attempts: 3, questions, attempts_used: attempts, best_score: passed ? 100 : null, passed }
}

// ---------------------------------------------------------------------------
// Sample track: "Generative AI & LLMs" internship
// ---------------------------------------------------------------------------
const COURSES: MockCourse[] = [
  {
    id: 'c1',
    title: 'Foundations of Generative AI',
    program: 'Generative AI & LLMs',
    blurb: 'Understand how large language models work, from tokens to transformers, and learn to prompt them effectively.',
    modules: [
      {
        id: 'c1m1', title: 'Understanding LLMs',
        description: 'What generative AI is and how modern language models actually work.',
        lessons: [
          {
            id: 'c1m1l1', title: 'What is Generative AI?', estimated_minutes: 8, completed: true, quiz: null,
            blocks: [reading(`Generative AI refers to systems that can create new content — text, images, audio, or code — rather than simply classifying or predicting from fixed labels.\n\nLarge Language Models (LLMs) are the text-and-code branch of generative AI. Trained on vast corpora, they learn the statistical structure of language well enough to write essays, answer questions, summarise documents, and reason step by step.\n\nIn this track you'll go from the fundamentals of how these models work all the way to building your own AI agents.`)],
          },
          {
            id: 'c1m1l2', title: 'How Large Language Models Work', estimated_minutes: 12, completed: true, quiz: null,
            blocks: [
              video('wjZofJX0v4M', 'A visual introduction to transformers and attention.'),
              reading(`At their core, LLMs predict the **next token** given the tokens so far. Stack that simple objective across billions of parameters and trillions of training tokens, and remarkably capable behaviour emerges: translation, coding, and multi-step reasoning.`),
            ],
          },
          {
            id: 'c1m1l3', title: 'Tokenization & Embeddings', estimated_minutes: 10, completed: true, quiz: null,
            blocks: [reading(`Models don't read words — they read **tokens**, sub-word chunks mapped to integers. Each token id is looked up in an **embedding** table, turning it into a vector that captures meaning. Words used in similar contexts end up with similar vectors.`)],
          },
        ],
        quiz: quiz('c1m1q', 'LLM Basics Quiz', [
          q('What does a language model fundamentally predict?', 'single_choice',
            ['The sentiment of the text', 'The next token in a sequence', 'The language of the text', 'The author of the text'],
            ['b'], 'LLMs are trained on next-token prediction; everything else emerges from that objective.'),
          q('Embeddings turn tokens into vectors that capture meaning.', 'true_false', [], [true],
            'Embeddings map token ids to dense vectors where similar meanings are nearby.'),
        ], true, 1),
      },
      {
        id: 'c1m2', title: 'Prompt Engineering',
        description: 'Techniques to get reliable, high-quality output from any LLM.',
        lessons: [
          {
            id: 'c1m2l1', title: 'Anatomy of a Good Prompt', estimated_minutes: 9, completed: true, quiz: null,
            blocks: [reading(`A strong prompt usually has four parts:\n\n1. **Role / context** — who the model should be.\n2. **Task** — the specific thing to do.\n3. **Constraints** — format, length, tone.\n4. **Examples** — show, don't just tell.\n\nBeing explicit beats being clever.`)],
          },
          {
            id: 'c1m2l2', title: 'Few-shot & Chain-of-Thought', estimated_minutes: 14, completed: false, quiz: null,
            blocks: [
              video('wjZofJX0v4M', 'Few-shot prompting and reasoning walkthroughs.'),
              reading(`**Few-shot** prompting gives the model a handful of input→output examples before the real task. **Chain-of-thought** asks the model to reason step by step, which sharply improves accuracy on maths and logic problems.`),
            ],
          },
          {
            id: 'c1m2l3', title: 'Prompt Patterns Workshop', estimated_minutes: 20, completed: false, quiz: null,
            blocks: [reading(`Practice rewriting three weak prompts into strong ones using the anatomy from lesson 1. Focus on adding explicit constraints and a single worked example to each.`)],
          },
        ],
        quiz: quiz('c1m2q', 'Prompting Quiz', [
          q('Which techniques improve reasoning on multi-step problems? (select all)', 'multi_choice',
            ['Chain-of-thought', 'Lowering temperature to 0 always', 'Few-shot examples', 'Using ALL CAPS'],
            ['a', 'c'], 'Chain-of-thought and relevant few-shot examples both help; caps and blanket temperature rules do not.'),
          q('A good prompt should be explicit about the desired output format.', 'true_false', [], [true],
            'Stating the format (JSON, bullet list, word count) reduces ambiguity and reformatting.'),
        ]),
      },
      {
        id: 'c1m3', title: 'Working with the Claude API',
        description: 'Call a real model, stream responses, and give it tools.',
        lessons: [
          {
            id: 'c1m3l1', title: 'Your First API Call', estimated_minutes: 11, completed: false, quiz: null,
            blocks: [reading(`You send a list of **messages** and receive the model's reply. Each message has a role (user or assistant) and content. Keep the conversation array and append to it to maintain context across turns.`)],
          },
          {
            id: 'c1m3l2', title: 'Streaming & Tool Use', estimated_minutes: 16, completed: false, quiz: null,
            blocks: [video('wjZofJX0v4M', 'Streaming tokens and wiring up tool calls.')],
          },
        ],
        quiz: null,
      },
    ],
  },
  {
    id: 'c2',
    title: 'Python for AI Engineering',
    program: 'Generative AI & LLMs',
    blurb: 'The Python you actually need to build AI apps — data handling, APIs, and clean, testable code.',
    modules: [
      {
        id: 'c2m1', title: 'Python Essentials',
        description: 'Core language features for day-to-day AI engineering.',
        lessons: [
          {
            id: 'c2m1l1', title: 'Data Structures That Matter', estimated_minutes: 12, completed: true, quiz: null,
            blocks: [reading(`Lists, dicts, sets and tuples cover 90% of what you'll use. Dicts (hash maps) are the workhorse for keyed lookups and JSON-shaped data — learn their methods cold.`)],
          },
          {
            id: 'c2m1l2', title: 'Functions, Comprehensions & Typing', estimated_minutes: 15, completed: false, quiz: null,
            blocks: [reading(`Comprehensions make data transforms concise: \`[f(x) for x in xs if cond(x)]\`. Type hints (\`def embed(text: str) -> list[float]:\`) make AI codebases far easier to maintain.`)],
          },
        ],
        quiz: quiz('c2m1q', 'Python Basics Quiz', [
          q('Which structure is best for fast keyed lookups?', 'single_choice',
            ['list', 'dict', 'tuple', 'str'], ['b'], 'Dicts give average O(1) lookups by key.'),
        ]),
      },
      {
        id: 'c2m2', title: 'Data with Pandas & NumPy',
        description: 'Load, clean and reshape datasets for model input.',
        lessons: [
          {
            id: 'c2m2l1', title: 'NumPy Arrays & Vectorisation', estimated_minutes: 13, completed: false, quiz: null,
            blocks: [reading(`NumPy arrays are contiguous and typed, so vectorised operations run in compiled C — often 10–100× faster than Python loops. Think in whole-array operations, not element-by-element.`)],
          },
          {
            id: 'c2m2l2', title: 'DataFrames in Pandas', estimated_minutes: 18, completed: false, quiz: null,
            blocks: [video('wjZofJX0v4M', 'Filtering, grouping and joining DataFrames.')],
          },
        ],
        quiz: null,
      },
    ],
  },
  {
    id: 'c3',
    title: 'Building AI Agents & RAG',
    program: 'Generative AI & LLMs',
    blurb: 'Go beyond chat: ground models in your own data with RAG and build agents that take actions.',
    modules: [
      {
        id: 'c3m1', title: 'Retrieval-Augmented Generation',
        description: 'Give the model knowledge it was never trained on.',
        lessons: [
          {
            id: 'c3m1l1', title: 'Why RAG?', estimated_minutes: 10, completed: false, quiz: null,
            blocks: [reading(`RAG retrieves relevant chunks from your documents and puts them in the prompt, so the model answers from **your** data instead of guessing. It's how you build assistants over private knowledge bases without retraining.`)],
          },
          {
            id: 'c3m1l2', title: 'Embeddings & Vector Search', estimated_minutes: 15, completed: false, quiz: null,
            blocks: [reading(`You embed each document chunk into a vector and store it. At query time you embed the question and find the nearest chunks by cosine similarity — those become the context you feed the model.`)],
          },
        ],
        quiz: null,
      },
      {
        id: 'c3m2', title: 'Agentic Workflows & MCP',
        description: 'Let models plan, use tools, and act.',
        lessons: [
          {
            id: 'c3m2l1', title: 'From Chatbot to Agent', estimated_minutes: 12, completed: false, quiz: null,
            blocks: [reading(`An agent loops: the model decides on an action, a tool runs, the result feeds back, and it decides again — until the task is done. Tools + a loop + a goal turn a chatbot into an agent.`)],
          },
        ],
        quiz: null,
      },
    ],
  },
]

// --- serialisers: strip the answer key for the student-facing shapes ---
function toStudentQuiz(mq: MockQuiz): StudentQuiz {
  return {
    id: mq.id,
    title: mq.title,
    pass_percentage: mq.pass_percentage,
    max_attempts: mq.max_attempts,
    attempts_used: mq.attempts_used,
    best_score: mq.best_score,
    passed: mq.passed,
    questions: mq.questions.map((qq, i) => ({
      id: qq.id, quiz_id: mq.id, prompt: qq.prompt, type: qq.type,
      order_index: i, options: qq.options, points: qq.points,
    })),
  }
}
function toStudentModule(m: MockModule): StudentModule {
  return {
    id: m.id, title: m.title, description: m.description, order_index: 0,
    lessons: m.lessons.map((l, i) => ({
      id: l.id, title: l.title, order_index: i, estimated_minutes: l.estimated_minutes,
      blocks: l.blocks, quiz: l.quiz ? toStudentQuiz(l.quiz) : null, completed: l.completed,
    })),
    quiz: m.quiz ? toStudentQuiz(m.quiz) : null,
  }
}
function toStudentCourse(c: MockCourse): StudentCourse {
  return { id: c.id, title: c.title, program: c.program, modules: c.modules.map(toStudentModule) }
}
function summarise(c: MockCourse): StudentCourseSummary {
  const lessons = c.modules.flatMap((m) => m.lessons)
  const completed = lessons.filter((l) => l.completed).length
  return {
    id: c.id, title: c.title, program: c.program,
    total_lessons: lessons.length, completed_lessons: completed,
    progress_pct: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
  }
}

// Extra fields the redesigned UI wants but the API summary doesn't carry.
export interface CourseExtra { blurb: string; total_minutes: number }
export function courseExtras(): Record<string, CourseExtra> {
  const out: Record<string, CourseExtra> = {}
  for (const c of COURSES) {
    out[c.id] = {
      blurb: c.blurb,
      total_minutes: c.modules.flatMap((m) => m.lessons).reduce((s, l) => s + (l.estimated_minutes ?? 0), 0),
    }
  }
  return out
}

function allQuizzes(): MockQuiz[] {
  return COURSES.flatMap((c) => c.modules.flatMap((m) => [m.quiz, ...m.lessons.map((l) => l.quiz)])).filter(Boolean) as MockQuiz[]
}

function gradeQuiz(mq: MockQuiz, answers: Record<string, unknown>): QuizSubmitResult {
  let correctCount = 0
  const results = mq.questions.map((qq) => {
    const given = answers[qq.id]
    let ok = false
    if (qq.type === 'single_choice' || qq.type === 'multi_choice') {
      const g = new Set((Array.isArray(given) ? given : []) as string[])
      const c = new Set(qq.correct as string[])
      ok = g.size === c.size && [...g].every((x) => c.has(x))
    } else if (qq.type === 'true_false') {
      ok = given === qq.correct[0]
    } else {
      const g = String(given ?? '').trim().toLowerCase()
      ok = (qq.correct as string[]).some((c) => String(c).trim().toLowerCase() === g)
    }
    if (ok) correctCount++
    return { question_id: qq.id, correct: ok, correct_answer: qq.correct, explanation: qq.explanation }
  })
  const score = Math.round((correctCount / mq.questions.length) * 100)
  const passed = score >= mq.pass_percentage
  mq.attempts_used += 1
  mq.best_score = mq.best_score == null ? score : Math.max(mq.best_score, score)
  mq.passed = mq.passed || passed
  return {
    score, passed, attempt_no: mq.attempts_used, pass_percentage: mq.pass_percentage,
    max_attempts: mq.max_attempts, attempts_used: mq.attempts_used, results,
  }
}

/**
 * Handle a student API call against the in-memory data. Returns the response
 * body, or the NOT_HANDLED symbol if the path isn't a student route.
 */
export const NOT_HANDLED = Symbol('not-handled')

export function handleStudentMock(method: string, path: string, body: unknown): unknown {
  const p = path.split('?')[0]

  if (method === 'GET' && p === '/student/courses') {
    return COURSES.map(summarise)
  }
  let m = p.match(/^\/student\/courses\/([^/]+)$/)
  if (method === 'GET' && m) {
    const c = COURSES.find((x) => x.id === m![1])
    return c ? toStudentCourse(c) : NOT_HANDLED
  }
  m = p.match(/^\/student\/lessons\/([^/]+)\/complete$/)
  if (method === 'POST' && m) {
    for (const c of COURSES) for (const mod of c.modules) {
      const l = mod.lessons.find((x) => x.id === m![1])
      if (l) l.completed = true
    }
    return {}
  }
  m = p.match(/^\/student\/quizzes\/([^/]+)\/submit$/)
  if (method === 'POST' && m) {
    const mq = allQuizzes().find((x) => x.id === m![1])
    if (!mq) return NOT_HANDLED
    const answers = (body as { answers?: Record<string, unknown> })?.answers ?? {}
    return gradeQuiz(mq, answers)
  }

  return NOT_HANDLED
}
