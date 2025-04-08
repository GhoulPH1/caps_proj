  import User from '../models/user.model.js';
  import AuthService from '../services/auth.service.js';
  import mongoose from 'mongoose';

  // Utility functions
  const validateId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
  };

  const handleServerError = (res, error, operation) => {
    console.error(`Error in ${operation}:`, error);
    return res.status(500).json({ 
      success: false, 
      msg: "Server error", 
      error: error.message || "Unknown error"
    });
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
        msg: "Duplicate key error"
      });
    }

    // Handle standard errors with known messages
    return res.status(400).json({ 
      success: false, 
      msg: error.message || "An error occurred"
    });
  };

  /**
   * Validates a user's PIN
   */
  export const validatePin = async (req, res) => {
    const { userId, pin } = req.body;
    
    try {
      // Validate input
      if (!userId || !validateId(userId)) {
        return res.status(400).json({
          success: false,
          msg: 'Valid user ID is required'
        });
      }
      
      if (!pin || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          msg: 'PIN must be exactly 4 digits'
        });
      }
      
      const result = await AuthService.validatePin(userId, pin);
      
      // Check if security question is required
      if (result.requireSecurityQuestion) {
        return res.status(403).json({
          success: false,
          msg: 'Verify security question to proceed.',
          requireSecurityQuestion: true
        });
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        msg: 'PIN validated successfully'
      });
    } catch (error) {
      // Handle specific error cases
      if (error.message.includes('Too many incorrect attempts') || error.message.includes('Try again')) {
        const cooldownMatch = error.message.match(/(\d+) seconds/);
        const cooldownTime = cooldownMatch ? parseInt(cooldownMatch[1]) : 60;
        
        return res.status(403).json({
          success: false,
          msg: error.message,
          cooldownTime: cooldownTime
        });
      }
      
      if (error.message === 'Invalid PIN') {
        // Get the user to determine attempts left
        try {
          const user = await User.findById(userId);
          const attemptsLeft = user ? 
            (AuthService.AUTH_CONFIG.ATTEMPT_LIMIT - (user.pinAttempts || 0)) : 0;
          
          return res.status(401).json({
            success: false,
            msg: 'Invalid PIN',
            attemptsLeft: attemptsLeft
          });
        } catch (userError) {
          return res.status(401).json({
            success: false,
            msg: 'Invalid PIN'
          });
        }
      }
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ 
          success: false, 
          msg: messages.join(', ')
        });
      }
      
      // Generic error handling as fallback
      console.error(`Error in validatePin:`, error);
      return res.status(500).json({ 
        success: false, 
        msg: "Server error", 
        error: error.message || "Unknown error"
      });
    }
  };

  /**
   * Gets a user's PIN status (locked, attempts left, etc.)
   */
  export const getPinStatus = async (req, res) => {
    const { userId } = req.params;
    
    try {
      // Validate input
      if (!userId || !validateId(userId)) {
        return res.status(400).json({
          success: false,
          msg: 'Valid user ID is required'
        });
      }
      
      const status = await AuthService.getPinStatus(userId);
      
      return res.status(200).json({
        success: true,
        ...status
      });
    } catch (error) {
      handleServerError(res, error, 'getPinStatus');
    }
  };

  /**
   * Resets a user's PIN using security answer verification
   */
  export const resetPin = async (req, res) => {
    const { userId, newPin, securityAnswer } = req.body;
    
    try {
      // Validate input
      if (!userId || !validateId(userId)) {
        return res.status(400).json({
          success: false,
          msg: 'Valid user ID is required'
        });
      }
      
      if (!newPin || !/^\d{4}$/.test(newPin)) {
        return res.status(400).json({
          success: false,
          msg: 'New PIN must be exactly 4 digits'
        });
      }
      
      if (!securityAnswer) {
        return res.status(400).json({
          success: false,
          msg: 'Security answer is required'
        });
      }
      
      await AuthService.resetPin(userId, newPin, securityAnswer);
      
      return res.status(200).json({
        success: true,
        msg: 'PIN reset successfully'
      });
    } catch (error) {
      try {
        handleServiceError(res, error);
      } catch (serverError) {
        handleServerError(res, error, 'resetPin');
      }
    }
  };

  /**
   * Get a user's security question
   */
  export const getSecurityQuestion = async (req, res) => {
    const { userId } = req.params;
    
    try {
      // Validate input
      if (!userId || !validateId(userId)) {
        return res.status(400).json({
          success: false,
          msg: 'Valid user ID is required'
        });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          msg: 'User not found'
        });
      }
      
      // Return security phrase without revealing answer
      return res.status(200).json({
        success: true,
        securityPhrase: user.securityPhrase
      });
    } catch (error) {
      handleServerError(res, error, 'getSecurityQuestion');
    }
  };

  /**
   * Updates a user's PIN
   */
  export const updatePin = async (req, res) => {
    const { userId, currentPin, newPin } = req.body;
    
    try {
      // Validate input
      if (!userId || !validateId(userId)) {
        return res.status(400).json({
          success: false,
          msg: 'Valid user ID is required'
        });
      }
      
      if (!currentPin || !/^\d{4}$/.test(currentPin)) {
        return res.status(400).json({
          success: false,
          msg: 'Current PIN must be exactly 4 digits'
        });
      }
      
      if (!newPin || !/^\d{4}$/.test(newPin)) {
        return res.status(400).json({
          success: false,
          msg: 'New PIN must be exactly 4 digits'
        });
      }
      
      // First validate current PIN
      try {
        await AuthService.validatePin(userId, currentPin);
      } catch (error) {
        // Pass through PIN validation errors
        throw error;
      }
      
      // Update the PIN through the service
      const updates = { pin: newPin };
      await AuthService.updateUserCredentials(userId, updates);
      
      return res.status(200).json({
        success: true,
        msg: 'PIN updated successfully'
      });
    } catch (error) {
      // Special handling for PIN validation errors
      if (error.message.includes('Too many incorrect attempts') || error.message.includes('Try again')) {
        const cooldownMatch = error.message.match(/(\d+) seconds/);
        const cooldownTime = cooldownMatch ? parseInt(cooldownMatch[1]) : 60;
        
        return res.status(403).json({
          success: false,
          msg: error.message,
          cooldownTime: cooldownTime
        });
      }
      
      if (error.message === 'Invalid PIN') {
        // Get the user to determine attempts left
        try {
          const user = await User.findById(userId);
          const attemptsLeft = user ? 
            (AuthService.AUTH_CONFIG.ATTEMPT_LIMIT - (user.pinAttempts || 0)) : 0;
          
          return res.status(401).json({
            success: false,
            msg: 'Current PIN is incorrect',
            attemptsLeft: attemptsLeft
          });
        } catch (userError) {
          return res.status(401).json({
            success: false,
            msg: 'Current PIN is incorrect'
          });
        }
      }
      
      try {
        handleServiceError(res, error);
      } catch (serverError) {
        handleServerError(res, error, 'updatePin');
      }
    }
  };

  /**
   * Verify security question
   */
  export const verifySecurityQuestion = async (req, res) => {
    const { userId, securityAnswer } = req.body;

    try {
      // Validate input
      if (!userId || !validateId(userId)) {
        return res.status(400).json({
          success: false,
          msg: 'Valid user ID is required'
        });
      }
      
      if (!securityAnswer) {
        return res.status(400).json({
          success: false,
          msg: 'Security answer is required'
        });
      }
      
      const result = await AuthService.verifySecurityQuestion(userId, securityAnswer);
      
      return res.status(200).json({
        success: true,
        msg: 'Security question verified',
        canProceed: result.canProceed
      });
    } catch (error) {
      try {
        handleServiceError(res, error);
      } catch (serverError) {
        handleServerError(res, error, 'verifySecurityQuestion');
      }
    }
  };