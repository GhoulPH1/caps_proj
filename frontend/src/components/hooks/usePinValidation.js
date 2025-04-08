import { useState, useEffect } from 'react';

/**
 * Custom hook to manage PIN validation, attempts and cooldown logic
 * @param {Object} options Configuration options
 * @param {Function} options.validatePinFn Function to validate PIN against API
 * @param {number} options.maxAttempts Maximum number of attempts before lockout (default: 3)
 * @param {number} options.cooldownSeconds Cooldown time in seconds after max attempts (default: 60)
 * @param {string} options.userId User ID for validation
 * @returns {Object} PIN validation state and handlers
 */
const usePinValidation = ({ 
  validatePinFn, 
  maxAttempts = 3, 
  cooldownSeconds = 60,
  userId 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pinAttemptsLeft, setPinAttemptsLeft] = useState(maxAttempts);
  const [pinCooldownTime, setPinCooldownTime] = useState(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [requiresSecurityQuestion, setRequiresSecurityQuestion] = useState(false);
  
  // Set up cooldown timer if needed
  useEffect(() => {
    let timer;
    
    if (pinCooldownTime !== null && pinCooldownTime > 0) {
      timer = setInterval(() => {
        setPinCooldownTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Reset attempts but maintain lockout status until security question is answered
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pinCooldownTime]);
  
  // Function to submit and validate PIN
  const validatePin = async (pinValue) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check for lockout state first
      if (isLockedOut && pinCooldownTime !== null) {
        throw new Error(`Account is temporarily locked. Try again in ${pinCooldownTime} seconds.`);
      }
      
      if (!userId) {
        throw new Error('User ID is required for PIN validation');
      }
      
      // Call the provided validation function
      const result = await validatePinFn(userId, pinValue);
      
      // Reset attempts on success
      setPinAttemptsLeft(maxAttempts);
      
      // Handle security question requirement
      if (result?.requireSecurityQuestion) {
        setRequiresSecurityQuestion(true);
        return { success: false, requireSecurityQuestion: true };
      }
      
      // Return success result
      return { success: true, ...result };
    } catch (error) {
      // Set error message
      setError(error.message || 'PIN validation failed');
      
      // Handle pin attempts and lockout logic
      if (error.message.includes('Invalid PIN') || (!error.message.includes('locked') && !error.cooldownTime)) {
        const newAttemptsLeft = pinAttemptsLeft - 1;
        setPinAttemptsLeft(newAttemptsLeft);
        
        // Apply lockout if attempts exhausted
        if (newAttemptsLeft <= 0) {
          setIsLockedOut(true);
          setPinCooldownTime(cooldownSeconds);
          setRequiresSecurityQuestion(true); // Force security question after lockout
        }
      }
      
      // If the error already indicates cooldown time
      if (error.cooldownTime) {
        setPinCooldownTime(error.cooldownTime);
        setIsLockedOut(true);
      }
      
      // Propagate error for handling in component
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to reset PIN validation state (e.g., after security question)
  const resetPinValidation = () => {
    setIsLockedOut(false);
    setPinAttemptsLeft(maxAttempts);
    setPinCooldownTime(null);
    setError(null);
    setRequiresSecurityQuestion(false);
  };
  
  return {
    isLoading,
    error,
    pinAttemptsLeft,
    pinCooldownTime,
    isLockedOut,
    requiresSecurityQuestion,
    validatePin,
    resetPinValidation
  };
};

export default usePinValidation;