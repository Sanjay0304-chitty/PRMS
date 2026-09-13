import { useState } from 'react';
import { Upload, Image as ImageIcon, Type } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { getImageUrl } from '../../config/imageHelper';

export default function BrandingSection({ settings, onUpdate, onLogoUpload }) {
  const [previewUrl, setPreviewUrl] = useState(() => {
    if (settings?.branding_logo_url) return getImageUrl(settings.branding_logo_url);
    return '';
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  /* ---- Image upload ---- */
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    /* Validate type & size (5 MB) */
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Logo must be PNG, JPG, WebP or SVG');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be smaller than 5 MB');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const local = URL.createObjectURL(file);
      setPreviewUrl(local);

      await adminApi.uploadLogo(file);
      /* Update settings in parent so it persists */
      onLogoUpload?.(file);
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  /* ---- Brand name ---- */
  const handleNameChange = (e) => {
    onUpdate?.('branding_site_name', e.target.value);
  };

  /* ---- Company name ---- */
  const handleCompanyChange = (e) => {
    onUpdate?.('branding_company_name', e.target.value);
  };

  return (
    <div className="wc-branding">
      {/* Logo */}
      <div className="wc-branding-row">
        <label className="wc-branding-label">
          <ImageIcon size={15} />
          Logo
        </label>
        <div className="wc-branding-preview">
          {previewUrl ? (
            <img src={previewUrl} alt="Logo preview" className="wc-logo-img" />
          ) : (
            <div className="wc-logo-placeholder">No logo</div>
          )}
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          id="logo-upload"
          className="wc-hidden-input"
          onChange={handleLogoChange}
        />
        <label htmlFor="logo-upload" className={`wc-upload-btn ${uploading ? 'wc-uploading' : ''}`}>
          <Upload size={14} />
          {uploading ? 'Uploading...' : 'Upload Logo'}
        </label>
        {error && <span className="wc-error">{error}</span>}
      </div>

      {/* Site Name */}
      <div className="wc-branding-row">
        <label className="wc-branding-label">
          <Type size={15} />
          Site Name
        </label>
        <input
          type="text"
          className="wc-input"
          value={settings?.branding_site_name || ''}
          onChange={handleNameChange}
          placeholder="PRMS"
        />
      </div>

      {/* Company Name */}
      <div className="wc-branding-row">
        <label className="wc-branding-label">
          <Type size={15} />
          Company Name
        </label>
        <input
          type="text"
          className="wc-input"
          value={settings?.branding_company_name || ''}
          onChange={handleCompanyChange}
          placeholder="Property Rental Management System"
        />
      </div>
    </div>
  );
}
