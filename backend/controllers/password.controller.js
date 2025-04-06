// controllers/password.controller.js
import User from '../models/user.model.js';
import bcrypt from 'bcrypt';

// Configuration constants
const PASSWORD_RESET_CONFIG = {
  MAX_PASSWORD_HISTORY: 5, // Number of previous passwords to remember
  MIN_PASSWORD_LENGTH: 8,
  PASSWORD_COMPLEXITY_REGEX: /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
};

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

    // PIN validation (should be exactly 4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        msg: 'PIN must be exactly 4 digits'
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
      return res.status(403).json({
        success: false,
        msg: 'Account temporarily locked. Try again later.'
      });
    }

    // Step 1: Verify PIN
    const isPinCorrect = await user.comparePin(pin);
    if (!isPinCorrect) {
      // Increment PIN attempts
      user.pinAttempts = (user.pinAttempts || 0) + 1;
      
      // Check if user has exceeded max attempts
      if (user.pinAttempts >= 3) {
        user.pinAttempts = 0;
        user.cooldowns = (user.cooldowns || 0) + 1;
        user.lockoutUntil = Date.now() + (30 * 1000); // 30 seconds lockout
        await user.save();
        
        return res.status(403).json({
          success: false,
          msg: 'Too many incorrect attempts. Account temporarily locked.'
        });
      }
      
      await user.save();
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
    // Check if new password meets complexity requirements
    if (!PASSWORD_RESET_CONFIG.PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
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
    
    // Reset security counters
    user.pinAttempts = 0;
    user.cooldowns = 0;
    user.lockoutUntil = null;
    
    // Save the user with updated password
    await user.save();

    res.status(200).json({
      success: true,
      msg: 'Password reset successful'
    });

  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

export const requestPasswordResetEmail = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        msg: 'Email is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return res.status(200).json({
        success: true,
        msg: 'If your email is registered, you will receive reset instructions'
      });
    }

    // In a real implementation, you would:
    // 1. Generate a reset token
    // 2. Save it to the user document with an expiration
    // 3. Send an email with a link containing the token

    // For this example, we'll just return a success message
    res.status(200).json({
      success: true,
      msg: 'Reset instructions sent to your email'
    });

  } catch (error) {
    console.error('Password Reset Request Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};