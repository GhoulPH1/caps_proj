import express from 'express';
import { 
  userRegister, 
  loginUser, 
  validateCredentials, 
  refreshToken,
  logoutUser,
  getUserSession
} from '../controllers/user.controller.js';

import {
  resetPassword,
  requestPasswordResetEmail,
  changePassword,
  updateCredentials
} from '../controllers/password.controller.js';

import {
  validatePin,
  getPinStatus,
  resetPin,
  updatePin,
  getSecurityQuestion,
  verifySecurityQuestion
} from '../controllers/pin.controller.js';

import { validateToken, preemptiveTokenRefresh } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply the preemptive token refresh middleware to all routes
router.use(preemptiveTokenRefresh);

// ========================
// AUTH ROUTES
// ========================
router.post('/register', userRegister);
router.post('/login', loginUser);
router.post('/validate-credentials', validateCredentials);
router.post('/refresh-token', refreshToken);
router.get('/session', validateToken, getUserSession);
router.post('/logout', validateToken, logoutUser);

// ========================
// PASSWORD ROUTES
// ========================
router.post('/password-reset', resetPassword);
router.post('/password-reset-request', requestPasswordResetEmail);
// router.post('/password-validate', validateCredentials);
router.post('/password-change', validateToken, changePassword);
router.put('/user/:id/credentials', validateToken, updateCredentials);

// ========================
// PIN ROUTES (Updated to match frontend expectations)
// ========================
router.post('/pin/validate', validatePin); // /api/auth/pin/validate
router.get('/pin/status/:userId', getPinStatus); // /api/auth/pin/status/:userId
router.post('/pin/reset', resetPin); // /api/auth/pin/reset
router.put('/pin/update', validateToken, updatePin);

// SECURITY QUESTION ROUTES
router.get('/security/question/:userId', getSecurityQuestion); // /api/auth/security/question/:userId
router.post('/security/verify', verifySecurityQuestion); // /api/auth/security/verify

export default router;
