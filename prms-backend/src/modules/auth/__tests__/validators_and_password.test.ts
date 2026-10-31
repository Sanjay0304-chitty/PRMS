import { isValidPhoneNumber, isValidEmail, isStrongPassword } from '../../../utils/validators';

describe('Validation Utilities', () => {
  describe('isValidPhoneNumber', () => {
    it('accepts standard Malaysian mobile formats', () => {
      expect(isValidPhoneNumber('012-345 6789')).toBe(true);
      expect(isValidPhoneNumber('0123456789')).toBe(true);
      expect(isValidPhoneNumber('+60 12-345 6789')).toBe(true);
      expect(isValidPhoneNumber('+60123456789')).toBe(true);
      expect(isValidPhoneNumber('011-12345678')).toBe(true);
      expect(isValidPhoneNumber('03-12345678')).toBe(true);
    });

    it('accepts valid E.164 international numbers', () => {
      expect(isValidPhoneNumber('+14155552671')).toBe(true);
      expect(isValidPhoneNumber('+44 20 7946 0958')).toBe(true);
      expect(isValidPhoneNumber('+65 9123 4567')).toBe(true);
    });

    it('rejects invalid or dummy phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('0000000000')).toBe(false);
      expect(isValidPhoneNumber('1111111111')).toBe(false);
      expect(isValidPhoneNumber('abcdefghijk')).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
      expect(isValidPhoneNumber(undefined)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('tenant.one@prms.my')).toBe(true);
      expect(isValidEmail('agent_007@gmail.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missingusername.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('approves passwords meeting all complexity requirements', () => {
      const strong = isStrongPassword('P@ssw0rd2026!');
      expect(strong.isValid).toBe(true);
      expect(strong.score).toBe(5);
      expect(strong.errors.length).toBe(0);
    });

    it('rejects passwords lacking required character types', () => {
      // Missing special character
      const noSpecial = isStrongPassword('Password123');
      expect(noSpecial.isValid).toBe(false);
      expect(noSpecial.errors).toContain('Password must contain at least one special character (!@#$%^&* etc.)');

      // Missing number
      const noNumber = isStrongPassword('Password!@#');
      expect(noNumber.isValid).toBe(false);
      expect(noNumber.errors).toContain('Password must contain at least one number (0-9)');

      // Missing uppercase
      const noUpper = isStrongPassword('password123!@#');
      expect(noUpper.isValid).toBe(false);
      expect(noUpper.errors).toContain('Password must contain at least one uppercase letter (A-Z)');

      // Missing lowercase
      const noLower = isStrongPassword('PASSWORD123!@#');
      expect(noLower.isValid).toBe(false);
      expect(noLower.errors).toContain('Password must contain at least one lowercase letter (a-z)');

      // Less than 8 characters
      const tooShort = isStrongPassword('P@1a');
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.errors).toContain('Password must be at least 8 characters long');
    });
  });
});
