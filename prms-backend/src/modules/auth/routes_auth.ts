import express from 'express';
import { registerBody, loginBody, refreshBody, verifyOtpBody, resetPasswordBody, checkEmailBody } from './dto';
import { authenticate } from '../../middleware/auth';
import { AuthController } from './controller_auth';
import { authLimiter } from '../../middleware/rateLimit';
import upload from '../../middleware/upload';

const router = express.Router();
const auth = new AuthController();

router.post('/check-email', authLimiter, checkEmailBody, auth.checkEmail);
router.post('/register', authLimiter, registerBody, auth.register);
router.post('/login', authLimiter, loginBody, auth.login);
router.post('/refresh', refreshBody, auth.refresh);
router.post('/logout', authenticate, auth.logout);
router.get('/me', authenticate, auth.getMe);
router.put('/me', authenticate, auth.updateMe);
router.get('/me/preferences', authenticate, auth.getPreferences);
router.put('/me/preferences', authenticate, auth.updatePreferences);
router.post('/me/avatar', authenticate, upload.single('profileImage'), auth.uploadProfileImage);
router.post('/change-password', authenticate, auth.changePassword);
router.post('/set-password', authenticate, auth.setPassword);
router.post('/google', authLimiter, auth.googleLogin);
router.post('/forgot-password', authLimiter, auth.forgotPassword);
router.post('/verify-otp', authLimiter, verifyOtpBody, auth.verifyOtp);
router.post('/reset-password', authLimiter, resetPasswordBody, auth.resetPassword);

export default router;
