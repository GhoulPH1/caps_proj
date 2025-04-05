import { create } from 'zustand';

export const useUserStore = create((set, get) => ({
  // State
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
  showLoginPopup: false,
  
  // Basic state setters
  setUsers: (users) => set({ users }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setLoading: (isLoading) => set({ isLoading }),
  setShowLoginPopup: (showLoginPopup) => set({ showLoginPopup }),
  setError: (error) => {
    set({ error });
    // Clear error after 5 seconds
    if (error) {
      setTimeout(() => set({ error: null }), 5000);
    }
  },
  
  // Check if user is authenticated
  checkAuthentication: () => {
    const { currentUser } = get();
    if (!currentUser) {
      set({ showLoginPopup: true });
      return false;
    }
    return true;
  },
  
  // Helper for authenticated navigation
  authenticatedNavigation: (navigate, path) => {
    const { currentUser } = get();
    if (currentUser) {
      navigate(path);
      return true;
    } else {
      set({ showLoginPopup: true });
      return false;
    }
  },
  
  // Validate email with regex
  validateEmail: (email) => {
    if (!email) {
      throw new Error('Email is required');
    }
    
    if (email.length > 100) {
      throw new Error('Email is too long');
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    return true;
  },
  
  // Validate password with regex
  validatePassword: (password) => {
    if (!password) {
      throw new Error('Password is required');
    }
    
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error('Password must include uppercase, lowercase, number, and special character');
    }
    
    return true;
  },
  
  // Validate PIN format
  validatePinFormat: (pin) => {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    return true;
  },
  
  // First step: validate credentials
  validateCredentials: async (email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      // Internal validation
      const self = get();
      self.validateEmail(email);
      self.validatePassword(password);
      
      // API validation
      const res = await fetch("/api/user/validate-credentials", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.msg || 'Authentication failed');
      }
      
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  // Second step: validate PIN
  validatePin: async (userId, pin) => {
    set({ isLoading: true, error: null });
    
    try {
      // Internal validation
      const self = get();
      self.validatePinFormat(pin);
      
      // API validation
      const res = await fetch("/api/user/validate-pin", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.msg || 'PIN verification failed');
      }
      
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  // Create a new user
  createUsers: async (newUser) => {
    const self = get();
    
    try {
      // Validate all required fields
      if (!newUser.name || !newUser.birthday || !newUser.sexualOrientation || 
          !newUser.email || !newUser.password || !newUser.pin || !newUser.age) {
        throw new Error('Missing required fields');
      }
      
      // Validate email and password format
      self.validateEmail(newUser.email);
      self.validatePassword(newUser.password);
      self.validatePinFormat(newUser.pin);
      
      // Set loading state
      set({ isLoading: true, error: null });
      
      // Make API request
      const res = await fetch("/api/user", { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      // Parse response data
      const data = await res.json();
      
      // Check if request was successful
      if (!res.ok) {
        throw new Error(data.msg || 'Failed to create user');
      }
      
      // Update store state
      set((state) => ({
        users: [...state.users, data.data],
        currentUser: data.data,
        isLoading: false,
        error: null
      }));
      
      return { success: true, msg: "User Registration Successful" };
    } catch (error) {
      // Handle errors
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  // Login user (final step)
  loginUser: async (credentials) => {
    const self = get();
    
    try {
      // Validate required fields
      if (!credentials.email || !credentials.password || !credentials.pin) {
        throw new Error('Email, password, and PIN are required');
      }
      
      // Validate formats
      self.validateEmail(credentials.email);
      self.validatePassword(credentials.password);
      self.validatePinFormat(credentials.pin);
      
      // Set loading state
      set({ isLoading: true, error: null });
      
      // Make API request to complete login
      const res = await fetch("/api/user/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      // Parse response data
      const data = await res.json();
      
      // Check if request was successful
      if (!res.ok) {
        throw new Error(data.msg || 'Login failed');
      }

      // Store the token in localStorage
      localStorage.setItem('token', data.token);
      
      // Update store state
      set({
        currentUser: data.user,
        isLoading: false,
        error: null,
        showLoginPopup: false
      });
      
      return { success: true, msg: "Login Successful" };
    } catch (error) {
      // Handle errors
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  // Initialize user session from token
  initUserSession: async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return { success: false };
    }
    
    set({ isLoading: true });
    
    try {
      // Verify token and get user data
      const res = await fetch("/api/user/session", {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        localStorage.removeItem('token');
        throw new Error(data.msg || 'Session expired');
      }
      
      set({
        currentUser: data.user,
        isLoading: false
      });
      
      return { success: true };
    } catch (error) {
      set({ 
        currentUser: null,
        isLoading: false, 
        error: error.message 
      });
      return { success: false, msg: error.message };
    }
  },
  
  // Logout user
  logoutUser: async () => {
    // Set loading state
    set({ isLoading: true });
    
    try {
      // Make API request (if needed)
      await fetch("/api/user/logout", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Remove the token from localStorage
      localStorage.removeItem('token');
      
      // Update store state
      set({
        currentUser: null,
        isLoading: false,
        error: null
      });
      
      return { success: true, msg: "Logout Successful" };
    } catch (error) {
      // Handle errors
      set({ isLoading: false, error: error.message });
      return { success: false, msg: error.message };
    }
  }
}));