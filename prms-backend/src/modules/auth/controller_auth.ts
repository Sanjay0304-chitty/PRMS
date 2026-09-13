import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth';
import * as authService from './service_auth';
import { recordAudit } from '../admin/service_audit';
import { successResponse } from '../../utils/response';
import { env } from '../../config';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from './firebase_auth';
import { prisma } from '../../db';
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
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters' } });
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
      const { idToken, email, displayName } = req.body;

      let isNewUser = false;
      let firebaseUid: string;

      if (env.ENABLE_FIREBASE_VERIFY === true) {
        if (!idToken) {
          throw new Error('Firebase ID token required');
        }

        firebaseUid = await verifyFirebaseToken(idToken);
      } else {
        if (!email) {
          throw new Error('Email is required when Firebase verification is disabled');
        }
        firebaseUid = `dev-${email.toLowerCase()}`;
      }

      // Step 1: find by firebase_uid
      let user = await prisma.user.findUnique({ where: { firebase_uid: firebaseUid }, include: { UserRole: { include: { role: true } } } });

      // Step 2: not found, find by email
      if (!user && email) {
        user = await prisma.user.findUnique({ where: { email }, include: { UserRole: { include: { role: true } } } });

        if (user) {
          // A "local-*" firebase_uid is a placeholder for password-based accounts
          // (no real Firebase identity yet), so it's free to link to this Google account.
          const hasRealFirebaseLink = user.firebase_uid && !user.firebase_uid.startsWith('local-');
          if (hasRealFirebaseLink && user.firebase_uid !== firebaseUid) {
            throw new Error('Google account already linked');
          }
          user = await prisma.user.update({ where: { id: user.id }, data: { firebase_uid: firebaseUid }, include: { UserRole: { include: { role: true } } } });
        }
      }

      // Step 3: create new user
      if (!user) {
        isNewUser = true;
        user = await prisma.user.create({
          data: { firebase_uid: firebaseUid, email, full_name: displayName || '', passwordHash: null, UserRole: { create: { role: { connect: { name: 'Tenant' } } } } },
          include: { UserRole: { include: { role: true } } },
        });
      }

      if (!user.is_active) throw new Error('Account is suspended');

      const tokens = authService.generateTokens(user.id);
      await authService.saveRefreshToken(user.id, tokens.refreshToken);

      HELPERS(req).log({ userId: user.id, username: user.email, userRole: user.UserRole[0]?.role.name || 'Tenant', action: 'GOOGLE_LOGIN', entity: 'User', entityId: user.id, description: isNewUser ? 'New Google user registered and logged in' : 'User logged in via Google', status: 'Success', level: 'info' });

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
        isNewUser: !!isNewUser,
      }));
    } catch (error: any) {
      HELPERS(req).log({ action: 'GOOGLE_LOGIN', entity: 'User', description: `Google login failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
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
      const code = await authService.generateOtpCode(email);
      HELPERS(req).log({ username: email, action: 'FORGOT_PASSWORD', entity: 'User', description: `OTP generated for ${email}`, status: 'Success', level: 'info' });
      res.json(successResponse({ code }, 'OTP generated'));
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
      await authService.verifyOtpCode(email, otp);
      HELPERS(req).log({ username: email, action: 'VERIFY_OTP', entity: 'User', description: 'OTP verified successfully', status: 'Success', level: 'info' });
      res.json(successResponse(null, 'OTP verified'));
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
      const { email, otp, newPassword, confirmPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: { message: 'New password must be at least 6 characters' } });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: { message: 'Passwords do not match' } });
      }
      await authService.resetPassword(email, newPassword);
      HELPERS(req).log({ username: email, action: 'PASSWORD_RESET', entity: 'User', description: 'Password reset successfully for ' + email, status: 'Success', level: 'info' });
      res.json(successResponse(null, 'Password reset successfully'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'PASSWORD_RESET', entity: 'User', description: `Password reset failed: ${error.message}`, status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };
}
