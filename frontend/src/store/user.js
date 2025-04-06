import { create } from 'zustand';

export const useUserStore = create((set, get) => {
  // Helper functions
  const apiRequest = async (endpoint, options = {}) => {
    const res = await fetch(`/api/${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Request failed');
    return data;
  };

  const withLoading = async (fn) => {
    set({ isLoading: true, error: null });
    try {
      const result = await fn();
      return result;
    } catch (error) {
      set({ error: error.message });
      setTimeout(() => set({ error: null }), 5000);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  };

  // Validators
  const validators = {
    email: (email) => {
      if (!email || email.length > 100) throw new Error(email ? 'Email is too long' : 'Email is required');
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) 
        throw new Error('Please enter a valid email address');
      return true;
    },
    password: (password) => {
      if (!password) throw new Error('Password is required');
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password))
        throw new Error('Password must include uppercase, lowercase, number, and special character');
      return true;
    },
    pin: (pin) => {
      if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');
      return true;
    }
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
    
    // Setters
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
    
    startPinCooldown: (seconds) => {
      set(state => ({ pinCooldownTime: seconds, cooldownCount: state.cooldownCount + 1 }));
      
      const timer = setInterval(() => {
        set((state) => {
          if (state.pinCooldownTime <= 1) {
            clearInterval(timer);
            return { pinCooldownTime: null, pinAttemptsLeft: 3 };
          }
          return { pinCooldownTime: state.pinCooldownTime - 1 };
        });
      }, 1000);
    },
    
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
    
    // Auth flow methods
    validateCredentials: async (email, password) => withLoading(async () => {
      const self = get();
      validators.email(email);
      validators.password(password);
      
      const data = await apiRequest('user/validate-credentials', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      set({ pinVerificationRequired: true, userId: data.userId || data.user?._id });
      return data;
    }),
    
    validatePin: async (pin, providedUserId = null) => {
      const self = get();
      return withLoading(async () => {
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
            self.startPinCooldown(seconds);
          }
          
          throw error;
        }
      });
    },
    
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
      
      set({ 
        showSecurityQuestion: false,
        pinVerificationRequired: false,
        pinAttemptsLeft: 3,
        cooldownCount: 0,
        userId: null
      });
      
      return data;
    }),
    
    // User management
    createUsers: async (newUser) => withLoading(async () => {
      // Validate all required fields
      const requiredFields = ['name', 'birthday', 'sexualOrientation', 'email', 
                             'password', 'pin', 'age', 'securityPhrase', 'securityAnswer'];
      
      if (!requiredFields.every(field => newUser[field])) {
        throw new Error('Missing required fields');
      }
      
      validators.email(newUser.email);
      validators.password(newUser.password);
      validators.pin(newUser.pin);
      
      const data = await apiRequest('user', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      
      set(state => ({
        users: [...state.users, data.data],
        currentUser: data.data
      }));
      
      return { success: true, msg: "User Registration Successful" };
    }),
    
    loginUser: async (credentials) => {
      const self = get();
      
      return withLoading(async () => {
        // Validate inputs
        if (!credentials.email || !credentials.password) {
          throw new Error('Email and password are required');
        }
        
        // Step 1: Validate credentials
        const credentialsResult = await self.validateCredentials(credentials.email, credentials.password);
        
        // Step 2: Validate PIN if provided
        if (credentials.pin) {
          validators.pin(credentials.pin);
          await self.validatePin(credentials.pin);
        } else {
          // Return early, requiring PIN input
          return { 
            success: true, 
            requirePin: true, 
            userId: credentialsResult.userId || credentialsResult.id
          };
        }
        
        // Complete login
        const data = await apiRequest('user/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        });
        
        // Store token
        localStorage.setItem('token', data.token);
        
        set({
          currentUser: data.user,
          showLoginPopup: false,
          pinVerificationRequired: false,
          userId: null
        });
        
        return { success: true, msg: "Login Successful" };
      });
    },
    
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
      
      // Store token
      localStorage.setItem('token', tokenData.token);
      
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
      const token = localStorage.getItem('token');
      if (!token) return { success: false };
      
      return withLoading(async () => {
        try {
          const data = await apiRequest('user/session', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          set({ currentUser: data.user });
          return { success: true };
        } catch (error) {
          localStorage.removeItem('token');
          set({ currentUser: null });
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
      
      localStorage.removeItem('token');
      set({ currentUser: null });
      
      return { success: true, msg: "Logout Successful" };
    })
  };
});