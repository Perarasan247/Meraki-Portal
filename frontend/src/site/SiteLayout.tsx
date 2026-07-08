import * as React from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { Sparkles, Menu, X, Mail, MapPin, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact Us' },
]

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-primary) text-(--color-primary-foreground)">
        <Sparkles className="h-4.5 w-4.5" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-(--color-foreground)">
        Meraki <span className="text-(--color-primary)">AI Labs</span>
      </span>
    </Link>
  )
}

function SiteNavbar() {
  const [open, setOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'text-(--color-primary)'
        : 'text-(--color-muted-foreground) hover:text-(--color-foreground)',
    )

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors',
        scrolled
          ? 'border-(--color-border) bg-(--color-background)/85 backdrop-blur-md'
          : 'border-transparent bg-(--color-background)',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-(--color-foreground) hover:bg-(--color-muted)"
          >
            Portal Login
          </Link>
          <Link
            to="/contact"
            className="rounded-lg bg-(--color-primary) px-4 py-2 text-sm font-semibold text-(--color-primary-foreground) shadow-sm transition-colors hover:bg-indigo-500"
          >
            Apply Now
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen((v) => !v)}
            className="cursor-pointer rounded-lg p-2 text-(--color-foreground) hover:bg-(--color-muted)"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-(--color-border) bg-(--color-background) md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-(--color-sidebar-active) text-(--color-primary)'
                      : 'text-(--color-foreground) hover:bg-(--color-muted)',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-(--color-border) pt-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-(--color-border) px-3 py-2.5 text-center text-sm font-medium text-(--color-foreground) hover:bg-(--color-muted)"
              >
                Portal Login
              </Link>
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-(--color-primary) px-3 py-2.5 text-center text-sm font-semibold text-(--color-primary-foreground)"
              >
                Apply Now
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-(--color-border) bg-(--color-muted)/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Brand />
          <p className="max-w-xs text-sm text-(--color-muted-foreground)">
            Chennai-based technology consulting and transformation company —
            bridging AI, Automation, Robotics, IIoT and Full Stack with
            real-world business outcomes.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-(--color-foreground)">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-(--color-muted-foreground)">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className="hover:text-(--color-primary)">
                  {n.label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link to="/login" className="hover:text-(--color-primary)">
                Portal Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-(--color-foreground)">Get in touch</h4>
          <ul className="mt-3 space-y-2 text-sm text-(--color-muted-foreground)">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-(--color-primary)" /> enquiry@merakiknowledgehub.com
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-(--color-primary)" /> +91 82200 06630
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-(--color-primary)" /> Chennai, Tamil Nadu, India
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-(--color-border) py-5 text-center text-xs text-(--color-muted-foreground)">
        © Meraki AI Labs · Chennai, Tamil Nadu, India · All rights reserved.
      </div>
    </footer>
  )
}

export default function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-(--color-background)">
      <SiteNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
