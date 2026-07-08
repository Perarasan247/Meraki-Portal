import { Link } from 'react-router-dom'
import {
  ArrowRight, Zap, Users, Activity, Award, BarChart3,
  Brain, MessageSquare, Cpu, Repeat, Code2, Cloud, Terminal, LineChart,
} from 'lucide-react'

const STATS = [
  { value: '500+', label: 'Students Trained' },
  { value: '6', label: 'Specialisations' },
  { value: '95%', label: 'Placement Rate' },
  { value: '50+', label: 'Industry Partners' },
]

const WHY_JOIN = [
  { icon: Users, title: 'Expert Mentorship', desc: 'Guided by active industry professionals with 5–15 years of real-world experience.' },
  { icon: Activity, title: 'Live Projects', desc: 'Work on real enterprise solutions and build a portfolio that stands out.' },
  { icon: Award, title: 'Certification', desc: 'Industry-recognised completion certificate and LinkedIn recommendation.' },
  { icon: BarChart3, title: 'Placement Support', desc: 'Resume building, mock interviews and referrals with 50+ hiring partners.' },
]

const PROGRAMS = [
  {
    icon: Brain, accent: '#1d4ed8',
    title: 'Artificial Intelligence & Machine Learning',
    desc: 'Python, supervised & unsupervised learning, deep learning, NLP, computer vision and real-world AI model deployment on enterprise datasets.',
    tags: ['Python', 'ML', 'Deep Learning', 'NLP'], duration: '10–12 weeks',
  },
  {
    icon: MessageSquare, accent: '#9333ea',
    title: 'Generative AI, LLMs & AI Agents',
    desc: 'Large Language Models, Generative AI, Prompt Engineering, AI Agents, Agentic AI workflows, Retrieval Augmented Generation (RAG) and Model Context Protocol (MCP).',
    tags: ['GenAI', 'LLMs', 'RAG', 'MCP'], duration: '8–10 weeks',
  },
  {
    icon: Cpu, accent: '#16a34a',
    title: 'Robotics & Industrial IoT',
    desc: 'Arduino, Raspberry Pi, ROS, sensors, actuators, autonomous robotic systems, IIoT protocols, SCADA, PLCs, edge computing and smart factory automation.',
    tags: ['Robotics', 'IIoT', 'ROS', 'PLC'], duration: '8–12 weeks',
  },
  {
    icon: Repeat, accent: '#be123c',
    title: 'Robotic Process Automation (RPA)',
    desc: 'Automate business processes across finance, HR, operations and supply chain using leading RPA tools. Hands-on bot development with real enterprise workflows.',
    tags: ['RPA', 'Automation', 'Bots'], duration: '6–8 weeks',
  },
  {
    icon: Code2, accent: '#d97706',
    title: 'Full Stack Development',
    desc: 'React, Node.js, MongoDB, REST APIs, GraphQL, cloud deployment and building production-ready web and mobile applications with modern DevOps practices.',
    tags: ['React', 'Node.js', 'MongoDB', 'APIs'], duration: '10–12 weeks',
  },
  {
    icon: Cloud, accent: '#0284c7',
    title: 'Cloud Technologies & DevOps',
    desc: 'AWS, Azure, Docker, Kubernetes, CI/CD pipelines, Infrastructure as Code, monitoring and cloud architecture best practices for scalable enterprise systems.',
    tags: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'], duration: '8–10 weeks',
  },
  {
    icon: Terminal, accent: '#0f766e',
    title: 'Python Programming',
    desc: 'Comprehensive Python from fundamentals to advanced concepts — data structures, OOP, file handling, APIs, automation scripting and data processing libraries.',
    tags: ['Python', 'OOP', 'Pandas', 'NumPy'], duration: '6–8 weeks',
  },
  {
    icon: LineChart, accent: '#6d28d9',
    title: 'Data Analytics & Visualisation',
    desc: 'Python, Pandas, NumPy, Power BI, Tableau and SQL — turning raw business data into actionable insights through statistical analysis and compelling dashboards.',
    tags: ['Power BI', 'Tableau', 'SQL', 'Pandas'], duration: '6–8 weeks',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-(--color-border) bg-slate-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(40% 60% at 18% 50%, rgba(59,130,246,.30), transparent 70%), radial-gradient(40% 50% at 82% 15%, rgba(139,92,246,.26), transparent 70%), radial-gradient(35% 45% at 60% 90%, rgba(6,182,212,.20), transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="font-display text-lg font-extrabold tracking-wide text-white sm:text-xl">
            Meraki <span className="text-blue-400">Ai</span> Labs
          </div>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
            <Zap className="h-3.5 w-3.5 text-blue-400" />
            Technology Consulting & Digital Transformation
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Transforming Industries Through<br />
            <em className="not-italic text-blue-400">Intelligent Innovation</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Meraki AI Labs is a Chennai-based technology consulting and
            transformation company helping businesses accelerate their digital
            journey through Artificial Intelligence, Industrial Automation,
            Robotics, IIoT, and Full Stack Technologies — bridging emerging
            technologies with real-world business outcomes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 rounded-lg bg-(--color-primary) px-6 py-3 text-sm font-semibold text-(--color-primary-foreground) shadow-sm transition-colors hover:bg-indigo-500"
            >
              Explore Services <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              Contact Us
            </Link>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 backdrop-blur">
                <div className="font-display text-3xl font-extrabold text-white">{s.value}</div>
                <div className="mt-1 text-xs text-slate-300">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-(--color-sidebar-active) px-3 py-1 text-xs font-semibold text-(--color-primary)">
            Our Programs
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-(--color-foreground)">
            Training & Internship Programs
          </h2>
          <p className="mt-3 text-(--color-muted-foreground)">
            Industry-focused, hands-on training and internship programs — real
            projects, mentorship from industry experts, and live enterprise
            solutions.
          </p>
        </div>

        {/* Why join */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_JOIN.map((w) => (
            <div key={w.title} className="flex items-start gap-3 rounded-xl border border-(--color-border) bg-(--color-card) p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-sidebar-active) text-(--color-primary)">
                <w.icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-(--color-foreground)">{w.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-(--color-muted-foreground)">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Program cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMS.map((p) => (
            <div
              key={p.title}
              className="flex flex-col rounded-2xl border border-(--color-border) bg-(--color-card) p-5 shadow-sm transition-shadow hover:shadow-md"
              style={{ borderLeft: `4px solid ${p.accent}` }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${p.accent} 12%, transparent)`, color: p.accent }}
              >
                <p.icon className="h-5.5 w-5.5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold leading-snug text-(--color-foreground)">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-(--color-muted-foreground)">{p.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span key={t} className="rounded-md bg-(--color-muted) px-2 py-0.5 text-[11px] font-medium text-(--color-muted-foreground)">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs text-(--color-muted-foreground)">⏱ {p.duration}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-(--color-primary) px-8 py-3.5 text-sm font-semibold text-(--color-primary-foreground) shadow-sm transition-colors hover:bg-indigo-500"
          >
            Apply for Internship <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-sm text-(--color-muted-foreground)">
            Batches starting every month · Online & Offline modes available
          </p>
        </div>
      </section>
    </>
  )
}
