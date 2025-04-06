import User from '../models/user.model.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import jwt from 'jsonwebtoken';

// Configuration constants
const AUTH_CONFIG = {
  ATTEMPT_LIMIT: 3,
  COOLDOWN_TIME: 30 * 1000, // 30 seconds
  MAX_COOLDOWNS: 2,
  JWT_EXPIRATION: '1h'
};

// Helper functions
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: AUTH_CONFIG.JWT_EXPIRATION,
      algorithm: 'HS256'
    }
  );
};

const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const { password, pin, securityAnswer, ...sanitizedUser } = userObj;
  return sanitizedUser;
};

const handleServerError = (res, error, operation) => {
  console.error(`Error in ${operation}:`, error);
  return res.status(500).json({ 
    success: false, 
    msg: "Server error", 
    error: error.message || "Unknown error"
  });
};

const validateId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
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
  const userData = req.body;

  try {
    // Comprehensive field validation based on schema requirements
    const requiredFields = [
      'name', 'email', 'password', 'age', 
      'birthday', 'sexualOrientation', 
      'pin', 'securityPhrase', 'securityAnswer'
    ];
    
    const missingFields = requiredFields.filter(field => !userData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,  
        msg: `Please include all required fields: ${missingFields.join(', ')}` 
      });
    }

    // Create and save user
    const newUser = new User(userData);
    await newUser.save();
    
    res.status(201).json({ 
      success: true, 
      msg: "User registered successfully",
      data: sanitizeUser(newUser)
    }); 
  } catch (error) { 
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
    
    handleServerError(res, error, 'userRegister');
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

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Validate and process updates
    const updateValidations = {
      password: async (value) => {
        if (await bcrypt.compare(value, existingUser.password)) {
          throw new Error("New password cannot be the same as the current password");
        }
        return value;
      },
      pin: async (value) => {
        if (!/^\d{4}$/.test(value)) {
          throw new Error("PIN must be exactly 4 digits");
        }
        if (await bcrypt.compare(value, existingUser.pin)) {
          throw new Error("New PIN cannot be the same as the current PIN");
        }
        return value;
      },
      securityPhrase: (value) => {
        if (value.trim().length < 10) {
          throw new Error("Security phrase must be at least 10 characters long");
        }
        return value;
      }
    };

    // Validate and process each update
    for (const [key, value] of Object.entries(updates)) {
      if (updateValidations[key]) {
        updates[key] = await updateValidations[key](value);
      }
    }

    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,          // Return the updated document
      runValidators: true // Ensure schema validators run
    });

    res.status(200).json({ success: true, data: sanitizeUser(updatedUser) });

  } catch (error) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, msg: messages });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ success: false, msg: "Email already exists" });
    }

    handleServerError(res, error, 'updateCredentials');
  }
};

export const validateCredentials = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid email or password'
      });
    }

    res.status(200).json({
      success: true,
      msg: 'Credentials verified',
      user: sanitizeUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    handleServerError(res, error, 'validateCredentials');
  }
};

export const validatePin = async (req, res) => {
  const { userId, pin } = req.body;

  try {
    // Validate input
    if (!userId || !pin) {
      return res.status(400).json({ success: false, msg: 'User ID and PIN are required' });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, msg: 'PIN must be exactly 4 digits' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    // Check if user is currently locked out
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      return res.status(403).json({ success: false, msg: 'Too many attempts. Try again later.' });
    }

    // Use the comparePin method from the user model
    const isMatch = await user.comparePin(pin);
    
    if (!isMatch) {
      user.pinAttempts = (user.pinAttempts || 0) + 1;

      if (user.pinAttempts >= AUTH_CONFIG.ATTEMPT_LIMIT) {
        user.pinAttempts = 0;
        user.cooldowns = (user.cooldowns || 0) + 1;
        user.lockoutUntil = Date.now() + AUTH_CONFIG.COOLDOWN_TIME;
        await user.save();
        return res.status(403).json({ success: false, msg: 'Too many incorrect attempts. Try again in 30 seconds.' });
      }

      await user.save();
      return res.status(401).json({ success: false, msg: 'Invalid PIN' });
    }

    // If user exceeded max cooldowns, enforce security question verification
    if (user.cooldowns >= AUTH_CONFIG.MAX_COOLDOWNS) {
      return res.status(403).json({
        success: false,
        msg: 'Verify security question to proceed.',
        requireSecurityQuestion: true
      });
    }

    // Reset attempt counters on successful PIN verification
    user.pinAttempts = 0;
    user.cooldowns = 0;
    user.lockoutUntil = null;
    await user.save();

    res.status(200).json({ success: true, msg: 'PIN verified' });
  } catch (error) {
    handleServerError(res, error, 'validatePin');
  }
};

export const verifySecurityQuestion = async (req, res) => {
  const { userId, securityAnswer } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    // Verify security answer
    const isMatch = await user.compareSecurityAnswer(securityAnswer);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: 'Incorrect security answer' });
    }

    // Reset cooldown if security question is answered correctly
    user.cooldowns = 0;
    await user.save();

    res.status(200).json({ 
      success: true, 
      msg: 'Security question verified',
      canProceed: true 
    });
  } catch (error) {
    handleServerError(res, error, 'verifySecurityQuestion');
  }
};

export const loginUser = async (req, res) => {
  const { email, password, pin } = req.body;

  try {
    // Comprehensive input validation
    if (!email || !password || !pin) {
      return res.status(400).json({
        success: false,
        msg: 'Email, password, and PIN are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Comprehensive credential validation
    if (!user || 
        !(await user.comparePassword(password)) || 
        !(await user.comparePin(pin))) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid credentials'
      });
    }
    
    res.status(200).json({
      success: true,
      msg: 'Login successful',
      user: sanitizeUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    handleServerError(res, error, 'loginUser');
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
          const user = await User.findOne({ email });
          if (!user || !(await user.comparePassword(password))) {
            return done(null, false, { message: 'Incorrect email or password' });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
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
    // req.user is already populated by the validateToken middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid or expired session'
      });
    }

    // Return the user data
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    handleServerError(res, error, 'getUserSession');
  }
};