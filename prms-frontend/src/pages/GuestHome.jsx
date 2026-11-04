import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Building2, CalendarDays, Check, CircleCheck, Home, KeyRound, MapPin, Search, Sparkles, UserRoundCheck, Users } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';
import PrivateImage from '../components/PrivateImage';
import { getImageUrl } from '../config/imageHelper';
import { propertyApi } from '../api';
import { propertyTypeLabel } from '../config/propertyTypes';
import './GuestHome.css';

const roles = [
  { role: 'Tenant', icon: Home, title: 'A place to call your own.', description: 'Find a home that fits your life, with the details you need to make your next move.', features: ['Browse homes and arrange viewings', 'Follow your rental application', 'Manage payments and maintenance'] },
  { role: 'Landlord', icon: Building2, title: 'Your portfolio, organised.', description: 'Spend less time keeping track and more time looking after your properties.', features: ['Keep your property listings up to date', 'Review applications and tenancies', 'Assign Agents and follow up on repairs'] },
  { role: 'Agent', icon: Users, title: 'Make every handover easier.', description: 'Stay connected to the Landlords, properties and tasks assigned to you.', features: ['Access your assigned properties', 'Coordinate viewings and maintenance', 'Keep property conversations together'] },
];
const steps = [
  { icon: Search, title: 'Find your space', description: 'Explore listings by location, property type and monthly rent.' },
  { icon: CalendarDays, title: 'See it for yourself', description: 'Sign in as a Tenant to arrange a viewing and ask the property manager questions.' },
  { icon: KeyRound, title: 'Make your next move', description: 'Submit your application, review your agreement and manage your tenancy in one place.' },
];
const photos = property => (property?.images || []).filter(image => !image.type || image.type === 'image').map(image => getImageUrl(image.url));
const money = value => `RM ${Number(value || 0).toLocaleString()}`;

