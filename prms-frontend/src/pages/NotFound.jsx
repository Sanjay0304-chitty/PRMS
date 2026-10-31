import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--page-bg)',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--primary-color)', margin: 0 }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '1rem 0 0.5rem' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem', maxWidth: 400 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--primary-color)',
          color: '#fff',
          borderRadius: 12,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={20} />
        Back to Home
      </Link>
    </div>
  );
}

export default NotFound;
