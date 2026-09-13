import express from 'express';
import { registerBody, loginBody, refreshBody, verifyOtpBody, resetPasswordBody } from './dto';
import { authenticate } from '../../middleware/auth';
import { AuthController } from './controller_auth';
import upload from '../../middleware/upload';

const router = express.Router();
const auth = new AuthController();

router.post('/register', registerBody, auth.register);
router.post('/login', loginBody, auth.login);
router.post('/refresh', refreshBody, auth.refresh);
router.post('/logout', authenticate, auth.logout);
router.get('/me', authenticate, auth.getMe);
router.put('/me', authenticate, auth.updateMe);
router.post('/me/avatar', authenticate, upload.single('profileImage'), auth.uploadProfileImage);
router.post('/change-password', authenticate, auth.changePassword);
router.post('/set-password', authenticate, auth.setPassword);
router.post('/google', auth.googleLogin);
router.post('/forgot-password', auth.forgotPassword);
router.post('/verify-otp', verifyOtpBody, auth.verifyOtp);
router.post('/reset-password', resetPasswordBody, auth.resetPassword);

export default router;
