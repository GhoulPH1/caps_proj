import User from '../models/user.model.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export const userRegister = async (req, res) => { 
  const user = req.body;

  try {
    // Check if required fields are provided
    if(!user.name || !user.password || !user.email || !user.age || !user.birthday || !user.sexualOrientation || !user.pin) { 
      return res.status(400).json({ 
        success: false,  
        msg: 'Please include all required fields' 
      });
    }

    // Validate PIN format before saving
    if (!/^\d{4}$/.test(user.pin)) {
      return res.status(400).json({
        success: false,
        msg: 'PIN must be exactly 4 digits'
      });
    }

    // Create new user instance
    const newUser = new User(user);

    // Save user to database
    await newUser.save();
    
    // Remove password and pin from response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.pin;
    
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
}

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
      
      return res.status(200).json({ success: false, msg: "User removed successfully" });
    } catch (error) {
      console.error("User Deletion Error:", error.message);
      return res.status(500).json({ success: false, msg: "Server error", error: error.message });
    }
}

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
  
      // Handle password encryption if password is being updated
      if (updates.password && updates.password !== existingUser.password) {
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(updates.password, salt);
      } else if (updates.password && updates.password === existingUser.password) {
        // Remove password field if included but not changed
        delete updates.password;
      }
      
      // Handle PIN encryption if PIN is being updated
      if (updates.pin && updates.pin !== existingUser.pin) {
        // Validate PIN format
        if (!/^\d{4}$/.test(updates.pin)) {
          return res.status(400).json({
            success: false,
            msg: 'PIN must be exactly 4 digits'
          });
        }
        
        const salt = await bcrypt.genSalt(10);
        updates.pin = await bcrypt.hash(updates.pin, salt);
      } else if (updates.pin && updates.pin === existingUser.pin) {
        // Remove pin field if included but not changed
        delete updates.pin;
      }
  
      // Update the user with validation
      const updatedUser = await User.findByIdAndUpdate(
        id, 
        updates,
        { 
          new: true,        // Return the updated document
          runValidators: true, // Run schema validators
          context: 'query'  // Ensure unique validators run
        }
      );
  
      // Remove password and pin from response
      const userResponse = updatedUser.toObject();
      delete userResponse.password;
      delete userResponse.pin;
      
      res.status(200).json({ success: true, data: userResponse });
    } catch (error) {
      console.error("User Update Error:", error.message);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, msg: messages });
      }
      
      // Handle duplicate key errors (e.g., unique email)
      if (error.code === 11000) {
        return res.status(400).json({ success: false, msg: "Email already exists" });
      }
  
      return res.status(500).json({ success: false, msg: "Server error", error: error.message });
    }
}

export const fetchUsers = async (req, res) => {
    try { 
      const users = await User.find({}).select('-password -pin'); // Exclude sensitive fields
      res.status(200).json({ success: true, data: users });
    } catch(error) { 
      console.error("Error getting users:", error.message);
      res.status(500).json({ success: false, msg: "Server error", error: error.message });
    }
}

//Login Controller Methods
export const validateCredentials = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if required fields are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid email or password'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid email or password'
      });
    }

    // Return a simplified user object (without password and pin)
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.pin;
    
    res.status(200).json({
      success: true,
      msg: 'Credentials verified',
      user: userResponse
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

// Step 2: Validate PIN and complete login
export const validatePin = async (req, res) => {
  const { userId, pin } = req.body;

  try {
    // Check if required fields are provided
    if (!userId || !pin) {
      return res.status(400).json({
        success: false,
        msg: 'User ID and PIN are required'
      });
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        msg: 'PIN must be exactly 4 digits'
      });
    }

    // Find user by ID
    const user = await User.findById(userId);
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: 'User not found'
      });
    }

    // Compare PINs
    const isMatch = await bcrypt.compare(pin, user.pin);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid PIN'
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      msg: 'PIN verified'
    });
  } catch (error) {
    console.error('PIN Validation Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// Complete login process (include this in your user controller)
export const loginUser = async (req, res) => {
  const { email, password, pin } = req.body;

  try {
    // Check if required fields are provided
    if (!email || !password || !pin) {
      return res.status(400).json({
        success: false,
        msg: 'Email, password, and PIN are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid credentials'
      });
    }

    // Compare passwords
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid credentials'
      });
    }
    
    // Compare PINs
    const isPinMatch = await bcrypt.compare(pin, user.pin);
    
    if (!isPinMatch) {
      return res.status(401).json({
        success: false,
        msg: 'Invalid credentials'
      });
    }

    // Create a user object for the response (excluding sensitive info)
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.pin;
    
    // You might want to include JWT token generation here
    // const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      msg: 'Login successful',
      user: userResponse
      // token: token // Include if you're using JWT authentication
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