import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user.js';
import PinValidation from '../../components/PinValidation';
import SecurityQuestion from '../../components/SecurityQuestion';
import usePinValidation from '../../components/hooks/usePinValidation.js';
import PinValidationService from '../../components/service/PinValidationService.js';

const LoginPage = () => {
  const navigate = useNavigate();
  const { 
    loginUser, 
    isLoading: storeLoading, 
    error: storeError
  } = useUserStore();
  
  // State management
  const [credentials, setCredentials] = useState({ email: '', password: '', showPassword: false });
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityPhrase, setSecurityPhrase] = useState('');
  const [step, setStep] = useState(1);
  const [tempUserData, setTempUserData] = useState(null);
  const [animations, setAnimations] = useState({
    credentials: '',
    security: ''
  });
  
  // Use PIN validation hook
  const {
    isLoading: pinLoading,
    error: pinError,
    pinAttemptsLeft,
    pinCooldownTime,
    isLockedOut,
    requiresSecurityQuestion,
    validatePin,
    resetPinValidation
  } = usePinValidation({
    validatePinFn: PinValidationService.validatePin,
    maxAttempts: 3,
    cooldownSeconds: 60,
    userId: tempUserData?._id
  });
  
  // Derived loading and error states
  const isLoading = storeLoading || pinLoading;
  const error = storeError || pinError;

  // Fetch security phrase when required
  useEffect(() => {
    const fetchSecurityPhrase = async () => {
      if (requiresSecurityQuestion && tempUserData?._id) {
        try {
          const result = await PinValidationService.getSecurityQuestion(tempUserData._id);
          if (result.securityPhrase) {
            setSecurityPhrase(result.securityPhrase);
          }
        } catch (error) {
          console.error("Failed to fetch security question:", error);
        }
      }
    };
    
    if (requiresSecurityQuestion) {
      fetchSecurityPhrase();
    }
  }, [requiresSecurityQuestion, tempUserData]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  // Credentials submission handler
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = credentials;
    
    setAnimations(prev => ({ ...prev, credentials: 'slide-right-enter' }));
    
    try {
      // Use the loginUser function directly, which will handle credential validation internally
      const result = await loginUser({ email, password });
      
      if (result?.requirePin) {
        // Set temporary user data if needed
        if (result?.userId) {
          setTempUserData({
            _id: result.userId
          });
        }
        
        // Check if the user is already locked out
        if (result?.userId) {
          try {
            const lockoutStatus = await PinValidationService.checkPinLockoutStatus(result.userId);
            if (lockoutStatus.isLocked) {
              if (lockoutStatus.requiresSecurityQuestion) {
                // Go directly to security question
                setStep(3);
                return;
              } else if (lockoutStatus.cooldownTime) {
                // Stay on PIN entry with cooldown
              }
            }
          } catch (error) {
            console.error("Failed to check PIN status:", error);
          }
        }
        
        setAnimations(prev => ({ ...prev, credentials: 'slide-right-exit' }));
        setTimeout(() => {
          setStep(2);
        }, 500);
      } else if (result?.success) {
        // If login completed (unlikely without PIN)
        setTimeout(() => navigate('/'), 500);
      }
    } catch (error) {
      setAnimations(prev => ({ ...prev, credentials: '' }));
    }
  };
  
  // PIN submission handler
  const handlePinSubmit = async (pinValue) => {
    try {
      // Use our custom PIN validation hook
      const result = await validatePin(pinValue);
      
      if (result?.requireSecurityQuestion || requiresSecurityQuestion) {
        setStep(3);
        return { success: false, requireSecurityQuestion: true };
      }
      
      // Complete the login with the PIN
      const loginResult = await loginUser({
        email: credentials.email,
        password: credentials.password,
        pin: pinValue,
        userId: tempUserData?._id
      });
      
      if (loginResult?.success) {
        setTimeout(() => navigate('/'), 500);
      }
      
      return { success: true };
    } catch (error) {
      // If PIN validation requires security question now
      if (requiresSecurityQuestion) {
        setStep(3);
      }
      throw error;
    }
  };

  // Security answer submission handler
  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    
    setAnimations(prev => ({ ...prev, security: 'slide-left-enter' }));
    
    try {
      const result = await PinValidationService.verifySecurityQuestion(
        tempUserData?._id,
        securityAnswer
      );
      
      if (result?.success) {
        // If user was locked out, show PIN reset screen
        if (isLockedOut || result.canResetPin) {
          setStep(4); // PIN reset step
        } else if (result.canProceed) {
          // Complete the login process after security verification
          await loginUser({
            email: credentials.email,
            password: credentials.password,
            securityVerified: true
          });
          
          setAnimations(prev => ({ ...prev, security: 'slide-left-exit' }));
          setTimeout(() => navigate('/'), 500);
        }
        
        // Reset PIN validation state
        resetPinValidation();
      }
    } catch (error) {
      setAnimations(prev => ({ ...prev, security: '' }));
    }
  };

  // PIN Reset handler
  const handlePinReset = async (newPin) => {
    try {
      const result = await PinValidationService.resetPin(
        tempUserData?._id,
        newPin,
        securityAnswer
      );
      
      if (result.success) {
        // Reset validation state
        resetPinValidation();
        
        // Go back to PIN entry
        setStep(2);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  };
  
  // Component renderers
  const LoginSteps = {
    1: () => (
      <div className="flex flex-col items-start justify-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-5xl font-bold">WELCOME TO</h2>
          <h1 className="text-7xl font-bold">SynoCore</h1>
          <p className="text-lg text-gray-300">Please sign in with your existing account</p>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <label className="block uppercase text-sm font-medium text-gray-400">EMAIL</label>
            <input 
              type="email" 
              name="email"
              value={credentials.email} 
              onChange={handleChange}
              className="w-full bg-gray-700 bg-opacity-50 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
              required 
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-1">
            <label className="block uppercase text-sm font-medium text-gray-400">PASSWORD</label>
            <div className="relative">
              <input 
                type={credentials.showPassword ? "text" : "password"} 
                name="password"
                value={credentials.password} 
                onChange={handleChange}
                className="w-full bg-gray-700 bg-opacity-50 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500 pr-10"
                required 
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setCredentials(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label={credentials.showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-icons">
                  {credentials.showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-right text-sm text-gray-400 hover:text-white cursor-pointer">
              Forgot Password? Reset
            </p>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading} 
            className={`btn btn-colored w-full uppercase ${animations.credentials}`}
          >
            {isLoading ? 'CHECKING...' : 'LOGIN'}
          </button>
        </form>
      </div>
    ),
    
    2: () => (
      <PinValidation 
        onPinSubmit={handlePinSubmit}
        isLoading={isLoading}
        error={error}
        pinAttemptsLeft={pinAttemptsLeft}
        pinCooldownTime={pinCooldownTime}
        disabled={isLockedOut}
      />
    ),
    
    3: () => (
      <SecurityQuestion
        securityPhrase={securityPhrase}
        securityAnswer={securityAnswer}
        setSecurityAnswer={setSecurityAnswer}
        onSubmit={handleSecuritySubmit}
        isLoading={isLoading}
        error={error}
        animation={animations.security}
      />
    ),
    
    4: () => (
      <PinValidation 
        onPinSubmit={handlePinReset}
        isLoading={isLoading}
        error={error}
        heading="SET A NEW PIN"
        subheading="Please create a new 4-digit PIN"
      />
    )
  };

  // Navigation link component
  const NavLink = ({ to, children, onClick }) => (
    <a 
      href={to} 
      onClick={onClick}
      className="nav-link uppercase text-sm"
    >
      {children}
    </a>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative font-sans">
      {/* Error Message */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white p-3 rounded shadow-lg z-50 max-w-md text-center slide-down-enter">
          {error}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex justify-between items-center p-6">
        <div className="flex space-x-8">
          <NavLink to="/">HOME</NavLink>
          {step === 1 ? (
            <NavLink to="/register">REGISTER</NavLink>
          ) : (
            <>
              <NavLink to="/">HOME</NavLink>
              <NavLink to="/register">REGISTER</NavLink>
              <NavLink to="/about">ABOUT</NavLink>
            </>
          )}
        </div>
        {step > 1 && (
          <button 
            onClick={() => {
              // Don't go back if in lockout state
              if (step === 3 && isLockedOut) return;
              setStep(Math.max(1, step - 1));
            }} 
            className="nav-link uppercase text-sm"
            disabled={step === 3 && isLockedOut}
          >
            BACK
          </button>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex-grow flex items-center">
        {step === 1 ? (
          <div className="w-full max-w-lg px-12 mx-auto">
            {LoginSteps[1]()}
          </div>
        ) : (
          <div className="w-full flex">
            {/* Left section (blurred form) */}
            <div className="w-1/3 px-6 flex items-center justify-center opacity-30 blur-sm">
              <div className="space-y-6">
                <h2 className="text-4xl font-bold">SynoCore</h2>
                <p className="text-lg">Security verification required</p>
              </div>
            </div>
            
            {/* Right section (active authentication step) */}
            <div className="w-2/3 px-12 flex items-center">
              <div className="w-full max-w-md mx-auto">
                {LoginSteps[step]()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;