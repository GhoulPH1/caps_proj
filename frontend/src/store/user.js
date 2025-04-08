import { create } from 'zustand';
import axios from 'axios';
import { TokenHandler } from '../services/token.handler';
import PinValidationService from '../components/service/PinValidationService';

// Initialize token refresh system
TokenHandler.setupInterceptors(axios);

// Constants for validation
const REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PIN: /^\d{4}$/
};

export const useUserStore = create((set, get) => {
  // Core API helper function
  const apiRequest = async (endpoint, options = {}) => {
    const res = await fetch(`/api/${endpoint}`, {
      headers: { 
        'Content-Type': 'application/json',
        ...TokenHandler.getAuthHeader(),
        ...options.headers 
      },
      credentials: 'include',
      ...options
    });
    
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

  // Validator functions
  const validators = {
    email: email => {
      if (!email || email.length > 100) throw new Error(email ? 'Email is too long' : 'Email is required');
      if (!REGEX.EMAIL.test(email)) throw new Error('Please enter a valid email address');
      return true;
    },
    password: password => {
      if (!password) throw new Error('Password is required');
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');
      if (!REGEX.PASSWORD.test(password))
        throw new Error('Password must include uppercase, lowercase, number, and special character');
      return true;
    },
    pin: pin => {
      if (!REGEX.PIN.test(pin)) throw new Error('PIN must be exactly 4 digits');
      return true;
    }
  };

  // Loading wrapper
  const withLoading = async fn => {
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

  // Helper methods
  const handleTokenFromResponse = (data, shouldSetToken = true) => {
    if (data?.token && shouldSetToken) TokenHandler.setToken(data.token);
  };
  
  const startCooldownTimer = seconds => {
    set(state => ({ pinCooldownTime: seconds, cooldownCount: state.cooldownCount + 1 }));
    
    const timer = setInterval(() => {
      set(state => {
        if (state.pinCooldownTime <= 1) {
          clearInterval(timer);
          return { pinCooldownTime: null, pinAttemptsLeft: 3 };
        }
        return { pinCooldownTime: state.pinCooldownTime - 1 };
      });
    }, 1000);
  };

  // Reset state helpers
  const resetAuthState = (includeUser = true) => set({
    ...(includeUser ? { currentUser: null } : {}),
    pinVerificationRequired: false,
    userId: null,
    error: null,
    showSecurityQuestion: false,
    securityPhrase: '',
    pinAttemptsLeft: 3,
    pinCooldownTime: null,
    cooldownCount: 0,
    authenticationComplete: false,
    showLoginPopup: false
  });

  // State getters
  const getAuthStatus = () => {
    const { currentUser, authenticationComplete } = get();
    return { isAuthenticated: !!(currentUser && authenticationComplete), currentUser, authenticationComplete };
  };

  return {
    // Core state
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
    authenticationComplete: false,
    
    // Simple setters
    setUsers: users => set({ users }),
    setCurrentUser: user => set({ currentUser: user }),
    setLoading: isLoading => set({ isLoading }),
    setShowLoginPopup: showLoginPopup => set({ showLoginPopup }),
    setPinVerificationRequired: (required, userId = null) => set({ pinVerificationRequired: required, userId }),
    setError: error => {
      set({ error });
      if (error) setTimeout(() => set({ error: null }), 5000);
    },
    
    // Reset states
    resetPinState: () => resetAuthState(false),
    startPinCooldown: startCooldownTimer,
    
    // Auth status helpers
    checkAuthentication: () => {
      const { isAuthenticated } = getAuthStatus();
      if (!isAuthenticated) set({ showLoginPopup: true });
      return isAuthenticated;
    },
    
    authenticatedNavigation: (navigate, path) => {
      const { isAuthenticated } = getAuthStatus();
      if (isAuthenticated) {
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
      validators.email(email);
      validators.password(password);
      
      const data = await apiRequest('user/validate-credentials', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      handleTokenFromResponse(data, false);
      
      set({ 
        pinVerificationRequired: true, 
        userId: data.userId || data.user?._id,
        authenticationComplete: false
      });
      
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
        const data = await PinValidationService.validatePin(userId, pin);
        
        handleTokenFromResponse(data);
        
        set({ 
          pinVerificationRequired: false, 
          pinAttemptsLeft: 3,
          cooldownCount: 0,
          userId: null,
          authenticationComplete: true
        });
        
        return data;
      } catch (error) {
        if (error.message.includes('requireSecurityQuestion')) {
          await self.fetchSecurityPhrase(userId);
          set({ showSecurityQuestion: true });
          return { success: false, requireSecurityQuestion: true };
        }
        
        // Handle cooldown and attempts
        if (error.cooldownTime) {
          startCooldownTimer(error.cooldownTime);
          set({ pinAttemptsLeft: 0 });
        } else {
          const attemptsLeft = Math.max(0, self.pinAttemptsLeft - 1);
          set({ pinAttemptsLeft: attemptsLeft });
          
          if (attemptsLeft === 0) {
            const seconds = error.message.includes('Try again in') 
              ? parseInt(error.message.match(/\d+/)[0]) || 30 
              : 30;
            startCooldownTimer(seconds);
          }
        }
        
        throw error;
      }
    }),
    
    fetchSecurityPhrase: async (userId) => withLoading(async () => {
      const data = await PinValidationService.getSecurityQuestion(userId);
      set({ securityPhrase: data.securityPhrase || "What was your first pet's name?" });
      return data;
    }),
    
    verifySecurityAnswer: async (securityAnswer) => withLoading(async () => {
      if (!securityAnswer.trim()) throw new Error('Please provide an answer');
      
      const userId = get().userId;
      if (!userId) throw new Error('User identification is missing');
      
      const data = await PinValidationService.verifySecurityQuestion(userId, securityAnswer);
      
      handleTokenFromResponse(data);
      
      set({ 
        showSecurityQuestion: false,
        pinVerificationRequired: false,
        pinAttemptsLeft: 3,
        cooldownCount: 0,
        userId: null,
        authenticationComplete: true
      });
      
      return data;
    }),
    
    resetPin: async (newPin, securityAnswer) => withLoading(async () => {
      const userId = get().userId;
      if (!userId) throw new Error('User identification is missing');
      
      validators.pin(newPin);
      if (!securityAnswer?.trim()) throw new Error('Security answer is required');
      
      const data = await PinValidationService.resetPin(userId, newPin, securityAnswer);
      
      set({
        showSecurityQuestion: false,
        pinVerificationRequired: false,
        pinAttemptsLeft: 3,
        cooldownCount: 0
      });
      
      return data;
    }),
    
    checkPinStatus: async (userId) => withLoading(async () => {
      if (!userId) throw new Error('User identification is missing');
      
      const data = await PinValidationService.checkPinLockoutStatus(userId);
      
      if (data.isLocked && data.cooldownTime) {
        startCooldownTimer(data.cooldownTime);
      }
      
      set({
        pinAttemptsLeft: data.attemptsLeft || 3,
        showSecurityQuestion: data.requiresSecurityQuestion || false
      });
      
      return data;
    }),
    
    // Combined login flow
    loginUser: async (credentials) => withLoading(async () => {
      // Step 1: Credential validation only
      if (!credentials.pin && !credentials.securityVerified) {
        if (!credentials.email || !credentials.password) {
          throw new Error('Email and password are required');
        }
        
        const credentialsResult = await get().validateCredentials(credentials.email, credentials.password);
        
        return { 
          success: true, 
          requirePin: true, 
          userId: credentialsResult.userId || credentialsResult.user?._id
        };
      }
      
      // Step 2: PIN validation
      if (credentials.pin) {
        validators.pin(credentials.pin);
        const pinResult = await get().validatePin(credentials.pin, credentials.userId);
        
        if (pinResult.requireSecurityQuestion) {
          return { success: false, requireSecurityQuestion: true };
        }
        
        const data = await apiRequest('user/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        });
        
        handleTokenFromResponse(data);
        
        set({
          currentUser: data.user,
          showLoginPopup: false,
          pinVerificationRequired: false,
          userId: null,
          authenticationComplete: true
        });
        
        return { success: true, msg: "Login Successful" };
      }
      
      // Step 3: Security validation path
      if (credentials.securityVerified) {
        const data = await apiRequest('user/login', {
          method: 'POST',
          body: JSON.stringify({
            ...credentials,
            securityVerified: true
          })
        });
        
        handleTokenFromResponse(data);
        
        set({
          currentUser: data.user,
          showLoginPopup: false,
          pinVerificationRequired: false,
          userId: null,
          authenticationComplete: true
        });
        
        return { success: true, msg: "Login Successful" };
      }
    }),
    
    completeLogin: async (additionalData = {}) => withLoading(async () => {
      const userId = get().userId;
      if (!userId) throw new Error('Session expired, please login again');
      
      const [userData, tokenData] = await Promise.all([
        apiRequest(`user/${userId}`),
        apiRequest('user/generate-token', {
          method: 'POST',
          body: JSON.stringify({ 
            userId,
            email: additionalData.email,
            password: additionalData.password 
          })
        })
      ]);
      
      handleTokenFromResponse(tokenData);
      
      set({
        currentUser: userData.user,
        showLoginPopup: false,
        pinVerificationRequired: false,
        showSecurityQuestion: false,
        userId: null,
        pinAttemptsLeft: 3,
        cooldownCount: 0,
        authenticationComplete: true
      });
      
      return { success: true, msg: "Login Successful" };
    }),
    
    initUserSession: async () => {
      const token = TokenHandler.getToken();
      if (!token) return { success: false };
      
      return withLoading(async () => {
        try {
          const data = await apiRequest('user/session');
          const isCompleteAuth = data.authenticationComplete !== false;
          
          set({ 
            currentUser: data.user,
            authenticationComplete: isCompleteAuth
          });
          
          return { success: true, authenticationComplete: isCompleteAuth };
        } catch (error) {
          if (error.status === 401) {
            TokenHandler.clearToken();
            resetAuthState();
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
      resetAuthState();
      
      return { success: true, msg: "Logout Successful" };
    })
  };
});