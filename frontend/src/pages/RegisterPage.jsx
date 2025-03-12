import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useUserStore } from './user.js';
import { useUserStore } from '../store/user.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const createUser = useUserStore(state => state.createUsers); // Get the createUsers function
  const [stage, setStage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    middleInitial: '',
    surname: '',
    sexualOrientation: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: ''
  });

  // Derived full name and birthday
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState(null);

  // Update derived values when form data changes
  useEffect(() => {
    // Combine name components into full name
    const nameComponents = [
      formData.firstName,
      formData.middleInitial ? `${formData.middleInitial}.` : '',
      formData.surname
    ].filter(Boolean);
    
    setFullName(nameComponents.join(' '));

    // Combine date components into birthday
    if (formData.birthYear && formData.birthMonth && formData.birthDay) {
      const birthdate = new Date(
        parseInt(formData.birthYear),
        parseInt(formData.birthMonth) - 1,
        parseInt(formData.birthDay)
      );
      
      if (!isNaN(birthdate.getTime())) {
        setBirthday(birthdate);
      } else {
        setBirthday(null);
      }
    }
  }, [formData]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // Validate current stage and proceed if valid
  const handleProceed = () => {
    if (stage === 1) {
      if (!formData.firstName.trim()) {
        return setError('First name is required');
      }
      if (!formData.surname.trim()) {
        return setError('Surname is required');
      }
      if (!formData.sexualOrientation) {
        return setError('Please select your sexual orientation');
      }
      if (!birthday) {
        return setError('Please enter a valid date of birth');
      }
      
      // Proceed to stage 2
      setStage(2);
      setError('');
    } 
    else if (stage === 2) {
      // Email validation
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(formData.email)) {
        return setError('Please enter a valid email address');
      }
      
      // Password validation
      if (formData.password.length < 6) {
        return setError('Password must be at least 6 characters');
      }
      
      if (formData.password !== formData.confirmPassword) {
        return setError('Passwords do not match');
      }
      
      // Proceed to stage 3
      setStage(3);
      setError('');
    }
  };

  // Calculate age from birthday
  const calculateAge = (birthday) => {
    if (!birthday) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    
    return age;
  };

  // Submit the registration form using Zustand store
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate PIN
    if (!/^\d{4}$/.test(formData.pin)) {
      return setError('PIN must be exactly 4 digits');
    }
    
    try {
      setLoading(true);
      
      // Prepare data for API
      const userData = {
        name: fullName,
        email: formData.email,
        password: formData.password,
        pin: formData.pin,
        birthday: birthday.toISOString(),
        age: calculateAge(birthday),
        sexualOrientation: formData.sexualOrientation
      };
      
      // Use Zustand store function to create user
      const result = await createUser(userData);
      
      if (result.success) {
        // Redirect to login page or dashboard
        navigate('/login', { state: { message: result.msg } });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate year options (120 years back from current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 120 }, (_, i) => currentYear - i);
  
  // Generate month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  // Generate day options (1-31)
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        
        {/* Progress indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center">
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${stage >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>1</div>
            <div className={`h-1 w-8 ${stage >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${stage >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>2</div>
            <div className={`h-1 w-8 ${stage >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${stage >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>3</div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Rest of the form remains unchanged */}
          {/* Stage 1: Personal Information */}
          {stage === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter your first name"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Middle Initial (optional)</label>
                <input
                  type="text"
                  name="middleInitial"
                  value={formData.middleInitial}
                  onChange={handleChange}
                  maxLength="1"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="M"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Surname</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter your surname"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Sexual Orientation</label>
                <select
                  name="sexualOrientation"
                  value={formData.sexualOrientation}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Select orientation</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer not to say">Prefer not to say</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Date of Birth</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    name="birthMonth"
                    value={formData.birthMonth}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">Month</option>
                    {monthOptions.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    name="birthDay"
                    value={formData.birthDay}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">Day</option>
                    {dayOptions.map(day => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    name="birthYear"
                    value={formData.birthYear}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">Year</option>
                    {yearOptions.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProceed}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {/* Stage 2: Account Information */}
          {stage === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Account Information</h2>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="******"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="******"
                />
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStage(1)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleProceed}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {/* Stage 3: Security */}
          {stage === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Security PIN</h2>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">4-Digit PIN</label>
                <input
                  type="text"
                  name="pin"
                  value={formData.pin}
                  onChange={handleChange}
                  maxLength="4"
                  pattern="\d{4}"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter 4-digit PIN"
                />
                <p className="text-xs text-gray-500 mt-1">PIN must be exactly 4 digits</p>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStage(2)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a className="text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => navigate("/login")}>
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;