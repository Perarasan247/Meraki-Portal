import * as React from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Resets scroll to the top on navigation.
 *
 * The browser only restores scroll on full page loads; a client-side route
 * change just swaps the content and leaves the scroll position alone, so
 * navigating from halfway down Home to About would open About halfway down.
 *
 * Links carrying a hash (`/about#team`) are left alone — they're asking for a
 * specific section, not the top.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  React.useEffect(() => {
    if (hash) return
    // Instant, not smooth: this is a brand-new page, so animating a scroll
    // through content the user never saw just delays it.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}
