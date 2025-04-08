// Add these methods to your AuthService class
import User from '../models/user.model.js';

// Constants
const PIN_MAX_ATTEMPTS = 3;
const PIN_COOLDOWN_DURATION = 60; // seconds

/**
 * Validate user PIN with attempt tracking and lockout
 * @param {string} userId User ID
 * @param {string} pin PIN to validate
 * @returns {Promise<Object>} Validation result
 */
const validatePin = async (userId, pin) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Validate PIN format
  if (!pin || !/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  
  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check for existing cooldown
  if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
    const secondsRemaining = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
    throw new Error(`Too many attempts. Try again in ${secondsRemaining} seconds.`);
  }
  
  // Validate PIN
  const isPinValid = await user.comparePin(pin);
  
  if (!isPinValid) {
    // Increment PIN attempts
    user.pinAttempts = (user.pinAttempts || 0) + 1;
    
    // Check if max attempts reached
    if (user.pinAttempts >= PIN_MAX_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + (PIN_COOLDOWN_DURATION * 1000));
      user.cooldowns = (user.cooldowns || 0) + 1;
      
      // If user has multiple cooldowns, require security question
      const requireSecurityQuestion = user.cooldowns >= 2;
      
      await user.save();
      
      if (requireSecurityQuestion) {
        // Return the security phrase to display to the user
        return {
          success: false,
          requireSecurityQuestion: true,
          securityPhrase: user.securityPhrase
        };
      } else {
        throw new Error(`Too many attempts. Try again in ${PIN_COOLDOWN_DURATION} seconds.`);
      }
    }
    
    // Save updated attempts
    await user.save();
    
    // Calculate attempts remaining
    const attemptsLeft = PIN_MAX_ATTEMPTS - user.pinAttempts;
    throw new Error(`Invalid PIN. ${attemptsLeft} attempts remaining.`);
  }
  
  // If PIN is valid, reset attempts
  user.pinAttempts = 0;
  await user.save();
  
  return {
    success: true,
    userId: user._id
  };
};

/**
 * Verify security question answer
 * @param {string} userId User ID
 * @param {string} securityAnswer Security answer to verify
 * @returns {Promise<Object>} Verification result
 */
const verifySecurityQuestion = async (userId, securityAnswer) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (!securityAnswer || !securityAnswer.trim()) {
    throw new Error('Security answer is required');
  }
  
  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify security answer
  const isAnswerValid = await user.compareSecurityAnswer(securityAnswer);
  
  if (!isAnswerValid) {
    throw new Error('Invalid security answer');
  }
  
  // Reset PIN attempts and lockout after successful security question verification
  user.pinAttempts = 0;
  user.lockoutUntil = null;
  
  // Only reset cooldowns if specifically requested (e.g., when setting a new PIN)
  // Otherwise, keep the cooldown count to maintain security policy
  
  await user.save();
  
  return {
    success: true,
    canProceed: true,
    userId: user._id
  };
};

/**
 * Reset user PIN after security verification
 * @param {string} userId User ID
 * @param {string} newPin New PIN to set
 * @param {string} securityAnswer Security answer for verification
 * @returns {Promise<Object>} Reset result
 */
const resetPin = async (userId, newPin, securityAnswer) => {
  // First verify security answer
  const securityResult = await verifySecurityQuestion(userId, securityAnswer);
  
  if (!securityResult.success) {
    throw new Error('Security verification failed');
  }
  
  // Validate new PIN format
  if (!newPin || !/^\d{4}$/.test(newPin)) {
    throw new Error('New PIN must be exactly 4 digits');
  }
  
  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Set new PIN
  user.pin = newPin; // Will be hashed in the pre-save hook
  
  // Reset security-related fields
  user.pinAttempts = 0;
  user.lockoutUntil = null;
  user.cooldowns = 0; // Reset cooldown count when PIN is changed
  
  await user.save();
  
  return {
    success: true,
    message: 'PIN reset successfully'
  };
};

// Export the functions
export {
  validatePin,
  verifySecurityQuestion,
  resetPin
};