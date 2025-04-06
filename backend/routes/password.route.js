// routes/password.routes.js
import express from 'express';
import { resetPassword, requestPasswordResetEmail } from '../controllers/password.controller.js';
import { validateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Route for resetting password (requires PIN and old password verification)
router.post('/reset', resetPassword);

// Route for requesting a password reset email (alternative flow)
router.post('/reset-request', requestPasswordResetEmail);

// Add this router to your main app.js or server.js file:
// import passwordRoutes from './routes/password.routes.js';
// app.use('/api/password', passwordRoutes);

export default router;