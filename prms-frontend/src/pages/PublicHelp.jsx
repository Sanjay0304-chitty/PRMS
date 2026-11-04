import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../components/PublicLayout';
export default function PublicHelp() {
  return <><PublicHeader /><main className="public-help"><h1>How can we help?</h1>
    <section><h2>Find a rental property</h2><p>Browse available listings, search by location or property type, and filter by monthly rent. Open a property to review its photos, description and availability.</p><Link to="/properties">Browse Properties</Link></section>
    <section><h2>Apply or request a viewing</h2><p>Sign in with a Tenant account to apply or request a viewing. Applying does not require payment. The property manager reviews your application before a tenancy is agreed.</p><Link to="/role-selection?role=Tenant">Create a Tenant account</Link></section>
    <section id="landlords"><h2>Landlords and Agents</h2><p>Landlords manage their properties and assign registered Agents. Agents manage only assigned properties. Sign in to access your role’s dashboard, maintenance, applications and messages.</p><Link to="/role-selection?role=Landlord">Create a Landlord account</Link></section>
    <section><h2>Report a listing or get account help</h2><p>Use Report on a property listing to flag incorrect information or suspicious content. Use Forgot Password on the sign-in page for account recovery. Signed-in users can use their portal’s Help and Messages pages.</p><Link to="/forgot-password">Forgot Password</Link></section>
    <section><h2>Rental terms and personal data</h2><p>Review the tenancy agreement before signing. Cancellation and refund arrangements depend on the agreed terms; this website does not promise a universal refund period.</p><Link to="/terms">Terms and Conditions</Link> · <Link to="/privacy-notice">Privacy Notice</Link></section>
  </main><PublicFooter /></>;
}
