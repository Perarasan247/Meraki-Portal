import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'

const VALUES = [
  {
    dot: '#1d4ed8', title: 'AI & Agentic Systems',
    desc: 'We design intelligent AI Agents that automate workflows, decision-making, customer interactions and enterprise operations using Generative & Agentic AI.',
  },
  {
    dot: '#7c3aed', title: 'Robotics & Industrial IoT',
    desc: 'We build robotics solutions combining AI, machine vision, sensors and automation to improve industrial productivity, safety and operational efficiency.',
  },
  {
    dot: '#16a34a', title: 'Innovation & R&D',
    desc: 'Our R&D focuses on AI, Agentic Systems, Robotics, Computer Vision, Industrial Automation and next-generation enterprise technologies.',
  },
  {
    dot: '#d97706', title: 'Training & Internships',
    desc: 'Industry-focused programs in AI/ML, GenAI, RAG, MCP, Robotics, IIoT, RPA and Full Stack — nurturing future-ready tech professionals.',
  },
]

const IMPACT = [
  { value: '500+', label: 'Students Trained' },
  { value: '95%', label: 'Placement Rate' },
  { value: '6', label: 'Program Tracks' },
  { value: '50+', label: 'Industry Partners' },
  { value: '3+', label: 'Years of Excellence' },
  { value: '20+', label: 'Expert Trainers' },
]

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <span className="rounded-full bg-(--color-sidebar-active) px-3 py-1 text-xs font-semibold text-(--color-primary)">
          About Us
        </span>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          {/* Left: story + values */}
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-(--color-foreground) sm:text-4xl">
              About Meraki AI Labs
            </h1>
            <p className="mt-4 text-(--color-muted-foreground)">
              We partner with startups, SMEs, and enterprises to solve complex
              business challenges by leveraging Artificial Intelligence,
              Industrial Automation, Robotics, Industrial IoT, and Full Stack
              Technologies. Our mission is to bridge the gap between emerging
              technologies and real-world business outcomes — enabling
              organizations to become smarter, more efficient, and future-ready.
            </p>

            <div className="mt-8 space-y-5">
              {VALUES.map((v) => (
                <div key={v.title} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: v.dot }} />
                  <div>
                    <strong className="text-sm font-semibold text-(--color-foreground)">{v.title}</strong>
                    <p className="mt-1 text-sm leading-relaxed text-(--color-muted-foreground)">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: impact card */}
          <div className="rounded-2xl border border-(--color-border) bg-(--color-card) p-7 shadow-lg">
            <div className="font-display text-lg font-extrabold text-(--color-foreground)">Our Impact</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {IMPACT.map((s) => (
                <div key={s.label} className="rounded-xl border border-(--color-border) bg-(--color-muted) px-4 py-4 text-center">
                  <div className="font-display text-2xl font-extrabold text-(--color-primary)">{s.value}</div>
                  <div className="mt-1 text-xs text-(--color-muted-foreground)">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-(--color-muted) p-4">
              <div className="flex items-center gap-2 text-xs text-(--color-muted-foreground)">
                <MapPin className="h-3.5 w-3.5" /> Located in
              </div>
              <div className="mt-1 font-semibold text-(--color-foreground)">Chennai, Tamil Nadu</div>
              <div className="mt-0.5 text-xs text-(--color-muted-foreground)">Serving students across South India</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-(--color-border) bg-(--color-muted)/50 px-8 py-10 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="font-display text-2xl font-bold text-(--color-foreground)">Want to join the next batch?</h2>
            <p className="mt-2 text-(--color-muted-foreground)">Talk to our admissions team today.</p>
          </div>
          <Link
            to="/contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-(--color-primary) px-6 py-3 text-sm font-semibold text-(--color-primary-foreground) shadow-sm transition-colors hover:bg-emerald-700"
          >
            Get in touch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
