import React, { useState } from 'react';
import { useUserStore } from '../store/user.js';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginUser, isLoading, error, setError } = useUserStore();
  
  // State for form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  
  // State to track which step of the login process we're on
  const [step, setStep] = useState(1);
  
  // State to store temporary user data between steps
  const [tempUserData, setTempUserData] = useState(null);
  
  // Handle email/password submission (first step)
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    try {
      // Make a custom API call to validate email/password without completing login
      const res = await fetch("/api/user/validate-credentials", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.msg || 'Invalid email or password');
      }
      
      // Store temporary user data and move to PIN step
      setTempUserData(data.user);
      setStep(2);
      setError(null);
    } catch (error) {
      setError(error.message || 'Authentication failed');
    }
  };
  
  // Handle PIN submission (second step)
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    
    if (!pin || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    
    try {
      // Complete the login process with PIN
      const res = await fetch("/api/user/validate-pin", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: tempUserData._id,
          pin 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.msg || 'Invalid PIN');
      }
      
      // Handle successful login
      await loginUser({
        email,
        password,
        pin
      });
      
      // Redirect to homepage
      navigate('/');
    } catch (error) {
      setError(error.message || 'PIN verification failed');
    }
  };
  
  // Go back to credentials step
  const handleBack = () => {
    setStep(1);
    setPin('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
        
        {/* Display any errors */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Step 1: Email and Password */}
        {step === 1 && (
          <form onSubmit={handleCredentialsSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isLoading ? 'Checking...' : 'Next'}
            </button>
          </form>
        )}
        
        {/* Step 2: PIN */}
        {step === 2 && (
          <form onSubmit={handlePinSubmit}>
            <div className="mb-6">
              <label htmlFor="pin" className="block text-gray-700 mb-2">
                Enter your 4-digit PIN
              </label>
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-widest"
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                pattern="\d{4}"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter the 4-digit PIN you created during registration
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleBack}
                className="w-1/3 bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Back
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Login'}
              </button>
            </div>
          </form>
        )}
        
        {/* Registration link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            {/* <a href="/register" className="text-blue-600 hover:underline">
              Register here
            </a> */}
            <a className="text-blue-600 hover:underline cursor:pointer" onClick={() => navigate("/register")}>
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;