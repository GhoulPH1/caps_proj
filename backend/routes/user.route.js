// auth.routes.js - Update your existing routes

import express from 'express';
import { 
  userRegister, 
  loginUser, 
  validateCredentials, 
  validatePin, 
  verifySecurityQuestion,
  refreshToken,
  logoutUser,
  getUserSession
} from '../controllers/user.controller.js';
import { validateToken, preemptiveTokenRefresh } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply the preemptive token refresh middleware to all routes
router.use(preemptiveTokenRefresh);

// Auth routes
router.post('/register', userRegister);
router.post('/login', loginUser);
router.post('/validate-credentials', validateCredentials);
router.post('/validate-pin', validatePin);
router.post('/verify-security-question', verifySecurityQuestion);

// Add new route for token refresh
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/session', validateToken, getUserSession);
router.post('/logout', validateToken, logoutUser);


export default router;