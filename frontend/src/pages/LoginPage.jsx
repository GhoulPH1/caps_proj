import React, { useState, useRef } from 'react';
import { useUserStore } from '../store/user.js';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginUser, validateCredentials, validatePin, isLoading, error } = useUserStore();
  
  // State for form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  
  // Refs for PIN input focus management
  const pinInputRefs = useRef(Array(4).fill(null).map(() => React.createRef()));
  
  // State to track login steps and temporary user data
  const [step, setStep] = useState(1);
  const [tempUserData, setTempUserData] = useState(null);
  
  // Animation states for buttons
  const [credentialsButtonAnimation, setCredentialsButtonAnimation] = useState('');
  const [pinButtonAnimation, setPinButtonAnimation] = useState('');
  
  // Handle email/password submission (first step)
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    
    // Add entrance animation
    setCredentialsButtonAnimation('slide-right-enter');
    
    try {
      // Use store's validation function
      const result = await validateCredentials(email, password);
      
      // Store temporary user data and move to PIN step
      setTempUserData(result.user);
      
      // Add exit animation and transition to next step
      setCredentialsButtonAnimation('slide-right-exit');
      setTimeout(() => {
        setStep(2);
        setPin(['', '', '', '']); // Reset PIN
        
        // Focus on first PIN input
        setTimeout(() => pinInputRefs.current[0]?.current?.focus(), 100);
      }, 500); // Match animation duration
      
    } catch (error) {
      // Error is already handled by the store
      setCredentialsButtonAnimation(''); // Reset animation on error
    }
  };
  
  // Handle PIN submission (second step)
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    
    const pinValue = pin.join('');
    
    // Add entrance animation
    setPinButtonAnimation('slide-left-enter');
    
    try {
      // Validate PIN via store
      await validatePin(tempUserData._id, pinValue);
      
      // Complete login
      const loginResult = await loginUser({
        email,
        password,
        pin: pinValue
      });
      
      // Add exit animation before navigation
      setPinButtonAnimation('slide-left-exit');
      
      // Check if login was successful
      if (loginResult && loginResult.success) {
        setTimeout(() => navigate('/'), 500); // Match animation duration
      }
    } catch (error) {
      // Error is already handled by the store
      setPinButtonAnimation(''); // Reset animation on error
    }
  };
  
  // Render different login steps
  const renderLoginStep = () => {
    switch(step) {
      case 1:
        return renderCredentialsStep();
      case 2:
        return renderPinStep();
      default:
        return renderCredentialsStep();
    }
  };

  // Render credentials step (email and password)
  const renderCredentialsStep = () => (
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
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 bg-opacity-50 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
            required 
            autoComplete="email"
          />
        </div>
        
        <div className="space-y-1">
          <label className="block uppercase text-sm font-medium text-gray-400">PASSWORD</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 bg-opacity-50 text-white p-3 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500 pr-10"
              required 
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="material-icons">
                {showPassword ? 'visibility_off' : 'visibility'}
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
          className={`btn btn-colored w-full uppercase ${credentialsButtonAnimation}`}
        >
          {isLoading ? 'CHECKING...' : 'LOGIN'}
        </button>
      </form>
    </div>
  );

  // Render PIN entry step
  const renderPinStep = () => (
    <div className="flex flex-col items-center justify-center space-y-4 w-full">
      <div className="text-center space-y-2">
        <h2 className="text-lg text-gray-300">PLEASE</h2>
        <h1 className="text-4xl font-bold">ENTER <span className="font-extrabold">YOUR AUTHENTICATION PIN</span></h1>
        <p className="text-lg text-gray-300">Provide a 4-numerical character pin</p>
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
              onChange={(e) => {
                const sanitizedValue = e.target.value.replace(/\D/g, '').slice(0, 1);
                const newPin = [...pin];
                newPin[index] = sanitizedValue;
                setPin(newPin);
                
                // Automatically move to next input
                if (sanitizedValue && index < 3) {
                  pinInputRefs.current[index + 1]?.current?.focus();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !pin[index] && index > 0) {
                  pinInputRefs.current[index - 1]?.current?.focus();
                }
              }}
              className="w-16 h-16 bg-gray-700 bg-opacity-50 border border-gray-600 text-center text-2xl rounded focus:outline-none focus:ring-1 focus:ring-gray-500" 
              inputMode="numeric"
              pattern="\d*"
            />
          ))}
        </div>
        
        {error && <div className="text-center text-red-500">Error Message Here</div>}
        
        <div className="flex justify-end mt-6">
          <button 
            type="submit" 
            disabled={isLoading || pin.includes('')} 
            className={`btn btn-transparent px-12 ${pinButtonAnimation}`}
          >
            {isLoading ? 'VERIFYING...' : 'Proceed'}
          </button>
        </div>
      </form>
    </div>
  );

  // Render error message
  const renderErrorMessage = () => {
    if (!error) return null;
    
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white p-3 rounded shadow-lg z-50 max-w-md text-center slide-down-enter">
        {error}
      </div>
    );
  };

  // Navigation button with animation
  const NavButton = ({ to, children }) => (
    <a 
      href={to} 
      className="nav-link uppercase text-sm"
    >
      {children}
    </a>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative font-sans">
      {/* Error Message */}
      {renderErrorMessage()}

      {/* Navigation */}
      <nav className="flex justify-between items-center p-6">
        <div className="flex space-x-8">
          <NavButton to="/">HOME</NavButton>
          {step === 1 ? (
            <NavButton to="/register">REGISTER</NavButton>
          ) : (
            <>
              <NavButton to="/">HOME</NavButton>
              <NavButton to="/register">REGISTER</NavButton>
              <NavButton to="/about">ABOUT</NavButton>
            </>
          )}
        </div>
        {step === 2 && (
          <button 
            onClick={() => setStep(1)} 
            className="nav-link uppercase text-sm"
          >
            BACK
          </button>
        )}
      </nav>

      {/* Main Content - Flex layout for two-column design on PIN step */}
      <div className="flex-grow flex items-center">
        {step === 1 ? (
          <div className="w-full max-w-lg px-12 mx-auto">
            {renderCredentialsStep()}
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
            
            {/* Right section (PIN entry) */}
            <div className="w-2/3 px-6 flex items-center justify-center">
              {renderPinStep()}
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