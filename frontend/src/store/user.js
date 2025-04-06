import { create } from 'zustand';
import axios from 'axios';
import { TokenHandler } from '../services/token.handler';

// Initialize the token refresh system
TokenHandler.setupInterceptors(axios);

export const useUserStore = create((set, get) => {
  // Helper functions - Moved outside of returned object for better memory usage
  const apiRequest = async (endpoint, options = {}) => {
    const headers = { 
      'Content-Type': 'application/json',
      ...TokenHandler.getAuthHeader(),
      ...options.headers 
    };
    
    const res = await fetch(`/api/${endpoint}`, {
      headers,
      credentials: 'include',
      ...options
    });
    
    // Handle token refresh
    const newToken = res.headers.get('x-new-access-token');
    if (newToken) TokenHandler.setToken(newToken);
    
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.msg || 'Request failed');
      error.status = res.status;
      throw error;
    }
    return data;
  };

  const withLoading = async (fn) => {
    set({ isLoading: true, error: null });
    try {
      return await fn();
    } catch (error) {
      set({ error: error.message });
      setTimeout(() => set({ error: null }), 5000);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  };

  // Validators - Using constant regex objects to avoid recompilation
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const PIN_REGEX = /^\d{4}$/;
  
  const validators = {
    email: (email) => {
      if (!email || email.length > 100) throw new Error(email ? 'Email is too long' : 'Email is required');
      if (!EMAIL_REGEX.test(email)) throw new Error('Please enter a valid email address');
      return true;
    },
    password: (password) => {
      if (!password) throw new Error('Password is required');
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');
      if (!PASSWORD_REGEX.test(password))
        throw new Error('Password must include uppercase, lowercase, number, and special character');
      return true;
    },
    pin: (pin) => {
      if (!PIN_REGEX.test(pin)) throw new Error('PIN must be exactly 4 digits');
      return true;
    }
  };

  // Internal store methods
  const handleTokenFromResponse = (data) => {
    if (data?.token) TokenHandler.setToken(data.token);
  };
  
  const startCooldownTimer = (seconds) => {
    set(state => ({ 
      pinCooldownTime: seconds, 
      cooldownCount: state.cooldownCount + 1 
    }));
    
    const timer = setInterval(() => {
      set((state) => {
        if (state.pinCooldownTime <= 1) {
          clearInterval(timer);
          return { pinCooldownTime: null, pinAttemptsLeft: 3 };
        }
        return { pinCooldownTime: state.pinCooldownTime - 1 };
      });
    }, 1000);
  };

  return {
    // State
    users: [],
    currentUser: null,
    isLoading: false,
    error: null,
    showLoginPopup: false,
    pinVerificationRequired: false,
    userId: null,
    pinAttemptsLeft: 3,
    pinCooldownTime: null,
    cooldownCount: 1,
    showSecurityQuestion: false,
    securityPhrase: '',
    
    // Setters - consolidated for less code
    setUsers: (users) => set({ users }),
    setCurrentUser: (user) => set({ currentUser: user }),
    setLoading: (isLoading) => set({ isLoading }),
    setShowLoginPopup: (showLoginPopup) => set({ showLoginPopup }),
    setPinVerificationRequired: (required, userId = null) => set({ pinVerificationRequired: required, userId }),
    setError: (error) => {
      set({ error });
      if (error) setTimeout(() => set({ error: null }), 5000);
    },
    
    // Auth state management
    resetPinState: () => set({
      pinVerificationRequired: false,
      userId: null,
      error: null,
      showSecurityQuestion: false,
      securityPhrase: '',
      pinAttemptsLeft: 3,
      pinCooldownTime: null,
      cooldownCount: 0
    }),
    
    // Use the extracted function
    startPinCooldown: startCooldownTimer,
    
    // Auth helpers
    checkAuthentication: () => {
      const { currentUser } = get();
      if (!currentUser) {
        set({ showLoginPopup: true });
        return false;
      }
      return true;
    },
    
    authenticatedNavigation: (navigate, path) => {
      const { currentUser } = get();
      if (currentUser) {
        navigate(path);
        return true;
      }
      set({ showLoginPopup: true });
      return false;
    },
    
    // Validators exposed to components
    validateEmail: validators.email,
    validatePassword: validators.password,
    validatePinFormat: validators.pin,
    
    // Auth flow methods - Streamlined for better alignment
    validateCredentials: async (email, password) => withLoading(async () => {
      validators.email(email);
      validators.password(password);
      
      const data = await apiRequest('user/validate-credentials', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      handleTokenFromResponse(data);
      set({ pinVerificationRequired: true, userId: data.userId || data.user?._id });
      return data;
    }),
    
    validatePin: async (pin, providedUserId = null) => withLoading(async () => {
      const self = get();
      validators.pin(pin);
      const userId = providedUserId || self.userId;
      
      if (!userId) throw new Error('User identification is missing');
      if (self.pinCooldownTime !== null) 
        throw new Error(`Too many incorrect attempts. Try again in ${self.pinCooldownTime} seconds.`);
      
      try {
        const data = await apiRequest('user/validate-pin', {
          method: 'POST',
          body: JSON.stringify({ userId, pin })
        });
        
        handleTokenFromResponse(data);
        set({ 
          pinVerificationRequired: false, 
          pinAttemptsLeft: 3,
          cooldownCount: 0,
          userId: null 
        });
        
        return data;
      } catch (error) {
        // Handle specific error cases
        if (error.message.includes('requireSecurityQuestion')) {
          await self.fetchSecurityPhrase(userId);
          set({ showSecurityQuestion: true });
          return { success: false, requireSecurityQuestion: true };
        }
        
        // Track attempts
        const attemptsLeft = Math.max(0, self.pinAttemptsLeft - 1);
        set({ pinAttemptsLeft: attemptsLeft });
        
        // Start cooldown if needed
        if (attemptsLeft === 0) {
          const seconds = error.message.includes('Try again in') 
            ? parseInt(error.message.match(/\d+/)[0]) || 30 
            : 30;
          startCooldownTimer(seconds);
        }
        
        throw error;
      }
    }),
    
    fetchSecurityPhrase: async (userId) => withLoading(async () => {
      const data = await apiRequest(`user/security-phrase/${userId}`);
      set({ securityPhrase: data.securityPhrase || "What was your first pet's name?" });
      return data;
    }),
    
    verifySecurityAnswer: async (securityAnswer) => withLoading(async () => {
      if (!securityAnswer.trim()) throw new Error('Please provide an answer');
      
      const userId = get().userId;
      if (!userId) throw new Error('User identification is missing');
      
      const data = await apiRequest('user/verify-security-question', {
        method: 'POST',
        body: JSON.stringify({ userId, securityAnswer })
      });
      
      handleTokenFromResponse(data);
      set({ 
        showSecurityQuestion: false,
        pinVerificationRequired: false,
        pinAttemptsLeft: 3,
        cooldownCount: 0,
        userId: null
      });
      
      return data;
    }),
    
    // Streamlined login flow that manages all steps
    loginUser: async (credentials) => withLoading(async () => {
      const self = get();
      
      // Step 1: If no PIN yet, validate credentials first
      if (!credentials.pin) {
        try {
          // Validate inputs
          if (!credentials.email || !credentials.password) {
            throw new Error('Email and password are required');
          }
          
          // Validate credentials
          const credentialsResult = await self.validateCredentials(credentials.email, credentials.password);
          handleTokenFromResponse(credentialsResult);
          
          // Return early, requiring PIN input
          return { 
            success: true, 
            requirePin: true, 
            userId: credentialsResult.userId || credentialsResult.user?._id
          };
        } catch (error) {
          // Let errors propagate up
          throw error;
        }
      }
      
      // Step 2: If PIN is provided, validate it
      if (credentials.pin) {
        try {
          validators.pin(credentials.pin);
          const pinResult = await self.validatePin(credentials.pin, credentials.userId);
          
          // If security question is required
          if (pinResult.requireSecurityQuestion) {
            return { success: false, requireSecurityQuestion: true };
          }
          
          // Complete login with API
          const data = await apiRequest('user/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
          });
          
          handleTokenFromResponse(data);
          set({
            currentUser: data.user,
            showLoginPopup: false,
            pinVerificationRequired: false,
            userId: null
          });
          
          return { success: true, msg: "Login Successful" };
        } catch (error) {
          // Let PIN validation errors propagate
          throw error;
        }
      }
    }),
    
    completeLogin: async (additionalData = {}) => withLoading(async () => {
      const userId = get().userId;
      if (!userId) throw new Error('Session expired, please login again');
      
      // Fetch user data
      const userData = await apiRequest(`user/${userId}`);
      
      // Generate token
      const tokenData = await apiRequest('user/generate-token', {
        method: 'POST',
        body: JSON.stringify({ 
          userId,
          email: additionalData.email,
          password: additionalData.password 
        })
      });
      
      handleTokenFromResponse(tokenData);
      set({
        currentUser: userData.user,
        showLoginPopup: false,
        pinVerificationRequired: false,
        showSecurityQuestion: false,
        userId: null,
        pinAttemptsLeft: 3,
        cooldownCount: 0
      });
      
      return { success: true, msg: "Login Successful" };
    }),
    
    initUserSession: async () => {
      const token = TokenHandler.getToken();
      if (!token) return { success: false };
      
      return withLoading(async () => {
        try {
          const data = await apiRequest('user/session');
          set({ currentUser: data.user });
          return { success: true };
        } catch (error) {
          if (error.status === 401) {
            TokenHandler.clearToken();
            set({ currentUser: null });
          }
          return { success: false, msg: error.message };
        }
      });
    },
    
    logoutUser: async () => withLoading(async () => {
      try {
        await apiRequest('user/logout', { method: 'POST' });
      } catch (error) {
        // Continue with logout even if API request fails
      }
      
      TokenHandler.clearToken();
      set({ currentUser: null });
      
      return { success: true, msg: "Logout Successful" };
    })
  };
});