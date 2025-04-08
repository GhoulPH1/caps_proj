import User from '../models/user.model.js'
import AuthService from '../services/auth.service.js';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

// Utility functions
const validateId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        msg: 'No refresh token provided'
      });
    }
    
    const tokens = await AuthService.refreshAccessToken(refreshToken);
    
    // Send new access token in response
    const response = {
      success: true,
      accessToken: tokens.accessToken
    };
    
    // If a new refresh token was generated, send it in a secure cookie
    if (tokens.refreshed) {
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
    
    res.status(200).json(response);
  } catch (error) {
    return res.status(401).json({
      success: false,
      msg: error.message || 'Invalid refresh token'
    });
  }
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
  
  // Handle duplicate key errors (e.g., email already exists)
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

// Controller functions
export const fetchUsers = async (req, res) => {
  try { 
    const users = await User.find({}).select('-password -pin -securityAnswer'); 
    res.status(200).json({ success: true, data: users });
  } catch(error) { 
    handleServerError(res, error, 'fetchUsers');
  }
};

export const userRegister = async (req, res) => { 
  try {
    const userData = req.body;
    const user = await AuthService.registerUser(userData);
    
    res.status(201).json({ 
      success: true, 
      msg: "User registered successfully",
      data: user
    }); 
  } catch (error) { 
    // Handle service-specific errors first
    try {
      handleServiceError(res, error);
    } catch (serverError) {
      // Fall back to server error
      handleServerError(res, error, 'userRegister');
    }
  } 
};

export const removeUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if the ID format is valid
    if (!validateId(id)) {
      return res.status(400).json({ success: false, msg: "Invalid User ID format" });
    }
    
    const result = await User.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    
    return res.status(200).json({ success: true, msg: "User removed successfully" });
  } catch (error) {
    handleServerError(res, error, 'removeUser');
  }
};

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

export const validateCredentials = async (req, res) => {
  console.log('Request Body:', req.body); // Log the request body
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      msg: 'Email and password are required'
    });
  }

  try {
    const result = await AuthService.authenticateUser(email, password);
    const tokens = await AuthService.generateTokens(result.user);
    res.status(200).json({
      success: true,
      msg: 'Credentials verified',
      user: result.user,
      token: tokens.accessToken
    });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const validatePin = async (req, res) => {
  const { userId, pin } = req.body;

  try {
    const result = await AuthService.validatePin(userId, pin);
    
    // Check if security question is required
    if (result.requireSecurityQuestion) {
      return res.status(403).json({
        success: false,
        msg: 'Verify security question to proceed.',
        requireSecurityQuestion: true
      });
    }
    
    res.status(200).json({ success: true, msg: 'PIN verified' });
  } catch (error) {
    // Specific error status codes based on the error message
    if (error.message === 'Too many attempts. Try again later.') {
      return res.status(403).json({ success: false, msg: error.message });
    }
    
    if (error.message === 'Invalid PIN') {
      return res.status(401).json({ success: false, msg: error.message });
    }
    
    try {
      handleServiceError(res, error);
    } catch (serverError) {
      handleServerError(res, error, 'validatePin');
    }
  }
};

export const verifySecurityQuestion = async (req, res) => {
  const { userId, securityAnswer } = req.body;

  try {
    const result = await AuthService.verifySecurityQuestion(userId, securityAnswer);
    
    res.status(200).json({ 
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

export const loginUser = async (req, res) => {
  const { email, password, pin } = req.body;

  try {
    // The current AuthService.loginUser returns a sanitized user
    const result = await AuthService.loginUser(email, password, pin);
    
    // Get the actual mongoose document from the database
    const userDocument = await User.findById(result.user._id);
    
    if (!userDocument) {
      return res.status(404).json({
        success: false,
        msg: 'User not found'
      });
    }
    
    // Generate refresh token and access token with the actual document
    const tokens = await AuthService.generateTokens(userDocument);
    
    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(200).json({
      success: true,
      msg: 'Login successful',
      user: result.user,
      token: tokens.accessToken // This is the access token
    });
  } catch (error) {
    try {
      handleServiceError(res, error);
    } catch (serverError) {
      handleServerError(res, error, 'loginUser');
    }
  }
};

export const configurePassport = () => {
  // Ensure Passport is available
  if (!passport || !passport.use) {
    console.error("Passport is not initialized properly.");
    return;
  }

  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const result = await AuthService.authenticateUser(email, password);
          return done(null, result.user);
        } catch (error) {
          return done(null, false, { message: error.message });
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password -pin -securityAnswer');
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
};

export const getUserSession = async (req, res) => {
  try {
    // User should be attached to req by the validateToken middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        msg: 'Not authenticated'
      });
    }
    
    // Return user data without sensitive fields
    return res.status(200).json({
      success: true,
      user: req.user,
      authenticationComplete: true
    });
  } catch (error) {
    console.error('Error getting user session:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error getting user session'
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    if (req.user) {
      await AuthService.invalidateRefreshToken(req.user._id);
    }
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken');
    
    res.status(200).json({
      success: true,
      msg: 'Logout successful'
    });
  } catch (error) {
    handleServerError(res, error, 'logoutUser');
  }
};