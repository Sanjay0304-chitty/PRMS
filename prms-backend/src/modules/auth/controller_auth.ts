import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth';
import * as authService from './service_auth';
import { recordAudit } from '../admin/service_audit';
import { successResponse } from '../../utils/response';
import { env } from '../../config';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from './firebase_auth';
import { createGoogleRegistrationGrant, completeGoogleRegistration } from './googleRegistration';
import { prisma } from '../../db';
import { isStrongPassword, isValidPhoneNumber } from '../../utils/validators';
import path from 'path';
import fs from 'fs';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const log = async (ctx: { userId?: string; username?: string | null; userRole?: string; action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, username: ctx.username || undefined, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'Authentication' });
  };
  return { log };
};

export class AuthController {
  checkEmail = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      return res.json(successResponse(null, 'Continue with your email and password to sign in.'));
    } catch (error: any) {
      return res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  register = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const { email, password, full_name, phone, role, consents } = req.body;
      const user = await authService.registerUser(email, password, full_name, phone, role, consents, (req as any).ip);
      const tokens = authService.generateTokens(user.id);
      await authService.saveRefreshToken(user.id, tokens.refreshToken);
      HELPERS(req).log({ userId: user.id, username: user.email, userRole: role || 'Tenant', action: 'USER_REGISTRATION', entity: 'User', entityId: user.id, description: `New user registered with role ${role || 'Tenant'}`, status: 'Success', level: 'info' });
      res.status(201).json(successResponse({
        user: { id: user.id, email: user.email, full_name: user.full_name },
        tokens,
      }, 'Registration successful'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'USER_REGISTRATION', entity: 'User', description: `Registration failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  login = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const { email, password } = req.body;
      const user = await authService.loginUser(email, password);
      const tokens = authService.generateTokens(user.id);
      await authService.saveRefreshToken(user.id, tokens.refreshToken);
      HELPERS(req).log({ userId: user.id, username: user.email, userRole: user.UserRole[0]?.role.name, action: 'USER_LOGIN', entity: 'User', entityId: user.id, description: 'User logged in successfully', status: 'Success', level: 'info' });
      res.json(successResponse({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          firebase_uid: user.firebase_uid,
          role: user.UserRole[0]?.role.name,
        },
        tokens,
      }, 'Login successful'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'USER_LOGIN', entity: 'User', description: `Login failed: ${error.message}`, status: 'Failed', level: 'warning', errorMessage: error.message });
      res.status(401).json({ success: false, error: { message: error.message } });
    }
  };

  refresh = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
      await authService.verifyRefreshToken((decoded as any).userId, refreshToken);
      const tokens = authService.generateTokens((decoded as any).userId);
      await authService.saveRefreshToken((decoded as any).userId, tokens.refreshToken);
      res.json(successResponse({ tokens }, 'Token refreshed'));
    } catch (error: any) {
      res.status(401).json({ success: false, error: { message: error.message } });
    }
  };

  getMe = async (req: AuthRequest, res: Response) => {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      if (!user) {
        res.status(404).json({ success: false, error: { message: 'User not found' } });
        return;
      }
      res.json(successResponse({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        profile_img_url: user.profile_img_url,
        firebase_uid: user.firebase_uid,
        role: user.UserRole[0]?.role.name || 'Tenant',
        hasPassword: !!user.passwordHash,
      }));
    } catch (error: any) {
      res.status(404).json({ success: false, error: { message: error.message } });
    }
  };

  updateMe = async (req: AuthRequest, res: Response) => {
    try {
      if (req.body?.phone !== undefined && req.body?.phone !== null && String(req.body.phone).trim() !== '') {
        if (!isValidPhoneNumber(req.body.phone)) {
          return res.status(400).json({ success: false, error: { message: 'Please enter a valid phone number (e.g. 012-345 6789 or +60123456789)' } });
        }
      }
      const user = await authService.updateUserProfile(req.user!.id, req.body);
      HELPERS(req).log({ userId: req.user!.id, username: req.user!.email, userRole: req.user!.role, action: 'PROFILE_UPDATE', entity: 'User', entityId: req.user!.id, description: 'User profile updated', status: 'Success', level: 'info' });
      // Flatten to the same shape getMe returns — normalizeUser on the
      // frontend reads a flat `role` string, not the raw UserRole[] relation.
      res.json(successResponse({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        profile_img_url: user.profile_img_url,
        firebase_uid: user.firebase_uid,
        role: user.UserRole[0]?.role.name || 'Tenant',
        hasPassword: user.hasPassword,
      }, 'Profile updated'));
    } catch (error: any) {
      HELPERS(req).log({ userId: req.user?.id, username: req.user?.email, action: 'PROFILE_UPDATE', entity: 'User', description: `Profile update failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  getPreferences = async (req: AuthRequest, res: Response) => {
    try {
      const preferences = await authService.getUserPreferences(req.user!.id);
      res.json(successResponse(preferences));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  updatePreferences = async (req: AuthRequest, res: Response) => {
    try {
      const preferences = await authService.updateUserPreferences(req.user!.id, req.body || {});
      res.json(successResponse(preferences, 'Preferences updated'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  logout = async (req: AuthRequest, res: Response) => {
    try {
      await authService.logoutUser(req.user!.id);
      HELPERS(req).log({ userId: req.user!.id, username: req.user!.email, userRole: req.user!.role, action: 'USER_LOGOUT', entity: 'User', entityId: req.user!.id, description: 'User logged out', status: 'Success', level: 'info' });
      res.json(successResponse(null, 'Logged out successfully'));
    } catch (error: any) {
      HELPERS(req).log({ userId: req.user?.id, username: req.user?.email, action: 'USER_LOGOUT', entity: 'User', description: `Logout failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: { message: 'Current and new password required' } });
      }
      const pwdCheck = isStrongPassword(newPassword);
      if (!pwdCheck.isValid) {
        return res.status(400).json({ success: false, error: { message: pwdCheck.errors[0] || 'Password must be strong (at least 8 characters, uppercase, lowercase, number, and special character)' } });
      }
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      HELPERS(req).log({ userId: req.user!.id, username: req.user!.email, userRole: req.user!.role, action: 'PASSWORD_CHANGE', entity: 'User', entityId: req.user!.id, description: 'Password changed successfully', status: 'Success', level: 'info' });
      res.json(successResponse(null, 'Password changed successfully'));
    } catch (error: any) {
      HELPERS(req).log({ userId: req.user?.id, username: req.user?.email, action: 'PASSWORD_CHANGE', entity: 'User', description: `Password change failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  setPassword = async (req: AuthRequest, res: Response) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ success: false, error: { message: 'Password required' } });
      }
      const pwdCheck = isStrongPassword(newPassword);
      if (!pwdCheck.isValid) {
        return res.status(400).json({ success: false, error: { message: pwdCheck.errors[0] || 'Password must be strong (at least 8 characters, uppercase, lowercase, number, and special character)' } });
      }
      await authService.setPassword(req.user!.id, newPassword);
      HELPERS(req).log({ userId: req.user!.id, username: req.user!.email, userRole: req.user!.role, action: 'PASSWORD_SET', entity: 'User', entityId: req.user!.id, description: 'Password set for Google-only account', status: 'Success', level: 'info' });
      res.json(successResponse(null, 'Password set successfully'));
    } catch (error: any) {
      HELPERS(req).log({ userId: req.user?.id, username: req.user?.email, action: 'PASSWORD_SET', entity: 'User', description: `Password set failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  googleLogin = async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      if (!env.ENABLE_FIREBASE_VERIFY) throw new Error('Google sign-in is not configured');
      if (typeof idToken !== 'string' || !idToken.trim()) throw new Error('Firebase ID token required');
      const identity = await verifyFirebaseToken(idToken);
      const { uid: firebaseUid, email } = identity;
      if (req.body.email !== undefined && (typeof req.body.email !== 'string' || req.body.email.trim().toLowerCase() !== email)) {
        throw new Error('Google account identity does not match');
      }

      // Step 1: find by firebase_uid
      let user = await prisma.user.findUnique({ where: { firebase_uid: firebaseUid }, include: { UserRole: { include: { role: true } } } });

      // Step 2: not found, find by email
      if (!user && email) {
        user = await prisma.user.findUnique({ where: { email }, include: { UserRole: { include: { role: true } } } });

        if (user) {
          // Older demo sign-ins stored dev-<email>, not a verified Firebase UID.
          // Upgrade only the exact placeholder for the token's verified email.
          const isPlaceholder = user.firebase_uid?.startsWith('local-') || user.firebase_uid === `dev-${email}`;
          const hasRealFirebaseLink = user.firebase_uid && !isPlaceholder;
          if (hasRealFirebaseLink && user.firebase_uid !== firebaseUid) {
            throw new Error('Google account already linked');
          }
          if (!user.is_active) throw new Error('Unable to sign in with this account');
          const linked = await prisma.user.updateMany({
            where: { id: user.id, firebase_uid: user.firebase_uid, is_active: true },
            data: { firebase_uid: firebaseUid },
          });
          if (linked.count !== 1) throw new Error('Account changed during sign-in. Please try again.');
          user = await prisma.user.findUnique({ where: { firebase_uid: firebaseUid }, include: { UserRole: { include: { role: true } } } });
        }
      }

      // No account or access tokens exist until role selection and acknowledgement.
      if (!user) {
        return res.json(successResponse({ isNewUser: true, registrationToken: createGoogleRegistrationGrant(identity) }, 'Choose a role to complete your account'));
      }

      if (!user.is_active) throw new Error('Account is suspended');

      const tokens = authService.generateTokens(user.id);
      await authService.saveRefreshToken(user.id, tokens.refreshToken);

      HELPERS(req).log({ userId: user.id, username: user.email, userRole: user.UserRole[0]?.role.name || 'Tenant', action: 'GOOGLE_LOGIN', entity: 'User', entityId: user.id, description: 'User logged in via Google', status: 'Success', level: 'info' });

      res.json(successResponse({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          profile_img_url: user.profile_img_url,
          role: user.UserRole[0]?.role.name || 'Tenant',
        },
        tokens,
        isNewUser: false,
      }));
    } catch (error: any) {
      HELPERS(req).log({ action: 'GOOGLE_LOGIN', entity: 'User', description: `Google login failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  googleRegister = async (req: Request, res: Response) => {
    try {
      if (!env.ENABLE_FIREBASE_VERIFY) throw new Error('Google sign-in is not configured');
      const user = await completeGoogleRegistration(req.body.registrationToken, req.body.role, req.body.consents, req.ip);
      const tokens = authService.generateTokens(user.id);
      await authService.saveRefreshToken(user.id, tokens.refreshToken);
      HELPERS(req).log({ userId: user.id, username: user.email, userRole: req.body.role, action: 'USER_REGISTRATION', entity: 'User', entityId: user.id, description: 'Google account registration completed', status: 'Success', level: 'info' });
      res.status(201).json(successResponse({ tokens }));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.code === 'P2002' ? 'This account already exists. Sign in with Google again.' : error.message } });
    }
  };

  uploadProfileImage = async (req: AuthRequest, res: Response) => {
    try {
      console.log('[DBG-UP1] userId:', req.user?.id, '| file:', req.file ? req.file.filename : 'UNDEFINED', '| ct:', req.headers['content-type']);
      if (!req.file) {
        return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, error: { message: 'Invalid file type. Use JPEG, PNG, GIF or WebP' } });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, error: { message: 'File too large. Maximum 5MB' } });
      }

      // Build public URL (static route /images -> public/images/)
      const url = `/images/${path.basename(req.file.path)}`;

      // Delete old avatar file if it exists
      const oldUrl = (req.user as any).profile_img_url;
      if (oldUrl && oldUrl.includes('/uploads/images/')) {
        const oldFilename = path.basename(decodeURIComponent(oldUrl));
        const oldPath = path.join(__dirname, '..', '..', 'public', 'images', oldFilename);
        fs.unlink(oldPath, () => {});
      }

      const updated = await authService.updateUserProfile(req.user!.id, { profile_img_url: url });

      HELPERS(req).log({ userId: req.user!.id, username: req.user!.email, userRole: req.user!.role, action: 'PROFILE_IMAGE_UPLOAD', entity: 'User', entityId: req.user!.id, description: 'Profile image uploaded', status: 'Success', level: 'info' });

      res.json(successResponse(
        { profile_img_url: updated.profile_img_url },
        'Profile image updated'
      ));
    } catch (error: any) {
      HELPERS(req).log({ userId: req.user?.id, username: req.user?.email, action: 'PROFILE_IMAGE_UPLOAD', entity: 'User', description: `Profile image upload failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
      }
      const { email } = req.body;
      await authService.generateOtpCode(email);
      HELPERS(req).log({ username: email, action: 'FORGOT_PASSWORD', entity: 'User', description: `OTP generated for ${email}`, status: 'Success', level: 'info' });
      // Security fix: do not return OTP in response body
      res.json(successResponse(null, 'If your email is registered, a 6-digit verification code has been dispatched.'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'FORGOT_PASSWORD', entity: 'User', description: `Forgot password failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  verifyOtp = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
      }
      const { email, otp } = req.body;
      const grant = await authService.verifyOtpCode(email, otp);
      HELPERS(req).log({ username: email, action: 'VERIFY_OTP', entity: 'User', description: 'OTP verified successfully', status: 'Success', level: 'info' });
      res.json(successResponse(grant, 'OTP verified successfully'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'VERIFY_OTP', entity: 'User', description: `Verify OTP failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
      }
      const { email, resetToken, newPassword, confirmPassword } = req.body;
      if (!resetToken || typeof resetToken !== 'string') {
        return res.status(400).json({ success: false, error: { message: 'Password reset permission is required' } });
      }
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: { message: 'New password must be at least 6 characters' } });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: { message: 'Passwords do not match' } });
      }
      // Critical fix: verify OTP before resetting password
      await authService.resetPassword(email, newPassword, resetToken);
      HELPERS(req).log({ username: email, action: 'PASSWORD_RESET', entity: 'User', description: 'Password reset successfully for ' + email, status: 'Success', level: 'info' });
      res.json(successResponse(null, 'Password reset successfully'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'PASSWORD_RESET', entity: 'User', description: `Password reset failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };
}
