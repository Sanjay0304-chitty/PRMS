/* SettingField — reusable form-field renderer for the Customize page.
   Supports: text, textarea, color, toggle, select, tel, email.
*/

export default function SettingField({ field, value, onChange, onToggleEdit, isEditing, settingsRef, id }) {
  const handleOnChange = (key, val) => {
    onChange?.(val);
  };

  switch (field.type) {
    case 'color':
      return (
        <div className="wc-field wc-color-field" id={id}>
          <label className="wc-label">{field.label}</label>
          <div className="wc-color-inputs">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => handleOnChange(field.key, e.target.value)}
            />
            <input
              type="text"
              className="wc-hex"
              value={value || ''}
              onChange={(e) => handleOnChange(field.key, e.target.value)}
              placeholder="#8a2be2"
            />
            <div
              className="wc-color-swatch"
              style={{ background: value || 'transparent' }}
              title={value || 'Not set'}
            />
          </div>
        </div>
      );

    case 'toggle':
      return (
        <div className="wc-field wc-toggle-field">
          <label className="wc-label">{field.label}</label>
          <button
            type="button"
            className={`wc-toggle-btn ${String(value) === 'true' ? 'wc-toggle-on' : 'wc-toggle-off'}`}
            onClick={() => handleOnChange(field.key, String(value) === 'true' ? 'false' : 'true')}
          >
            {String(value) === 'true' ? 'ON' : 'OFF'}
          </button>
          <span className="wc-help-text">{field.help || ''}</span>
        </div>
      );

    case 'select':
      const opts = field.options;
      return (
        <div className="wc-field">
          <label className="wc-label">{field.label}</label>
          <select
            value={value || ''}
            onChange={(e) => handleOnChange(field.key, e.target.value)}
            className="wc-select"
          >
            {Array.isArray(opts)
              ? opts.map((opt) => (
                  <option key={opt.value ?? opt} value={opt.value ?? opt}>
                    {opt.label ?? opt}
                  </option>
                ))
              : opts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );

    case 'textarea':
      return (
        <div className="wc-field">
          <label className="wc-label">{field.label}</label>
          <textarea
            className="wc-textarea"
            rows={3}
            value={value || ''}
            onChange={(e) => handleOnChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );

    default:
      return (
        <div className="wc-field">
          <label className="wc-label">{field.label}</label>
          <input
            type={field.type || 'text'}
            className="wc-input"
            value={value || ''}
            onChange={(e) => handleOnChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
          {field.help && <span className="wc-help-text">{field.help}</span>}
        </div>
      );
  }
}
