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

const generateToken = (userId) => {
  return jwt.sign(
    { userId: userId }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: AUTH_CONFIG.JWT_EXPIRATION,
      algorithm: 'HS256'
    }
  );
};

export const fetchUsers = async (req, res) => {
  try { 
    const users = await User.find({}).select('-password -pin -securityAnswer'); 
    res.status(200).json({ success: true, data: users });
  } catch(error) { 
    console.error("Error getting users:", error.message);
    res.status(500).json({ success: false, msg: "Server error", error: error.message });
  }
}

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

    // Create new user instance
    const newUser = new User(userData);

    // Save user to database
    await newUser.save();
    
    // Remove sensitive fields from response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.pin;
    delete userResponse.securityAnswer;
    
    res.status(201).json({ 
      success: true, 
      msg: "User registered successfully",
      data: userResponse
    }); 
  } catch (error) { 
    console.error("User Registration Error:", error);
    
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
    
    // Handle other errors
    return res.status(500).json({ 
      success: false, 
      msg: "Server Error", 
      error: error.message || "Unknown error" 
    });   
  } 
};

export const removeUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if the ID format is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: "Invalid User ID format" });
    }
    
    // Find the user first to confirm it exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
  
    await User.findByIdAndDelete(id);
    
    return res.status(200).json({ success: true, msg: "User removed successfully" });
  } catch (error) {
    console.error("User Deletion Error:", error.message);
    return res.status(500).json({ success: false, msg: "Server error", error: error.message });
  }
};

export const updateCredentials = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Check if the ID format is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
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

    // Remove sensitive fields from the response
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    delete userResponse.pin;
    delete userResponse.securityAnswer;

    res.status(200).json({ success: true, data: userResponse });

  } catch (error) {
    console.error("User Update Error:", error.message);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, msg: messages });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ success: false, msg: "Email already exists" });
    }

    return res.status(500).json({ 
      success: false, 
      msg: error.message || "Server error" 
    });
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

    const token = generateToken(user._id);

    // Return a simplified user object (without sensitive data)
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.pin;
    delete userResponse.securityAnswer;
    
    res.status(200).json({
      success: true,
      msg: 'Credentials verified',
      user: userResponse,
      token: token
    });
  } catch (error) {
    console.error('Credential Validation Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
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
    console.error('PIN Validation Error:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
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
    console.error('Security Question Verification Error:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
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

    // Create a user object for the response (excluding sensitive info)
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.pin;
    delete userResponse.securityAnswer;
    
    // Generate authentication token
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      msg: 'Login successful',
      user: userResponse,
      token: token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
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
          if (!user) {
            return done(null, false, { message: 'Incorrect email or password' });
          }

          const isMatch = await user.comparePassword(password);
          if (!isMatch) {
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

    // Return the user data (sensitive info is already excluded by the middleware)
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Session Verification Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};