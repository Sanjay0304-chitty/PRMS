import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/validators';
import './PasswordStrengthMeter.css';

export default function PasswordStrengthMeter({ password = '', showRules = true }) {
  if (!password) {
    return (
      <div className="pwd-meter-container empty">
        <div className="pwd-meter-header">
          <span className="pwd-meter-title">Password Strength</span>
          <span className="pwd-meter-badge empty">Required</span>
        </div>
        <div className="pwd-meter-bar-track">
          <div className="pwd-meter-segment empty"></div>
          <div className="pwd-meter-segment empty"></div>
          <div className="pwd-meter-segment empty"></div>
        </div>
        {showRules && (
          <p className="pwd-meter-hint">
            Must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.
          </p>
        )}
      </div>
    );
  }

  const { score, status, label, criteria, isStrong } = evaluatePasswordStrength(password);

  return (
    <div className={`pwd-meter-container ${status}`} role="status" aria-live="polite">
      <div className="pwd-meter-header">
        <span className="pwd-meter-title">Password Strength:</span>
        <span className={`pwd-meter-badge ${status}`}>
          {isStrong ? <ShieldCheck size={14} className="badge-icon" /> : <ShieldAlert size={14} className="badge-icon" />}
          {label}
        </span>
      </div>

      <div className="pwd-meter-bar-track">
        <div
          className={`pwd-meter-segment ${score >= 1 ? `fill-${status}` : ''}`}
        />
        <div
          className={`pwd-meter-segment ${score >= 3 ? `fill-${status}` : ''}`}
        />
        <div
          className={`pwd-meter-segment ${score === 5 ? `fill-${status}` : ''}`}
        />
      </div>

      {showRules && (
        <div className="pwd-meter-rules">
          <ul className="pwd-rules-list">
            <li className={criteria.hasMinLength ? 'met' : 'unmet'}>
              {criteria.hasMinLength ? <Check size={13} className="rule-icon met" /> : <X size={13} className="rule-icon unmet" />}
              <span>At least 8 characters</span>
            </li>
            <li className={criteria.hasUpper ? 'met' : 'unmet'}>
              {criteria.hasUpper ? <Check size={13} className="rule-icon met" /> : <X size={13} className="rule-icon unmet" />}
              <span>Uppercase letter (A-Z)</span>
            </li>
            <li className={criteria.hasLower ? 'met' : 'unmet'}>
              {criteria.hasLower ? <Check size={13} className="rule-icon met" /> : <X size={13} className="rule-icon unmet" />}
              <span>Lowercase letter (a-z)</span>
            </li>
            <li className={criteria.hasNumber ? 'met' : 'unmet'}>
              {criteria.hasNumber ? <Check size={13} className="rule-icon met" /> : <X size={13} className="rule-icon unmet" />}
              <span>Number (0-9)</span>
            </li>
            <li className={criteria.hasSpecial ? 'met' : 'unmet'}>
              {criteria.hasSpecial ? <Check size={13} className="rule-icon met" /> : <X size={13} className="rule-icon unmet" />}
              <span>Special character (!@#$%^&* etc.)</span>
            </li>
          </ul>

          <div className={`pwd-status-callout ${isStrong ? 'met' : 'unmet'}`}>
            {isStrong ? (
              <span>✓ Password meets all security requirements</span>
            ) : (
              <span>Must meet all requirements (Strong) to proceed</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
