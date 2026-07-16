import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/input'
import { MobileInput } from '@/components/ui/mobile-input'

const PROGRAMS = [
  'AI / ML',
  'Generative AI & LLMs',
  'AI Agents & Agentic AI',
  'Robotics',
  'IIoT',
  'Full Stack',
  'Cloud / DevOps',
  'RPA',
  'Technology Consulting',
  'Other',
]

const WHATSAPP_URL =
  'https://wa.me/918220006630?text=Hi%20Meraki%20AI%20Labs%2C%20I%20would%20like%20to%20know%20more%20about%20your%20programs.'

const CONTACT = [
  { icon: MapPin, title: 'Visit Us', lines: ['Meraki AI Labs', 'Chennai, Tamil Nadu, India'] },
  { icon: Phone, title: 'Call Us', lines: ['+91 82200 06630'] },
  { icon: Mail, title: 'Email Us', lines: ['enquiry@merakiknowledgehub.com'] },
  { icon: Clock, title: 'Working Hours', lines: ['Mon–Sat: 9:00 AM – 6:00 PM'] },
]

interface FormState {
  name: string
  email: string
  mobile: string
  program: string
  message: string
}

const EMPTY: FormState = { name: '', email: '', mobile: '', program: '', message: '' }

export default function ContactPage() {
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [done, setDone] = React.useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/public/enquiry', {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim(),
        program: form.program || 'Not specified',
        message: form.message.trim() || undefined,
      }),
    onSuccess: () => {
      setDone(true)
      setForm(EMPTY)
      toast.success("Thanks! We'll reply to your email within 24 hours.")
    },
    onError: (e: Error) => toast.error(e.message || 'Something went wrong. Please try again.'),
  })

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <span className="rounded-full bg-(--color-sidebar-active) px-3 py-1 text-xs font-semibold text-(--color-primary)">
          Contact Us
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-(--color-foreground) sm:text-4xl">
          Get In Touch
        </h1>
        <p className="mt-3 text-(--color-muted-foreground)">
          Have questions about our programs? We'd love to hear from you.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        {/* Info */}
        <div className="space-y-4">
          {CONTACT.map((c) => (
            <div key={c.title} className="flex items-start gap-4 rounded-2xl border border-(--color-border) bg-(--color-card) p-5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--color-sidebar-active) text-(--color-primary)">
                <c.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-(--color-foreground)">{c.title}</div>
                {c.lines.map((l) => (
                  <div key={l} className="text-sm text-(--color-muted-foreground)">{l}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Form / success */}
        <div className="rounded-2xl border border-(--color-border) bg-(--color-card) p-6 shadow-sm sm:p-8">
          {done ? (
            <div className="flex min-h-96 flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-(--color-accent)/10 text-(--color-accent)">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-(--color-foreground)">Message received</h2>
              <p className="mt-2 max-w-sm text-sm text-(--color-muted-foreground)">
                Thank you for reaching out. We've logged your enquiry and our team
                will reply to your email within 24 hours.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setDone(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <>
              <div className="font-display text-base font-bold text-(--color-foreground)">Send us a message</div>
              <p className="mt-1 text-xs text-(--color-muted-foreground)">
                Fill in your details and we'll get back to you within 24 hours.
              </p>

              <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                <div>
                  <Label htmlFor="name">
                    Full name <span className="text-(--color-destructive)">*</span>
                  </Label>
                  <Input id="name" required value={form.name} onChange={set('name')} placeholder="Your full name" autoComplete="name" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">
                      Email <span className="text-(--color-destructive)">*</span>
                    </Label>
                    <Input id="email" type="email" required value={form.email} onChange={set('email')} placeholder="your@email.com" autoComplete="email" />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile number</Label>
                    <MobileInput
                      id="mobile"
                      value={form.mobile}
                      onValueChange={(v) => setForm((f) => ({ ...f, mobile: v }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="program">Program of interest</Label>
                  <Select id="program" value={form.program} onChange={set('program')}>
                    <option value="">Select a program</option>
                    {PROGRAMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" value={form.message} onChange={set('message')} placeholder="Your message or questions..." rows={4} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" loading={mutation.isPending}>
                    <Send className="h-4 w-4" /> Send Message
                  </Button>
                  <span className="text-xs text-(--color-muted-foreground)">We'll reply to your email within 24 hours</span>
                </div>
              </form>

              {/* Quick contact */}
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-(--color-border) pt-5">
                <span className="text-xs text-(--color-muted-foreground)">Or reach us directly:</span>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M11.999 0C5.373 0 0 5.373 0 12c0 2.115.553 4.103 1.518 5.829L.057 23.882a.5.5 0 00.613.614l6.053-1.46A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 11.999 0zm0 21.818a9.8 9.8 0 01-5.011-1.374l-.36-.214-3.727.899.917-3.629-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.429 0 9.818 4.388 9.818 9.818 0 5.43-4.389 9.818-9.819 9.818z"/>
                  </svg>
                  WhatsApp Us
                </a>
                <a
                  href="tel:+918220006630"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-sidebar-active) px-3.5 py-2 text-xs font-semibold text-(--color-primary) transition-colors hover:bg-(--color-muted)"
                >
                  <Phone className="h-3.5 w-3.5" /> Call Now
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
