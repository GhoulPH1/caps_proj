import React, { useState } from 'react';
import axios from 'axios';

const PasswordReset = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    pin: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear errors when user starts typing
    setError(null);
  };

  const validatePasswordComplexity = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
  };

  const validateStep1 = () => {
    if (!formData.email) return "Email is required";
    if (!formData.pin) return "PIN is required";
    if (!/^\d{4}$/.test(formData.pin)) return "PIN must be exactly 4 digits";
    return null;
  };

  const validateStep2 = () => {
    if (!formData.oldPassword) return "Old password is required";
    return null;
  };

  const validateStep3 = () => {
    if (!formData.newPassword) return "New password is required";
    if (!validatePasswordComplexity(formData.newPassword)) 
      return "Password must have at least 8 characters, one uppercase letter, one number, and one special character";
    if (formData.newPassword === formData.oldPassword) 
      return "New password cannot be the same as old password";
    if (formData.newPassword !== formData.confirmPassword) 
      return "Passwords do not match";
    return null;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // First validate the PIN
      const pinResponse = await axios.post('api/user/validate-pin', {
        email: formData.email,
        pin: formData.pin
      });

      if (pinResponse.data.success) {
        setStep(2);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Error verifying PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // Validate the old password
      const credentialResponse = await axios.post('/api/user/validate-credentials', {
        email: formData.email,
        password: formData.oldPassword
      });

      if (credentialResponse.data.success) {
        setStep(3);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid old password');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    const validationError = validateStep3();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // Submit the password reset request
      const resetResponse = await axios.post('/api/user/reset-password', {
        email: formData.email,
        pin: formData.pin,
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword
      });

      if (resetResponse.data.success) {
        setSuccess('Password reset successful');
        // Reset form after successful submission
        setFormData({
          email: '',
          pin: '',
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Email and PIN verification
  const renderStep1 = () => (
    <form onSubmit={handleStep1Submit} className="space-y-4">
      <h2 className="text-xl font-bold">Step 1: Identity Verification</h2>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label htmlFor="pin" className="block text-sm font-medium">4-Digit PIN</label>
        <input
          type="password"
          id="pin"
          name="pin"
          value={formData.pin}
          onChange={handleChange}
          maxLength={4}
          pattern="\d{4}"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
        <p className="text-xs text-gray-500">Enter your account PIN for verification</p>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        {loading ? 'Verifying...' : 'Verify Identity'}
      </button>
    </form>
  );

  // Step 2: Old password verification
  const renderStep2 = () => (
    <form onSubmit={handleStep2Submit} className="space-y-4">
      <h2 className="text-xl font-bold">Step 2: Old Password Verification</h2>
      
      <div>
        <label htmlFor="oldPassword" className="block text-sm font-medium">Current Password</label>
        <input
          type="password"
          id="oldPassword"
          name="oldPassword"
          value={formData.oldPassword}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
        <p className="text-xs text-gray-500">Enter your current password for verification</p>
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </div>
    </form>
  );

  // Step 3: New password and confirmation
  const renderStep3 = () => (
    <form onSubmit={handleStep3Submit} className="space-y-4">
      <h2 className="text-xl font-bold">Step 3: Set New Password</h2>
      
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium">New Password</label>
        <input
          type="password"
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
        <p className="text-xs text-gray-500">
          Password must have at least 8 characters, one uppercase letter, one number, and one special character
        </p>
      </div>
      
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium">Confirm New Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
};

export default PasswordReset;