export default function GuestHome() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    propertyApi.list({ limit: 4, status: 'AVAILABLE', publicOnly: true }).then(res => {
      if (active) { setHomes(res.data?.data || []); setError(''); }
    }).catch(() => { if (active) setError('Unable to load available properties. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const heroHome = homes[0];
  const heroPhotos = photos(heroHome);
  const search = (text = query) => navigate(text.trim() ? `/properties?search=${encodeURIComponent(text.trim())}` : '/properties');

  return <div className="guest-page home-redesign"><PublicHeader /><main>
    {settings?.homepage_show_hero !== false && <section className="home-hero" id="find-home" data-customize-id="home.hero" aria-labelledby="home-title">
      {heroPhotos.length > 0 && <PrivateImage className="home-hero-photo" src={heroPhotos[0]} fallbackSources={heroPhotos.slice(1)} alt="" fetchPriority="high" />}
      <div className="home-hero-shade" />
      <div className="home-hero-content">
        <span className="home-eyebrow home-eyebrow-light"><Sparkles size={15} /> A fresh start begins with the right space</span>
        <h1 id="home-title">{settings?.homepage_hero_title || 'Find your next place to call home.'}</h1>
        <p className="home-hero-description">{settings?.homepage_hero_subtitle || 'Discover rental homes across Malaysia. From your first viewing to everyday living, bring it all together with PRMS.'}</p>
        {settings?.homepage_show_search_bar !== false && <><form className="home-search" onSubmit={e => { e.preventDefault(); search(); }}>
          <div className="home-search-field"><MapPin size={22} /><label htmlFor="home-search">Where would you like to live?<input id="home-search" aria-label="Search by location, name or property type" placeholder="City, neighbourhood or property type" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
          <button type="submit">Find a home <Search size={19} /></button>
        </form><div className="home-quick-search"><span>Explore</span>{['Kuala Lumpur','Petaling Jaya','Condo','Studio'].map(tag => <button type="button" key={tag} onClick={() => search(tag)}>{tag}<ArrowUpRight size={12} /></button>)}</div></>}
        <div className="home-hero-benefits"><span><CircleCheck size={16} /> Live availability</span><span><CalendarDays size={16} /> Viewing requests</span><span><KeyRound size={16} /> Tenancy management</span></div>
      </div>
      {heroHome && <Link className="home-hero-listing" to={`/properties/${heroHome.id}`}><span className="home-hero-listing-label">A little inspiration for your next move <ArrowUpRight size={17} /></span><strong>{heroHome.title}</strong><span><MapPin size={14} /> {heroHome.city || heroHome.address}</span><div><b>{money(heroHome.rent)}</b><span> / month</span><span className="home-availability"><i /> Available</span></div></Link>}
      <div className="home-hero-bottom"><span>DISCOVER. CONNECT. SETTLE IN.</span><span>Property rental, thoughtfully connected.</span></div>
    </section>}

    {settings?.homepage_show_featured !== false && <section className="home-section" data-customize-id="home.listings" aria-labelledby="home-listings-title">
      <div className="home-section-heading"><div><span className="home-eyebrow"><span className="home-live-dot" /> READY FOR YOUR NEXT CHAPTER</span><h2 id="home-listings-title">Find a space that feels like you.</h2><p>Available rental properties, straight from our catalogue.</p></div><Link className="home-text-link" to="/properties">Explore all properties <ArrowRight size={18} /></Link></div>
      {loading && <div className="home-loading" role="status">Finding your next space…</div>}
      {error && <div className="home-notice" role="alert"><p>{error}</p><button className="public-primary" onClick={() => { setLoading(true); setRetry(retry + 1); }}>Try Again</button></div>}
      {!loading && !error && !homes.length && <div className="home-notice"><Building2 size={32} /><p>No available properties right now. Please check back later.</p></div>}
      <div className="home-property-grid">{homes.map(home => {
        const images = photos(home);
        return <Link className="home-property-card" key={home.id} to={`/properties/${home.id}`}>
          <div className="home-property-image"><PrivateImage src={images[0]} fallbackSources={images.slice(1)} alt={home.title} loading="lazy" /><span className="home-property-type">{propertyTypeLabel(home.property_type)}</span><span className="home-property-open" aria-hidden="true"><ArrowUpRight size={20} /></span></div>
          <div className="home-property-content"><p className="home-property-location"><MapPin size={13} /> {[home.city,home.state].filter(Boolean).join(', ') || home.address}</p><h3>{home.title}</h3><div className="home-property-price"><p><strong>{money(home.rent)}</strong><span> / month</span></p><span className="home-review">{home.reviewsCount ? `★ ${Number(home.rating).toFixed(1)}` : 'No reviews yet'}</span></div></div>
        </Link>;
      })}</div>
    </section>}

    <section className="home-how-section"><div className="home-section home-how-inner"><div className="home-section-heading"><div><span className="home-eyebrow">LESS FRICTION. MORE LIVING.</span><h2>Your next move, made simpler.</h2></div><p className="home-heading-note">A clear path from finding a listing<br />to feeling at home.</p></div><div className="home-steps">{steps.map((step,index) => <article className="home-step" key={step.title}><div className="home-step-top"><span className="home-step-icon"><step.icon size={25} /></span><span className="home-step-number">0{index+1}</span></div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div></div></section>

    {settings?.homepage_show_features !== false && <section className="home-section home-roles-section" id="landlords"><div className="home-section-heading"><div><span className="home-eyebrow">ONE PLATFORM. YOUR PERSPECTIVE.</span><h2>Built around the way you rent.</h2><p>Different roles. One connected rental experience.</p></div></div><div className="home-role-grid">{roles.map(item => <article className={`home-role home-role-${item.role.toLowerCase()}`} key={item.role}><span className="home-role-icon"><item.icon size={24} /></span><span className="home-role-label">FOR {item.role.toUpperCase()}S</span><h3>{item.title}</h3><p>{item.description}</p><ul>{item.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul><Link to={`/role-selection?role=${item.role}`}>Get started as {item.role === 'Agent' ? 'an' : 'a'} {item.role} <ArrowUpRight size={18} /></Link></article>)}</div></section>}

    {settings?.homepage_show_about !== false && <section className="home-section home-about"><div className="home-about-photo">{photos(homes[1]).length > 0 ? <PrivateImage src={photos(homes[1])[0]} fallbackSources={photos(homes[1]).slice(1)} alt="An interior from our rental catalogue" loading="lazy" /> : <div className="home-about-placeholder"><Home size={64} /></div>}<div className="home-about-photo-caption"><KeyRound size={21} /><span>A space for every new beginning.</span></div></div><div className="home-about-content"><span className="home-eyebrow">MORE THAN A PROPERTY SEARCH</span><h2>{settings?.homepage_about_title && settings.homepage_about_title !== 'About Us' ? settings.homepage_about_title : 'A home for your rental journey.'}</h2><p>{settings?.homepage_about_description || 'PRMS connects Tenants, Landlords and assigned Agents through a shared rental management system.'}</p><div className="home-about-points"><span><UserRoundCheck size={20} /> The right workspace for your role</span><span><Building2 size={20} /> Listings and tenancies in one place</span><span><CircleCheck size={20} /> Connected maintenance and communication</span></div><Link className="home-text-link" to="/help">Get to know PRMS <ArrowRight size={18} /></Link></div></section>}

    {settings?.homepage_show_cta !== false && <section className="home-section home-cta-wrap"><div className="home-cta"><div className="home-cta-decoration" aria-hidden="true"><Home /></div><div><span className="home-eyebrow home-eyebrow-light">YOUR NEXT CHAPTER STARTS HERE</span><h2>Make room for what’s next.</h2><p>Find a place. Manage a property. Bring your rental journey together.</p></div><div className="home-cta-actions"><Link to="/role-selection">Find your place in PRMS <ArrowUpRight size={20} /></Link><Link to="/properties">Just looking? Explore properties <ArrowRight size={16} /></Link></div></div></section>}
    </main><PublicFooter />
  </div>;
}
