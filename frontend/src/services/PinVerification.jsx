import React, { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../store/user';

const PinVerification = ({ onSuccess, onCancel, userId, additionalData = {} }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [buttonAnimation, setButtonAnimation] = useState('');
  const [securityButtonAnimation, setSecurityButtonAnimation] = useState('');
  
  // Get state and actions from the store
  const { 
    isLoading, 
    error,
    pinAttemptsLeft, 
    pinCooldownTime,
    showSecurityQuestion, 
    securityPhrase,
    validatePin,
    verifySecurityAnswer,
    resetPinState,
    completeLogin
  } = useUserStore();

  const pinInputRefs = useRef(Array(4).fill(null).map(() => React.createRef()));

  useEffect(() => {
    // Focus first input on component mount
    if (pinInputRefs.current[0]?.current) {
      setTimeout(() => pinInputRefs.current[0]?.current?.focus(), 100);
    }
  }, []);

  // Handle PIN submission
  const handlePinSubmit = async (e) => {
    if (e) e.preventDefault();
    
    const pinValue = pin.join('');
    
    // Add entrance animation
    setButtonAnimation('slide-left-enter');
    
    try {
      // Validate PIN via store
      const pinResult = await validatePin(pinValue, userId);
      
      // Check if we need to show security question
      if (pinResult && pinResult.requireSecurityQuestion) {
        setButtonAnimation('slide-left-exit');
        return;
      }
      
      // Complete login with additional data if provided
      const loginResult = await completeLogin(additionalData);
      
      // Add exit animation before callback
      setButtonAnimation('slide-left-exit');
      
      // Call success callback after animation
      if (loginResult && loginResult.success && onSuccess) {
        setTimeout(() => onSuccess(loginResult), 500);
      }
    } catch (error) {
      // Error is already handled by the store
      setButtonAnimation(''); // Reset animation on error
    }
  };

  // Handle security answer submission
  const handleSecuritySubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Add entrance animation
    setSecurityButtonAnimation('slide-left-enter');
    
    try {
      // Verify security answer
      const result = await verifySecurityAnswer(securityAnswer);
      
      if (result && result.success) {
        // Complete login with additional data if provided
        const loginResult = await completeLogin(additionalData);
        
        // Add exit animation before callback
        setSecurityButtonAnimation('slide-left-exit');
        
        // Call success callback after animation
        if (loginResult && loginResult.success && onSuccess) {
          setTimeout(() => onSuccess(loginResult), 500);
        }
      }
    } catch (error) {
      // Error is already handled by the store
      setSecurityButtonAnimation(''); // Reset animation on error
    }
  };

  // Render PIN entry step
  const renderPinStep = () => (
    <div className="flex flex-col items-center justify-center space-y-4 w-full">
      <div className="text-center space-y-2">
        <h2 className="text-lg text-gray-300">PLEASE</h2>
        <h1 className="text-4xl font-bold">ENTER <span className="font-extrabold">YOUR AUTHENTICATION PIN</span></h1>
        <p className="text-lg text-gray-300">Provide a 4-numerical character pin</p>
        
        {/* Attempts left indicator */}
        {pinAttemptsLeft < 3 && pinCooldownTime === null && (
          <p className="text-yellow-400 mt-2">
            {pinAttemptsLeft} attempts remaining
          </p>
        )}
        
        {/* Cooldown timer */}
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
              onChange={(e) => {
                const sanitizedValue = e.target.value.replace(/\D/g, '').slice(0, 1);
                const newPin = [...pin];
                newPin[index] = sanitizedValue;
                setPin(newPin);
                
                // Automatically move to next input
                if (sanitizedValue && index < 3) {
                  pinInputRefs.current[index + 1]?.current?.focus();
                }
                
                // Auto-submit if last digit entered
                if (sanitizedValue && index === 3) {
                  setTimeout(() => handlePinSubmit(), 300);
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
              disabled={pinCooldownTime !== null || isLoading}
            />
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <button 
            type="submit" 
            disabled={isLoading || pin.includes('') || pinCooldownTime !== null} 
            className={`btn btn-transparent px-12 ${buttonAnimation}`}
          >
            {isLoading ? 'VERIFYING...' : 'Proceed'}
          </button>
        </div>
      </form>
    </div>
  );

  // Render security question step
  const renderSecurityStep = () => (
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
            className={`btn btn-transparent px-12 ${securityButtonAnimation}`}
          >
            {isLoading ? 'VERIFYING...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );

  return showSecurityQuestion ? renderSecurityStep() : renderPinStep();
};

export default PinVerification;