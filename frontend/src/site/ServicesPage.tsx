import { Link } from 'react-router-dom'
import {
  Settings, PenTool, MessageSquare, Cpu, Wifi, Repeat, Package, Code2,
} from 'lucide-react'

const SERVICES = [
  {
    icon: Settings, accent: '#1d4ed8',
    title: 'Technology Consulting & Digital Transformation',
    desc: 'We help organizations modernize legacy systems and implement scalable technology solutions that drive growth, efficiency, and competitive advantage.',
  },
  {
    icon: PenTool, accent: '#16a34a',
    title: 'Industry Automation',
    desc: 'Intelligent automation streamlining business operations and manufacturing processes, reducing manual effort and improving operational excellence.',
  },
  {
    icon: MessageSquare, accent: '#9333ea',
    title: 'AI Agent Development',
    desc: 'Intelligent AI Agents automating workflows, decision-making, customer interactions and enterprise operations using Generative & Agentic AI.',
  },
  {
    icon: Cpu, accent: '#d97706',
    title: 'Robotics & Intelligent Systems',
    desc: 'Robotics solutions combining AI, machine vision, sensors and automation to improve industrial productivity, safety, and operational efficiency.',
  },
  {
    icon: Wifi, accent: '#0284c7',
    title: 'Industrial IoT (IIoT)',
    desc: 'Connected ecosystems enabling real-time monitoring, predictive maintenance, asset tracking and data-driven decision-making through IIoT platforms.',
  },
  {
    icon: Repeat, accent: '#be123c',
    title: 'Robotic Process Automation (RPA)',
    desc: 'Automate repetitive business processes across finance, HR, operations and supply chain — delivering significant cost and time savings.',
  },
  {
    icon: Package, accent: '#16a34a',
    title: 'Product Development',
    desc: 'From concept to commercialization — innovative tech products, SaaS platforms, AI-powered applications and enterprise solutions tailored to market needs.',
  },
  {
    icon: Code2, accent: '#d97706',
    title: 'Full Stack Development',
    desc: 'Modern web and mobile apps using scalable architectures, cloud-native technologies, APIs and microservices — built for performance and scale.',
  },
]

export default function ServicesPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-16 sm:px-6 sm:pt-20">
        <span className="rounded-full bg-(--color-sidebar-active) px-3 py-1 text-xs font-semibold text-(--color-primary)">
          Services
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-(--color-foreground) sm:text-4xl">
          Our Core Expertise
        </h1>
        <p className="mt-3 max-w-2xl text-(--color-muted-foreground)">
          End-to-end consulting, development, implementation and training
          services across AI, Automation, Robotics and Digital Transformation.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-(--color-border) bg-(--color-card) p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${s.accent} 12%, transparent)`, color: s.accent }}
              >
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold leading-snug text-(--color-foreground)">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--color-muted-foreground)">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-10 text-center shadow-lg sm:flex-row sm:text-left">
          <div>
            <div className="font-display text-xl font-bold text-white">Ready to start your journey?</div>
            <p className="mt-1.5 text-sm text-indigo-100">
              Join 500+ students who have already transformed their careers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="rounded-lg bg-white/20 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white/30"
            >
              Apply Now
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-(--color-primary) shadow-sm transition-transform hover:scale-[1.02]"
            >
              Login to Portal
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
