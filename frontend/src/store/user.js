import { create } from 'zustand';
import axios from 'axios';
import { TokenHandler } from '../services/token.handler';
import PinValidationService from '../components/service/PinValidationService';

TokenHandler.setupInterceptors(axios);

const REGEX = {
  EMAIL: /^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,
  PIN: /^\d{4}$/
};

export const useUserStore = create((set, get) => {
  const setState = (payload) => set(payload);
  const handleError = (error) => {
    const message = error?.message || 'An error occurred';
    setState({ error: message });
    setTimeout(() => setState({ error: null }), 5000);
    throw error;
  };

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

  const validators = {
    email: (email) => {
      if (!email || email.length > 100) throw new Error('Invalid or too long email');
      if (!REGEX.EMAIL.test(email)) throw new Error('Invalid email format');
      return true;
    },
    password: (password) => {
      if (!password) throw new Error('Password is required');
      if (password.length < 8 || !REGEX.PASSWORD.test(password))
        throw new Error('Password must include uppercase, lowercase, number, and special character');
      return true;
    },
    pin: (pin) => {
      if (!REGEX.PIN.test(pin)) throw new Error('PIN must be 4 digits');
      return true;
    }
  };

  const withLoading = async (fn) => {
    setState({ isLoading: true, error: null });
    try {
      return await fn();
    } catch (err) {
      return handleError(err);
    } finally {
      setState({ isLoading: false });
    }
  };

  const startCooldownTimer = (seconds) => {
    setState((s) => ({
      pinCooldownTime: seconds,
      cooldownCount: s.cooldownCount + 1
    }));

    const timer = setInterval(() => {
      setState((s) => {
        if (s.pinCooldownTime <= 1) {
          clearInterval(timer);
          return { pinCooldownTime: null, pinAttemptsLeft: 3 };
        }
        return { pinCooldownTime: s.pinCooldownTime - 1 };
      });
    }, 1000);
  };

  const resetAuthState = (includeUser = true) => setState({
    ...(includeUser && { currentUser: null }),
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

  const getAuthStatus = () => {
    const { currentUser, authenticationComplete } = get();
    return {
      isAuthenticated: !!(currentUser && authenticationComplete),
      currentUser,
      authenticationComplete
    };
  };

  const handleTokenFromResponse = (data, save = true) => {
    if (data?.token && save) TokenHandler.setToken(data.token);
  };

  return {
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

    setUsers: (users) => setState({ users }),
    setCurrentUser: (user) => setState({ currentUser: user }),
    setLoading: (isLoading) => setState({ isLoading }),
    setShowLoginPopup: (show) => setState({ showLoginPopup: show }),
    setPinVerificationRequired: (required, userId = null) => setState({ pinVerificationRequired: required, userId }),
    setError: (error) => {
      setState({ error });
      if (error) setTimeout(() => setState({ error: null }), 5000);
    },

    resetPinState: () => resetAuthState(false),
    startPinCooldown: startCooldownTimer,

    checkAuthentication: () => {
      const { isAuthenticated } = getAuthStatus();
      if (!isAuthenticated) setState({ showLoginPopup: true });
      return isAuthenticated;
    },

    authenticatedNavigation: (navigate, path) => {
      const { isAuthenticated } = getAuthStatus();
      if (isAuthenticated) {
        navigate(path);
        return true;
      }
      setState({ showLoginPopup: true });
      return false;
    },

    validateEmail: validators.email,
    validatePassword: validators.password,
    validatePinFormat: validators.pin,

    validateCredentials: async (email, password) => withLoading(async () => {
      validators.email(email);
      validators.password(password);

      const data = await apiRequest('user/validate-credentials', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      handleTokenFromResponse(data, false);

      setState({
        pinVerificationRequired: true,
        userId: data.userId || data.user?._id,
        authenticationComplete: false
      });

      return data;
    }),

    validatePin: async (pin, providedUserId = null) => withLoading(async () => {
      const state = get();
      validators.pin(pin);

      const userId = providedUserId || state.userId;
      if (!userId) throw new Error('User ID is missing');

      if (state.pinCooldownTime !== null)
        throw new Error(`Too many attempts. Try again in ${state.pinCooldownTime} seconds.`);

      try {
        const data = await PinValidationService.validatePin(userId, pin);
        handleTokenFromResponse(data);

        setState({
          pinVerificationRequired: false,
          pinAttemptsLeft: 3,
          cooldownCount: 0,
          userId: null,
          authenticationComplete: true
        });

        return data;
      } catch (error) {
        if (error.message.includes('requireSecurityQuestion')) {
          await get().fetchSecurityPhrase(userId);
          setState({ showSecurityQuestion: true });
          return { success: false, requireSecurityQuestion: true };
        }

        const attemptsLeft = Math.max(0, state.pinAttemptsLeft - 1);
        setState({ pinAttemptsLeft: attemptsLeft });

        if (error.cooldownTime || attemptsLeft === 0) {
          const seconds = error.cooldownTime || parseInt(error.message.match(/\d+/)?.[0]) || 30;
          startCooldownTimer(seconds);
          setState({ pinAttemptsLeft: 0 });
        }

        throw error;
      }
    }),

    fetchSecurityPhrase: async (userId) => withLoading(async () => {
      const data = await PinValidationService.getSecurityQuestion(userId);
      setState({ securityPhrase: data.securityPhrase || "What was your first pet's name?" });
      return data;
    }),

    verifySecurityAnswer: async (answer) => withLoading(async () => {
      if (!answer.trim()) throw new Error('Answer required');

      const userId = get().userId;
      if (!userId) throw new Error('User ID missing');

      const data = await PinValidationService.verifySecurityQuestion(userId, answer);
      handleTokenFromResponse(data);

      resetAuthState(false);
      setState({ authenticationComplete: true });
      return data;
    }),

    resetPin: async (newPin, answer) => withLoading(async () => {
      const userId = get().userId;
      if (!userId) throw new Error('User ID missing');

      validators.pin(newPin);
      if (!answer?.trim()) throw new Error('Answer required');

      const data = await PinValidationService.resetPin(userId, newPin, answer);
      resetAuthState(false);
      return data;
    }),

    checkPinStatus: async (userId) => withLoading(async () => {
      if (!userId) throw new Error('User ID required');

      const data = await PinValidationService.checkPinLockoutStatus(userId);

      if (data.isLocked && data.cooldownTime) startCooldownTimer(data.cooldownTime);

      setState({
        pinAttemptsLeft: data.attemptsLeft || 3,
        showSecurityQuestion: !!data.requiresSecurityQuestion
      });

      return data;
    }),

    initUserSession: async () => {
      const token = TokenHandler.getToken();
      if (!token) return { success: false };
      
      if (TokenHandler.isTokenExpired(token)) {
        // Try to use refresh token mechanism silently
        try {
          // This would hit your backend refresh token endpoint
          const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Include cookies
          });
          
          if (!response.ok) {
            TokenHandler.clearToken();
            set({ currentUser: null, authenticationComplete: false });
            return { success: false };
          }
          
          const data = await response.json();
          if (data.accessToken) {
            TokenHandler.setToken(data.accessToken);
          } else {
            TokenHandler.clearToken();
            set({ currentUser: null, authenticationComplete: false });
            return { success: false };
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
          TokenHandler.clearToken();
          set({ currentUser: null, authenticationComplete: false });
          return { success: false };
        }
      }
      
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
            set({ currentUser: null, authenticationComplete: false });
          }
          return { success: false, msg: error.message };
        }
      })();
    },

    createUsers: async (userData) => withLoading(async () => {
      try {
        // Call the API to register a new user
        const data = await apiRequest('user/register', {
          method: 'POST',
          body: JSON.stringify(userData)
        });
        
        return {
          success: true,
          msg: data.msg || 'User registered successfully'
        };
      } catch (error) {
        return {
          success: false,
          msg: error.message || 'Registration failed'
        };
      }
    }),

    loginUser: async (credentials) => withLoading(async () => {
      if (!credentials.pin && !credentials.securityVerified) {
        if (!credentials.email || !credentials.password)
          throw new Error('Email and password required');

        const result = await get().validateCredentials(credentials.email, credentials.password);
        return {
          success: true,
          requirePin: true,
          userId: result.userId || result.user?._id
        };
      }

      if (credentials.pin) {
        validators.pin(credentials.pin);
        const pinResult = await get().validatePin(credentials.pin, credentials.userId);
        if (pinResult.requireSecurityQuestion) return { success: false, requireSecurityQuestion: true };

        const data = await apiRequest('user/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        });

        handleTokenFromResponse(data);
        setState({ currentUser: data.user });
        return { success: true, user: data.user };
      }
    })
  };
});
