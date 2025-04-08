import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const PinValidation = ({ 
  onPinSubmit,
  isLoading,
  error,
  pinAttemptsLeft,
  pinCooldownTime,
  maxLength = 4,
  disabled = false,
  heading = "ENTER YOUR AUTHENTICATION PIN",
  subheading = "Provide a 4-numerical character pin"
}) => {
  const [pin, setPin] = useState(Array(maxLength).fill(''));
  const pinInputRefs = useRef(Array(maxLength).fill().map(() => React.createRef()));
  const [animation, setAnimation] = useState('');

  // Handle PIN input changes
  const handlePinChange = (index, value) => {
    const sanitizedValue = value.replace(/\D/g, '').slice(0, 1);
    const newPin = [...pin];
    newPin[index] = sanitizedValue;
    setPin(newPin);
    
    // Auto-focus next input
    if (sanitizedValue && index < maxLength - 1) {
      pinInputRefs.current[index + 1]?.current?.focus();
    }
  };

  // PIN submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    const pinValue = pin.join('');
    
    setAnimation('slide-left-enter');
    
    onPinSubmit(pinValue)
      .then(() => {
        setAnimation('slide-left-exit');
      })
      .catch(() => {
        setAnimation('');
      });
  };

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => pinInputRefs.current[0]?.current?.focus(), 100);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full">
      <div className="text-center space-y-2">
        <h2 className="text-lg text-gray-300">PLEASE</h2>
        <h1 className="text-4xl font-bold">
          <span className="font-extrabold">{heading}</span>
        </h1>
        <p className="text-lg text-gray-300">{subheading}</p>
        
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
      
      <form onSubmit={handleSubmit} className="w-full space-y-8">
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
              disabled={disabled || pinCooldownTime !== null}
            />
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <button 
            type="submit" 
            disabled={isLoading || pin.includes('') || pinCooldownTime !== null || disabled} 
            className={`btn btn-transparent px-12 ${animation}`}
          >
            {isLoading ? 'VERIFYING...' : 'Proceed'}
          </button>
        </div>
      </form>
    </div>
  );
};

PinValidation.propTypes = {
  onPinSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  pinAttemptsLeft: PropTypes.number,
  pinCooldownTime: PropTypes.number,
  maxLength: PropTypes.number,
  disabled: PropTypes.bool,
  heading: PropTypes.string,
  subheading: PropTypes.string
};

export default PinValidation;