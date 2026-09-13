import { createContext, useContext, useEffect, useState } from 'react'
import { customizerApi } from '../api/customizer'
import { getFullUrl } from '../config/apiBaseUrl'

/**
 * Maps customizer DB fields to the CSS custom properties every layout's
 * CSS already consumes (AdminLayout.css, LandlordLayout.css, etc.), so
 * painting these here is what makes the Website Customizer's colors show
 * up across every role's pages, not just the public homepage.
 *
 * customizer field         -> CSS variable(s)
 * ---------------------    -> --------------------------------
 * light_header_bg         -> --header-background-color  (sidebar bg)
 *                         -> --card-bg                  (topbar bg)
 * light_body_bg           -> --background-color         (shell bg)
 *                         -> --page-bg                  (inner page backgrounds)
 * light_accent_color      -> --primary-color            (active-gradient, avatar border)
 *                         -> --accent-color             (active-gradient)
 * light_footer_bg         -> --footer-background-color
 *
 * Only Light Mode is customizable - Dark Mode always keeps the app's own
 * built-in dark styling, so there is no dark_* half of this map. A
 * MutationObserver re-paints (or un-paints) when the user toggles
 * data-theme.
 */
const PAINT_MAP = [
  ['light_header_bg',  ['--header-background-color']],
  ['light_sidebar_bg', ['--sidebar-bg']],
  ['light_card_bg',    ['--card-bg']],
  ['light_body_bg',    ['--background-color', '--page-bg']],
  ['light_accent_color',['--primary-color', '--accent-color']],
  ['light_footer_bg',  ['--footer-background-color']],
]

function getTheme() {
  const theme = document.documentElement.getAttribute('data-theme')
  const appearance = localStorage.getItem('appearance')
  return theme === 'dark' ? 'dark' : (appearance === 'dark' ? 'dark' : 'light')
}

function paintTheme(data, theme) {
  const root = document.documentElement.style
  if (theme !== 'light') {
    // Dark mode is not customizable - remove any painted light-mode
    // values so the app's own default dark styling shows through.
    for (const [, cssVars] of PAINT_MAP) {
      for (const cv of cssVars) root.removeProperty(cv)
    }
    return
  }
  for (const [field, cssVars] of PAINT_MAP) {
    const value = data[field]
    if (value) {
      for (const cv of cssVars) {
        root.setProperty(cv, value)
      }
    }
  }
}

const BrandingContext = createContext({ name: 'PRMS', logoUrl: null, colors: {} })

/**
 * Mounted once at the app root (see App.jsx) so the customizer's colors
 * stay painted across every route and role for the whole session, instead
 * of only while a single page (the old per-page hook this replaced) is
 * mounted. Being permanently mounted also means the CSS variables never
 * need to be un-painted on navigation - there's nowhere to leak from.
 */
export function BrandingProvider({ children }) {
  const [name, setName] = useState('PRMS')
  const [logoUrl, setLogoUrl] = useState(null)
  const [colors, setColors] = useState({})

  useEffect(() => {
    let observer = null
    let cancelled = false

    async function load() {
      try {
        const r = await customizerApi.getConfig()
        if (cancelled) return
        const data = r?.data ?? r
        if (!data) return

        if (data.company_name) setName(data.company_name)
        if (data.logo_url) {
          setLogoUrl(getFullUrl(data.logo_url))
        }

        setColors(data)
        paintTheme(data, getTheme())

        observer = new MutationObserver(() => {
          paintTheme(data, getTheme())
        })
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        })
      } catch {
        // branding optional
      }
    }

    load()

    return () => {
      cancelled = true
      if (observer) observer.disconnect()
    }
  }, [])

  return (
    <BrandingContext.Provider value={{ name, logoUrl, colors }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}

export default useBranding
