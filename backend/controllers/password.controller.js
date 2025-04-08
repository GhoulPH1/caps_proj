// controllers/password.controller.js
import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import AuthService from '../services/auth.service.js';
import mongoose from 'mongoose';

// Configuration constants
const PASSWORD_CONFIG = {
  MAX_PASSWORD_HISTORY: 5,
  MIN_PASSWORD_LENGTH: 8,
  COMPLEXITY_REGEX: /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
};

// Utility functions
const validateId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const handleServiceError = (res, error) => {
  // Handle validation errors
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({ 
      success: false, 
      msg: messages.join(', ')
    });
  }
  
  // Handle duplicate key errors
  if (error.code === 11000) {
    return res.status(400).json({ 
      success: false, 
      msg: "Email already exists"
    });
  }

  // Handle standard errors with known messages
  return res.status(400).json({ 
    success: false, 
    msg: error.message || "An error occurred"
  });
};

const handleServerError = (res, error, operation) => {
  console.error(`Error in ${operation}:`, error);
  return res.status(500).json({ 
    success: false, 
    msg: "Server error", 
    error: error.message || "Unknown error"
  });
};

/**
 * Resets a user's password after validating PIN and old password
 */
export const resetPassword = async (req, res) => {
  const { email, pin, oldPassword, newPassword } = req.body;

  try {
    // Input validation
    if (!email || !pin || !oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        msg: 'All fields are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: 'User not found'
      });
    }

    // Check if user is currently locked out
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const remainingSeconds = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
      return res.status(403).json({
        success: false,
        msg: `Account temporarily locked. Try again in ${remainingSeconds} seconds.`,
        cooldownTime: remainingSeconds
      });
    }

    // Step 1: Verify PIN first
    const isPinCorrect = await user.comparePin(pin);
    if (!isPinCorrect) {
      // This now belongs to PIN controller but we need basic validation here
      return res.status(401).json({
        success: false,
        msg: 'Invalid PIN'
      });
    }

    // Step 2: Verify old password
    const isOldPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isOldPasswordCorrect) {
      return res.status(401).json({
        success: false,
        msg: 'Current password is incorrect'
      });
    }

    // Step 3: Validate new password
    if (!PASSWORD_CONFIG.COMPLEXITY_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        msg: 'Password must have at least 8 characters, one uppercase letter, one number, and one special character'
      });
    }

    // Check if new password is same as old password
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({
        success: false,
        msg: 'New password cannot be the same as current password'
      });
    }

    // Check if new password is in password history
    const isPasswordUnique = await user.isPasswordUnique(newPassword);
    if (!isPasswordUnique) {
      return res.status(400).json({
        success: false,
        msg: 'Password has been used recently. Please choose a different password.'
      });
    }

    // Set the new password (the pre-save hook will handle hashing)
    user.password = newPassword;
    
    // Reset security counters related to password
    user.lockoutUntil = null;
    
    await user.save();

    res.status(200).json({
      success: true,
      msg: 'Password reset successful'
    });

  } catch (error) {
    handleServerError(res, error, 'resetPassword');
  }
};

/**
 * Requests a password reset email to be sent to user
 */
export const requestPasswordResetEmail = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        msg: 'Email is required'
      });
    }

    // Check if user exists but don't reveal in response
    const user = await User.findOne({ email });
    
    // Always return the same response whether user exists or not (security best practice)
    res.status(200).json({
      success: true,
      msg: 'If your email is registered, you will receive reset instructions'
    });

    // Only send email if user exists (outside of response)
    if (user) {
      // TODO: Implement actual email sending functionality
      // This would involve:
      // 1. Generate a reset token
      // 2. Save it to the user document with an expiration
      // 3. Send an email with a link containing the token
    }

  } catch (error) {
    handleServerError(res, error, 'requestPasswordResetEmail');
  }
};

/**
 * Updates user credentials (username, email, etc.)
 */
export const updateCredentials = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Check if the ID format is valid
    if (!validateId(id)) {
      return res.status(400).json({ success: false, msg: "Invalid User ID format" });
    }

    const updatedUser = await AuthService.updateUserCredentials(id, updates);
    res.status(200).json({ success: true, data: updatedUser });

  } catch (error) {
    try {
      handleServiceError(res, error);
    } catch (serverError) {
      handleServerError(res, error, 'updateCredentials');
    }
  }
};

/**
 * Change password (when user is already logged in)
 */
export const changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  
  try {
    // Validate input
    if (!userId || !validateId(userId)) {
      return res.status(400).json({
        success: false,
        msg: 'Valid user ID is required'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        msg: 'Current password and new password are required'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: 'User not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        msg: 'Current password is incorrect'
      });
    }
    
    // Validate new password complexity
    if (!PASSWORD_CONFIG.COMPLEXITY_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        msg: 'Password must have at least 8 characters, one uppercase letter, one number, and one special character'
      });
    }
    
    // Check if new password is same as current password
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({
        success: false,
        msg: 'New password cannot be the same as current password'
      });
    }
    
    // Check password history
    const isPasswordUnique = await user.isPasswordUnique(newPassword);
    if (!isPasswordUnique) {
      return res.status(400).json({
        success: false,
        msg: 'Password has been used recently. Please choose a different password.'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      msg: 'Password changed successfully'
    });
  } catch (error) {
    handleServerError(res, error, 'changePassword');
  }
};