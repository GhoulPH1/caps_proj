import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const SecurityQuestion = ({
  securityPhrase,
  securityAnswer,
  setSecurityAnswer,
  onSubmit,
  isLoading = false,
  error = null,
  animation = '',
  heading = "SECURITY VERIFICATION REQUIRED",
  subheading = "Please answer your security question to continue"
}) => {
  const [answerFocused, setAnswerFocused] = useState(false);
  
  // Focus the answer input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const inputElement = document.getElementById('security-answer-input');
      if (inputElement) inputElement.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full">
      <div className="text-center space-y-2">
        <h2 className="text-lg text-gray-300">PLEASE</h2>
        <h1 className="text-4xl font-bold">
          <span className="font-extrabold">{heading}</span>
        </h1>
        <p className="text-lg text-gray-300">{subheading}</p>
      </div>
      
      <form onSubmit={onSubmit} className="w-full space-y-8">
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
            <p className="text-center text-xl font-medium">{securityPhrase}</p>
          </div>
          
          <div className={`relative border ${answerFocused ? 'border-gray-400' : 'border-gray-600'} rounded-md`}>
            <input
              id="security-answer-input"
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              onFocus={() => setAnswerFocused(true)}
              onBlur={() => setAnswerFocused(false)}
              className="w-full bg-gray-700 bg-opacity-50 p-4 text-lg rounded-md focus:outline-none"
              placeholder="Your answer"
              autoComplete="off"
              required
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isLoading || !securityAnswer.trim()} 
            className={`btn btn-transparent px-12 ${animation}`}
          >
            {isLoading ? 'VERIFYING...' : 'Submit Answer'}
          </button>
        </div>
      </form>
      
      {error && (
        <p className="text-red-400 text-center">{error}</p>
      )}
    </div>
  );
};

SecurityQuestion.propTypes = {
  securityPhrase: PropTypes.string.isRequired,
  securityAnswer: PropTypes.string.isRequired,
  setSecurityAnswer: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  animation: PropTypes.string,
  heading: PropTypes.string,
  subheading: PropTypes.string
};

export default SecurityQuestion;