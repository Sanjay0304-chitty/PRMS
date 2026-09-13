import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSettings } from '../contexts/SettingsContext'
import { useBranding } from '../contexts/BrandingContext'
import ThemeSwitcher from '../components/ThemeSwitcher'
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react'
import { getImageUrl } from '../config/imageHelper';
import './GuestHome.css';

function GuestHome() {
  const navigate = useNavigate()
  const { settings, loadSettings } = useSettings()

  /* Track the active theme so branding colors below can pick the correct
     light_ or dark_ customizer field — without this, a light-only override
     (e.g. a white header) stayed pinned on regardless of dark mode. */
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  // Website Customizer branding (2026-09-09, ported feature) - takes
  // priority when set, falls back to the existing settings-driven values
  // below untouched otherwise. Additive only: nothing here changes if the
  // customizer has never been configured.
  const branding = useBranding()
  const brandName = branding.name || settings?.branding_site_name || 'PRMS'
  const brandLogo = branding.logoUrl || settings?.branding_logo_url

  /* Fallback hero content from settings */
  const heroTitle = settings?.homepage_hero_title || 'Find Your Perfect Space in Malaysia\'s Most Trusted Ecosystem.'
  const heroSubtitle = settings?.homepage_hero_subtitle || 'Experience seamless property discovery with PRMS. Browse verified homes, compare listings, and connect with trusted landlords.'
  const heroButtonText = settings?.homepage_hero_button_text || 'Browse Properties'
  const heroButtonLink = settings?.homepage_hero_button_link || '/search'
  const heroImage = settings?.homepage_hero_image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop'

  /* Section visibility toggles */
  const showHero = settings?.homepage_show_hero !== false
  const showSearchBar = settings?.homepage_show_search_bar !== false
  const showFeatured = settings?.homepage_show_featured !== false
  const showFeatures = settings?.homepage_show_features !== false
  const showTestimonials = settings?.homepage_show_testimonials !== false
  const showCta = settings?.homepage_show_cta !== false
  const showAbout = settings?.homepage_show_about !== false

  /* About section content */
  const aboutTitle = settings?.homepage_about_title || 'About PRMS Malaysia'
  const aboutDescription = settings?.homepage_about_description || 'PRMS Malaysia is the leading property rental management system, providing secure and transparent connections between landlords and tenants throughout Malaysia.'
  const aboutAlignment = settings?.homepage_about_text_alignment || 'centered'

  /* Hero text alignment */
  const heroAlignment = settings?.homepage_hero_text_alignment || 'left'

  /* Header / Footer background colors.
     The Website Customizer is per-account now - a real config row (with a
     real `id`) only exists once someone is logged in and has viewed/saved
     it. An anonymous visitor gets back the plain guest defaults (id:
     null) from BrandingContext, which always has *some* color in every
     field - so checking those fields for truthiness can never actually
     detect "unconfigured" anymore. Gate on `colors?.id` instead: only a
     genuinely-customized account's colors get applied here; a guest
     always falls through to the navbar's own default CSS background
     (var(--navbar-bg-glass)), which is designed to read correctly in
     both light and dark mode regardless of what any account's own
     customizer happens to be set to. */
  const hasRealCustomization = !!branding.colors?.id
  const headerBg = !hasRealCustomization
    ? null
    : theme === 'dark'
      ? (branding.colors?.dark_header_bg || null)
      : (branding.colors?.light_header_bg || settings?.header_background_color || null)
  const footerBg = !hasRealCustomization
    ? '#0f172a'
    : theme === 'dark'
      ? (branding.colors?.dark_footer_bg || '#0f172a')
      : (branding.colors?.light_footer_bg || settings?.footer_background_color || '#0f172a')

  /* Footer copyright */
  const footerCopyright = settings?.footer_copyright_text || '© 2024 PRMS Malaysia. All rights reserved.'

  const neighbourhoods = [
    {
      name: 'Bukit Bintang',
      tag: 'City Center',
      listings: '428 verified listings',
      image:
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Mont Kiara',
      tag: 'Expat Choice',
      listings: '315 verified listings',
      image:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
    },
    {
      name: 'Bangsar',
      tag: 'Premium Living',
      listings: '192 verified listings',
      image:
        'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    },
  ]

  const homes = [
    {
      title: 'Luxury Condo in Kuala Lumpur',
      location: 'KLCC, Kuala Lumpur',
      price: 'RM 2,500 / month',
      rating: '4.92',
      image:
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Modern Loft Apartment',
      location: 'Bukit Bintang',
      price: 'RM 1,850 / month',
      rating: '4.87',
      image:
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Premium Studio Residence',
      location: 'Mont Kiara',
      price: 'RM 2,200 / month',
      rating: '4.95',
      image:
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Family Home with Pool',
      location: 'Petaling Jaya',
      price: 'RM 3,800 / month',
      rating: '4.91',
      image:
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80',
    },
  ]

  function handleSearch() {
    navigate('/search')
  }

  return (
    <main className="guest-page">
      <header className="guest-navbar" data-customize-id="global.header" style={headerBg ? { backgroundColor: headerBg } : undefined}>
        <Link to="/" className="guest-logo">
          {brandLogo ? (
            <img src={branding.logoUrl ? brandLogo : getImageUrl(brandLogo)} alt="Logo" className="guest-logo-img" />
          ) : null}
          <span>{brandName}</span>
        </Link>

        <nav>
          <a href="#find-home" className="active">
            Find a Home
          </a>
          <a href="#landlords">For Landlords</a>
          <a href="#insights">Market Insights</a>
          <a href="#help">Help Center</a>
        </nav>

        <div className="guest-nav-actions">
          <ThemeSwitcher />
          <Link to="/login" className="guest-signin">
            Sign In
          </Link>

          <Link to="/register" className="guest-join-btn">
            Join Now
          </Link>
        </div>
      </header>

      {showHero && (
        <section className="guest-hero" data-customize-id="home.hero" id="find-home">
          <div className="guest-hero-overlay"></div>

          <motion.div
            className="guest-hero-content"
            style={{ textAlign: heroAlignment === 'centered' ? 'center' : heroAlignment === 'right' ? 'right' : 'left' }}
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          >
            <motion.div
              className="guest-hero-badge"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.45 }}
            >
              <Sparkles size={17} />
              Malaysia Property Rental Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.55 }}
            >
              {heroTitle}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.55 }}
            >
              {heroSubtitle}
            </motion.p>

            {showSearchBar && (
              <motion.div
                className="guest-search-box"
                data-customize-id="home.search"
                initial={{ opacity: 0, y: 26, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
              >
                <div className="guest-search-input">
                  <MapPin size={20} />
                  <input type="text" placeholder="Enter neighborhood or property type..." />
                </div>

                <motion.button
                  type="button"
                  data-customize-id="home.search.button"
                  onClick={handleSearch}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Search size={18} />
                  Search
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </section>
      )}

      <section className="guest-trust-bar" data-customize-id="home.trust-bar">
        <div>
          <ShieldCheck size={20} />
          Bank-Level Security
        </div>

        <div>
          <UserRoundCheck size={20} />
          KYC Verified Entities
        </div>

        <div>
          <CheckCircle2 size={20} />
          24/7 Local Support
        </div>

        <div>
          <Banknote size={20} />
          Bank Negara Compliant
        </div>
      </section>

      {showFeatures && (
        <section className="guest-section guest-role-section" id="landlords">
          <motion.div
            className="guest-section-title"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <h2>Tailored Solutions for Every Role</h2>
            <span></span>
          </motion.div>

          <div className="guest-role-grid">
            <motion.article
              className="guest-role-card tenant"
              data-customize-id="component.role-card"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              whileHover={{ y: -8 }}
            >
              <div className="guest-role-icon">
                <UserRoundCheck size={27} />
              </div>

              <h3>For Tenants</h3>
              <p>
                Browse thousands of verified listings, book instantly, and manage
                your stay with reminders, payments, and localized maps.
              </p>

              <div className="guest-map-preview">
                <MapPin size={38} />
                <span>Verified property area</span>
              </div>

              <Link to={heroButtonLink}>
                Explore Verified Listings <ArrowRight size={18} />
              </Link>
            </motion.article>

            <motion.article
              className="guest-role-card landlord"
              data-customize-id="component.role-card"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.45 }}
              whileHover={{ y: -8 }}
            >
              <div className="guest-role-icon dark">
                <Building2 size={27} />
              </div>

              <h3>For Landlords</h3>
              <p>
                Maximize your property&apos;s potential with listing management,
                occupancy tracking, tenant screening, and automated reporting.
              </p>

              <div className="guest-revenue-card">
                <p>Total Revenue MYR</p>
                <h4>RM 142,500.00</h4>
                <div className="guest-bars">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <Link to="/register">
                Professional Listing Portal <ArrowRight size={18} />
              </Link>
            </motion.article>
          </div>
        </section>
      )}

      {showFeatured && (
        <section className="guest-section guest-listings-section" data-customize-id="home.listings">
          <div className="guest-section-header">
            <div>
              <h2>Popular Homes in Kuala Lumpur</h2>
              <p>Explore verified properties inspired by modern rental platforms.</p>
            </div>

            <button type="button" onClick={handleSearch}>
              View All Homes
            </button>
          </div>

          <div className="guest-home-row">
            {homes.map((home, index) => (
              <motion.article
                className="guest-home-card"
                data-customize-id="component.property-card"
                key={home.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                whileHover={{ y: -7 }}
              >
                <div className="guest-home-image">
                  <img src={getImageUrl(home.image)} alt={home.title} />
                  <span>Guest favorite</span>
                </div>

                <h3>{home.title}</h3>
                <p>{home.location}</p>

                <div className="guest-home-meta">
                  <strong>{home.price}</strong>
                  <span>★ {home.rating}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      <section className="guest-section guest-neighbourhood-section" id="insights">
        <div className="guest-section-header">
          <div>
            <h2>Explore Prime Neighborhoods</h2>
            <p>Discover the heart of Kuala Lumpur&apos;s living spaces.</p>
          </div>

          <button type="button" onClick={handleSearch}>
            View All Areas
          </button>
        </div>

        <div className="guest-neighbourhood-grid">
          {neighbourhoods.map((item, index) => (
            <motion.article
              className="guest-neighbourhood-card"
              key={item.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.45 }}
              whileHover={{ y: -8, scale: 1.015 }}
            >
              <img src={getImageUrl(item.image)} alt={item.name} />
              <div></div>

              <section>
                <span>{item.tag}</span>
                <h3>{item.name}</h3>
                <p>{item.listings}</p>
              </section>
            </motion.article>
          ))}
        </div>
      </section>

      {showAbout && (
        <section className="guest-section guest-about-section" data-customize-id="home.about">
          <motion.div
            className="guest-about-content"
            style={{
              textAlign: aboutAlignment === 'centered' ? 'center' : aboutAlignment === 'right' ? 'right' : 'left',
            }}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            {aboutTitle && <h2>{aboutTitle}</h2>}
            <p>{aboutDescription}</p>
          </motion.div>
        </section>
      )}

      {showCta && (
        <section className="guest-cta">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <h2>Ready to start your journey?</h2>
            <p>
              Join PRMS Malaysia today and experience the future of localized
              property management.
            </p>

            <div>
              <Link to="/register">Sign Up for Free</Link>
              <button type="button" onClick={handleSearch}>
                Explore Properties
              </button>
            </div>
          </motion.div>
        </section>
      )}

      <footer className="guest-footer" data-customize-id="global.footer" id="help" style={{ backgroundColor: footerBg }}>
        <h3>PRMS Malaysia</h3>

        <nav>
          <a href="#">Terms of Service</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Tenant Rights MY</a>
          <a href="#">Landlord Guidelines</a>
          <a href="#">Contact Us</a>
        </nav>

        <p className="guest-footer-copyright">{footerCopyright}</p>
      </footer>
    </main>
  )
}

export default GuestHome
