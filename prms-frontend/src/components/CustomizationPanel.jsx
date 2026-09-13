import { useState, useCallback, useEffect } from 'react';
import { useCustomization } from '../contexts/CustomizationContext';
import './CustomizationPanel.css';

/* ------------------------------------------------------------------ */
/*  Scope selector options                                             */
/* ------------------------------------------------------------------ */
const SCOPES = {
  THIS_ELEMENT: 'this_element',
  GLOBAL: 'global',
};

/* ------------------------------------------------------------------ */
/*  Spacing sub-grid (top / right / bottom / left)                     */
/* ------------------------------------------------------------------ */
function SpacingInputs({ value = '', onChange, labels }) {
  const [vals, setVals] = useState({
    top: value.top ?? '',
    right: value.right ?? '',
    bottom: value.bottom ?? '',
    left: value.left ?? '',
  });

  const commit = useCallback(() => {
    onChange(vals);
  }, [onChange, vals]);

  const handleChange = (side) => (e) => {
    setVals(prev => ({ ...prev, [side]: e.target.value }));
  };

  return (
    <div className="wc-spacing-grid" onBlur={commit}>
      {Object.entries(labels).map(([side, label]) => (
        <div key={side} className="wc-spacing-item">
          <span className="wc-spacing-label">{label}</span>
          <input
            type="number"
            className="wc-input"
            value={vals[side]}
            onChange={handleChange(side)}
            placeholder="0"
            min="0"
          />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */
export default function CustomizationPanel() {
  const {
    selectedElement, setSelectedElement, updateElementStyle,
    editingTheme, draftConfig,
  } = useCustomization();

  const [_scope, setScope] = useState(SCOPES.THIS_ELEMENT);
  const [themeKey, setThemeKey] = useState(editingTheme);
  const [isAdvanced, setIsAdvanced] = useState(false);

  /* Sync panel themeKey with context editingTheme */
   
  useEffect(() => {
    setThemeKey(editingTheme);
  }, [editingTheme]);

  /* Live CSS variable injection — apply draftConfig overrides to <html> */
  useEffect(() => {
    const root = document.documentElement;
    const current = draftConfig[editingTheme] || {};

    for (const [customizeId, styles] of Object.entries(current)) {
      for (const [prop, value] of Object.entries(styles)) {
        // CSS custom variable per element+property
        root.style.setProperty(`--cz-${customizeId}-${prop}`, value);
        // Also apply directly to matching elements
        const el = document.querySelector(`[data-customize-id="${customizeId}"]`);
        if (el) {
          el.style[prop] = value;
        }
      }
    }
  }, [draftConfig, editingTheme]);

  /* Color state */
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTitleColor] = useState('#111827');

  /* Typography state */
  const [fontSize, setFontSize] = useState(16);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  /* Advanced: Spacing state */
  const [padding, setPadding] = useState({ top: '', right: '', bottom: '', left: '' });
  const [margin, setMargin] = useState({ top: '', right: '', bottom: '', left: '' });

  /* Advanced: Border state */
  const [borderRadius, setBorderRadius] = useState(0);
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderStyle, setBorderStyle] = useState('none');
  const [borderColor, setBorderColor] = useState('#d1d5db');

  /* Advanced: Custom CSS */
  const [customCSS, setCustomCSS] = useState('');

  /* Apply all accumulated changes to the draft config */
  const applyChange = useCallback((styleKey, styleValue) => {
    if (!selectedElement) return;
    updateElementStyle(selectedElement.id, themeKey, { [styleKey]: styleValue });
  }, [selectedElement, themeKey, updateElementStyle]);

  if (!selectedElement) {
    return (
      <div className="wc-panel cp-panel-empty" data-customize-id="cp-empty">
        <div className="wc-panel-header cp-empty-header">
          <h3 className="cp-title">Customization</h3>
          <p className="cp-hint">Click any highlighted element to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <aside className="wc-panel" data-customize-id="cu-panel">
      {/* -- Header -- */}
      <div className="wc-panel-header cp-header">
        <div className="cp-element-info">
          <span className="cp-tag">&lt;{selectedElement.tag}&gt;</span>
          <span className="cp-id">#{selectedElement.id}</span>
        </div>
        <button
          className="wc-reset-btn cp-close-btn"
          onClick={() => setSelectedElement(null)}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* -- Mode Toggle -- */}
      <div className="wc-mode-toggle">
        <button className={!isAdvanced ? 'active' : ''} onClick={() => setIsAdvanced(false)}>Basic</button>
        <button className={isAdvanced ? 'active' : ''} onClick={() => setIsAdvanced(true)}>Advanced</button>
      </div>

      {/* -- Theme + Scope -- */}
      <div className="wc-tab-content cp-sections">
        <div className="wc-field cp-scope-field">
          <label className="wc-label">Theme</label>
          <select
            className="wc-select"
            value={themeKey}
            onChange={e => setThemeKey(e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="wc-field cp-scope-field">
          <label className="wc-label">Scope</label>
          <div className="wc-scope-selector">
            <label><input type="radio" name="scope" value="instance" defaultChecked onChange={() => setScope('instance')} /> This element</label>
            <label><input type="radio" name="scope" value="component" onChange={() => setScope('component')} /> Component</label>
            <label><input type="radio" name="scope" value="page" onChange={() => setScope('page')} /> Page</label>
            <label><input type="radio" name="scope" value="global" onChange={() => setScope('global')} /> Global</label>
          </div>
        </div>

        {/* -- Color -- */}
        <div className="wc-section cp-section">
          <h4 className="wc-section-title">Color</h4>

          <div className="wc-color-field">
            <label className="wc-label">Background</label>
            <div className="wc-color-inputs">
              <input
                type="color"
                value={bgColor}
                onChange={e => { setBgColor(e.target.value); applyChange('backgroundColor', e.target.value); }}
              />
              <input
                type="text"
                className="wc-hex"
                value={bgColor}
                onChange={e => { setBgColor(e.target.value); applyChange('backgroundColor', e.target.value); }}
              />
            </div>
          </div>

          <div className="wc-color-field">
            <label className="wc-label">Text color</label>
            <div className="wc-color-inputs">
              <input
                type="color"
                value={textColor}
                onChange={e => { setTitleColor(e.target.value); applyChange('color', e.target.value); }}
              />
              <input
                type="text"
                className="wc-hex"
                value={textColor}
                onChange={e => { setTitleColor(e.target.value); applyChange('color', e.target.value); }}
              />
            </div>
          </div>
        </div>

        {/* -- Typography -- */}
        <div className="wc-section cp-section">
          <h4 className="wc-section-title">Typography</h4>

          <div className="wc-field">
            <label className="wc-label">Font size: {fontSize}px</label>
            <input
              type="range"
              min="8"
              max="72"
              className="wc-input"
              value={fontSize}
              onChange={e => { setFontSize(e.target.value); applyChange('fontSize', `${e.target.value}px`); }}
            />
          </div>

          <div className="wc-field cp-typography-toggles">
            <label className="wc-label">Weight</label>
            <button
              className={`wc-toggle-btn ${bold ? 'wc-toggle-on' : 'wc-toggle-off'}`}
              onClick={() => { setBold(v => !v); applyChange('fontWeight', !bold ? 'bold' : 'normal'); }}
            >
              Bold
            </button>
          </div>

          <div className="wc-field cp-typography-toggles">
            <label className="wc-label">Style</label>
            <button
              className={`wc-toggle-btn ${italic ? 'wc-toggle-on' : 'wc-toggle-off'}`}
              onClick={() => { setItalic(v => !v); applyChange('fontStyle', !italic ? 'italic' : 'normal'); }}
            >
              Italic
            </button>
          </div>
        </div>

        {/* -- Spacing (Advanced only) -- */}
        {isAdvanced && (
          <div className="wc-section cp-section">
            <h4 className="wc-section-title">Spacing</h4>

            <div className="wc-field">
              <label className="wc-label">Padding</label>
              <SpacingInputs
                value={padding}
                onChange={val => { setPadding(val); applyChange('padding', val); }}
                labels={{ top: 'T', right: 'R', bottom: 'B', left: 'L' }}
              />
            </div>

            <div className="wc-field">
              <label className="wc-label">Margin</label>
              <SpacingInputs
                value={margin}
                onChange={val => { setMargin(val); applyChange('margin', val); }}
                labels={{ top: 'T', right: 'R', bottom: 'B', left: 'L' }}
              />
            </div>
          </div>
        )}

        {/* -- Border (Advanced only) -- */}
        {isAdvanced && (
          <div className="wc-section cp-section">
            <h4 className="wc-section-title">Border</h4>

            <div className="wc-field">
              <label className="wc-label">
                Border radius: {borderRadius}px
              </label>
              <input
                type="range"
                min="0"
                max="50"
                className="wc-input"
                value={borderRadius}
                onChange={e => { setBorderRadius(e.target.value); applyChange('borderRadius', `${e.target.value}px`); }}
              />
            </div>

            <div className="wc-field">
              <label className="wc-label">
                Border width: {borderWidth}px
              </label>
              <input
                type="range"
                min="0"
                max="10"
                className="wc-input"
                value={borderWidth}
                onChange={e => { setBorderWidth(e.target.value); applyChange('borderWidth', `${e.target.value}px`); }}
              />
            </div>

            <div className="wc-field">
              <label className="wc-label">Border style</label>
              <select
                className="wc-select"
                value={borderStyle}
                onChange={e => { setBorderStyle(e.target.value); applyChange('borderStyle', e.target.value); }}
              >
                <option value="none">None</option>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
              </select>
            </div>

            <div className="wc-color-field">
              <label className="wc-label">Border color</label>
              <div className="wc-color-inputs">
                <input
                  type="color"
                  value={borderColor}
                  onChange={e => { setBorderColor(e.target.value); applyChange('borderColor', e.target.value); }}
                />
                <input
                  type="text"
                  className="wc-hex"
                  value={borderColor}
                  onChange={e => { setBorderColor(e.target.value); applyChange('borderColor', e.target.value); }}
                />
              </div>
            </div>
          </div>
        )}

        {/* -- Custom CSS (Advanced only) -- */}
        {isAdvanced && (
          <div className="wc-section cp-section">
            <h4 className="wc-section-title">Custom CSS</h4>
            <div className="wc-field">
              <textarea
                className="wc-textarea"
                rows={6}
                value={customCSS}
                onChange={e => { setCustomCSS(e.target.value); applyChange('customCSS', e.target.value); }}
                placeholder={"e.g. box-shadow: 0 2px 8px rgba(0,0,0,0.1);"}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
