import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '../../store/user.js';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const { 
    loginUser, 
    validateCredentials, 
    validatePin, 
    verifySecurityAnswer,
    isLoading, 
    error, 
    pinAttemptsLeft,
    pinCooldownTime,
    showSecurityQuestion,
    securityPhrase,
    userId
  } = useUserStore();
  
  // State management
  const [credentials, setCredentials] = useState({ email: '', password: '', showPassword: false });
  const [pin, setPin] = useState(['', '', '', '']);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [step, setStep] = useState(1);
  const [tempUserData, setTempUserData] = useState(null);
  const [animations, setAnimations] = useState({
    credentials: '',
    pin: '',
    security: ''
  });
  
  // PIN input refs for focus management
  const pinInputRefs = useRef(Array(4).fill().map(() => React.createRef()));

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  // Handle PIN input changes
  const handlePinChange = (index, value) => {
    const sanitizedValue = value.replace(/\D/g, '').slice(0, 1);
    const newPin = [...pin];
    newPin[index] = sanitizedValue;
    setPin(newPin);
    
    // Auto-focus next input
    if (sanitizedValue && index < 3) {
      pinInputRefs.current[index + 1]?.current?.focus();
    }
  };

  // Credentials submission handler
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = credentials;
    
    setAnimations(prev => ({ ...prev, credentials: 'slide-right-enter' }));
    
    try {
      const result = await validateCredentials(email, password);
      
      if (result?.user || result?.userId) {
        setTempUserData({
          _id: result.userId || result.user?._id,
          ...result.user
        });
      }
      
      setAnimations(prev => ({ ...prev, credentials: 'slide-right-exit' }));
      setTimeout(() => {
        setStep(2);
        setPin(['', '', '', '']);
        setTimeout(() => pinInputRefs.current[0]?.current?.focus(), 100);
      }, 500);
      
    } catch (error) {
      setAnimations(prev => ({ ...prev, credentials: '' }));
    }
  };
  
  // PIN submission handler
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    const pinValue = pin.join('');
    const userIdToUse = userId || tempUserData?._id;
    
    setAnimations(prev => ({ ...prev, pin: 'slide-left-enter' }));
    
    try {
      const pinResult = await validatePin(pinValue, userIdToUse);
      
      if (pinResult?.requireSecurityQuestion) {
        setAnimations(prev => ({ ...prev, pin: 'slide-left-exit' }));
        setTimeout(() => setStep(3), 500);
        return;
      }
      
      const loginResult = await loginUser({
        email: credentials.email,
        password: credentials.password,
        pin: pinValue,
        userId: userIdToUse
      });
      
      setAnimations(prev => ({ ...prev, pin: 'slide-left-exit' }));
      
      if (loginResult?.success) {
        setTimeout(() => navigate('/'), 500);
      }
    } catch (error) {
      setAnimations(prev => ({ ...prev, pin: '' }));
    }
  };

  // Security answer submission handler
  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    
    setAnimations(prev => ({ ...prev, security: 'slide-left-enter' }));
    
    try {
      const result = await verifySecurityAnswer(securityAnswer);
      
      if (result?.success) {
        const loginResult = await loginUser({
          email: credentials.email,
          password: credentials.password,
          userId: userId || tempUserData?._id
        });
        
        setAnimations(prev => ({ ...prev, security: 'slide-left-exit' }));
        
        if (loginResult?.success) {
          setTimeout(() => navigate('/'), 500);
        }
      }
    } catch (error) {
      setAnimations(prev => ({ ...prev, security: '' }));
    }
  };
  
  // Debug logging
  useEffect(() => {
    if (userId) {
      console.log("User ID from store:", userId);
    }
  }, [userId]);
  
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
      <div className="flex flex-col items-center justify-center space-y-4 w-full">
        <div className="text-center space-y-2">
          <h2 className="text-lg text-gray-300">PLEASE</h2>
          <h1 className="text-4xl font-bold">ENTER <span className="font-extrabold">YOUR AUTHENTICATION PIN</span></h1>
          <p className="text-lg text-gray-300">Provide a 4-numerical character pin</p>
          
          {/* {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-gray-500">
              User ID: {userId || tempUserData?._id || 'Not available'}
            </p>
          )} */}
          
          {pinAttemptsLeft < 3 && pinCooldownTime === null && (
            <p className="text-yellow-400 mt-2">
              {pinAttemptsLeft} attempts remaining
            </p>
          )}
          
          {pinCooldownTime !== null && (
            <p className="text-red-400 mt-2">
              Too many incorrect attempts. Try again in {pinCooldownTime} seconds.
            </p>
          )}
        </div>
        
        <form onSubmit={handlePinSubmit} className="w-full space-y-8">
          <div className="flex justify-center space-x-4 mt-6">
            {pin.map((digit, index) => (
              <input 
                key={index} 
                ref={pinInputRefs.current[index]} 
                type="password" 
                maxLength={1} 
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !pin[index] && index > 0) {
                    pinInputRefs.current[index - 1]?.current?.focus();
                  }
                }}
                className="w-16 h-16 bg-gray-700 bg-opacity-50 border border-gray-600 text-center text-2xl rounded focus:outline-none focus:ring-1 focus:ring-gray-500" 
                inputMode="numeric"
                pattern="\d*"
                disabled={pinCooldownTime !== null}
              />
            ))}
          </div>
          
          <div className="flex justify-end mt-6">
            <button 
              type="submit" 
              disabled={isLoading || pin.includes('') || pinCooldownTime !== null} 
              className={`btn btn-transparent px-12 ${animations.pin}`}
            >
              {isLoading ? 'VERIFYING...' : 'Proceed'}
            </button>
          </div>
        </form>
      </div>
    ),
    
    3: () => (
      <div className="flex flex-col items-center justify-center space-y-4 w-full">
        <div className="text-center space-y-2">
          <h2 className="text-lg text-gray-300">SECURITY VERIFICATION</h2>
          <h1 className="text-4xl font-bold">ANSWER <span className="font-extrabold">YOUR SECURITY QUESTION</span></h1>
          <p className="text-lg text-gray-300">{securityPhrase}</p>
        </div>
        
        <form onSubmit={handleSecuritySubmit} className="w-full space-y-8 max-w-md mx-auto">
          <div className="space-y-1">
            <label className="block uppercase text-sm font-medium text-gray-400">YOUR ANSWER</label>
            <input 
              type="text" 
              value={securityAnswer} 
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full bg-gray-700 bg-opacity-50 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
              required 
              autoComplete="off"
            />
          </div>
          
          <div className="flex justify-end mt-6">
            <button 
              type="submit" 
              disabled={isLoading || !securityAnswer.trim()} 
              className={`btn btn-transparent px-12 ${animations.security}`}
            >
              {isLoading ? 'VERIFYING...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
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
            onClick={() => setStep(step - 1)} 
            className="nav-link uppercase text-sm"
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
                <p className="text-gray-400">Please sign in with your existing account</p>
                <div className="space-y-4">
                  <div className="h-12 bg-gray-800 rounded"></div>
                  <div className="h-12 bg-gray-800 rounded"></div>
                  <button className="w-full h-12 bg-gray-800 rounded"></button>
                </div>
              </div>
            </div>
            
            {/* Right section (PIN entry or Security Question) */}
            <div className="w-2/3 px-6 flex items-center justify-center">
              {LoginSteps[step]()}
            </div>
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="absolute bottom-6 right-6 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/src/assets/synocore-logo.png" alt="SynoCore Logo" className="h-12 w-auto" />
      </div>
    </div>
  );
};

export default LoginPage;