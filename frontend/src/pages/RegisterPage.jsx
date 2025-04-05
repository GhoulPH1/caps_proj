import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user.js';
import useRegisterStore from '../store/register.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const createUser = useUserStore(state => state.createUsers);
  
  const {
    stage, 
    loading, 
    error, 
    formData, 
    showPassword,
    setStage,
    setFormData,
    togglePasswordVisibility,
    validateStage1,
    validateStage2,
    validateStage3,
    submitRegistration
  } = useRegisterStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitRegistration(createUser, navigate);
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

  // Progress steps based on the images
  const progressSteps = [
    { id: 1, name: 'User Profile' },
    { id: 2, name: 'Login Credentials' },
    { id: 3, name: 'Authentication Pin' },
    { id: 4, name: 'Security Question' }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left section - Welcome and branding */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-center items-start p-12">
        <div className="mb-auto ml-6">
          <button className="text-white text-lg font-semibold">HOME</button>
        </div>
        <div className="mb-8">
          <h2 className="text-xl mb-2">WELCOME TO</h2>
          <h1 className="text-5xl font-bold mb-6">SynoCore</h1>
          <p className="text-lg mb-2">Utilizing blockchain technology</p>
          <p className="text-gray-400 mb-6">Enhancing information security and data integrity</p>
          <div className="w-3/4 h-2 bg-gradient-to-r from-gray-700 to-transparent"></div>
        </div>
        <div className="mt-auto">
          <div className="w-24 h-24">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M50 5 L95 30 L95 70 L50 95 L5 70 L5 30 Z" fill="none" stroke="white" strokeWidth="3"/>
              <path d="M25 40 L75 40 L75 60 L25 60 Z" fill="none" stroke="white" strokeWidth="3"/>
              <path d="M35 30 L65 30 L65 70 L35 70 Z" fill="none" stroke="white" strokeWidth="3"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Right section - Form content */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-4">
        <div className="w-full max-w-md bg-gray-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            {stage === 1 ? "SIGN UP" : 
             stage === 2 ? "SIGN UP" : 
             stage === 3 ? "ENTER YOUR AUTHENTICATION PIN" : 
             "SIGN UP"}
          </h1>
          
          {/* Progress steps for stages 1-4 */}
          {stage !== 3 && (
            <div className="mb-8">
              <h3 className="text-lg mb-4">Registration Process</h3>
              <ul className="space-y-4">
                {progressSteps.map((step, index) => (
                  <li key={step.id} className="flex items-center">
                    <div className={`rounded-full h-5 w-5 flex items-center justify-center mr-2 ${stage >= step.id ? 'bg-white text-black' : 'border border-gray-600'}`}>
                      {stage > step.id ? "✓" : ""}
                    </div>
                    <span className={stage === step.id ? "text-white" : "text-gray-500"}>
                      {step.name}
                    </span>
                    {index < progressSteps.length - 1 && (
                      <div className="h-6 w-px bg-gray-600 ml-2"></div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-white px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Stage 1: Personal Information */}
            {stage === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">User Profile</h2>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-gray-300 text-sm mb-2">Firstname</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">M.I</label>
                    <input
                      type="text"
                      name="middleInitial"
                      value={formData.middleInitial}
                      onChange={handleChange}
                      maxLength="1"
                      className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Surname</label>
                  <input
                    type="text"
                    name="surname"
                    value={formData.surname}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                  />
                </div>
                
                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <label className="block text-gray-300 text-sm mb-2">Sex</label>
                    <select
                      name="sexualOrientation"
                      value={formData.sexualOrientation}
                      onChange={handleChange}
                      className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  
                  <div className="col-span-3">
                    <label className="block text-gray-300 text-sm mb-2">Birthday</label>
                    <div className="flex bg-gray-800 border border-gray-700 rounded">
                      <div className="flex items-center px-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <select
                        name="birthMonth"
                        value={formData.birthMonth}
                        onChange={handleChange}
                        className="bg-transparent border-r border-gray-700 py-2 px-2 text-white focus:outline-none w-1/3"
                      >
                        <option value="" className="bg-gray-800">MM</option>
                        {monthOptions.map(month => (
                          <option key={month.value} value={month.value} className="bg-gray-800">
                            {month.value < 10 ? `0${month.value}` : month.value}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        name="birthDay"
                        value={formData.birthDay}
                        onChange={handleChange}
                        className="bg-transparent border-r border-gray-700 py-2 px-2 text-white focus:outline-none w-1/3"
                      >
                        <option value="" className="bg-gray-800">DD</option>
                        {dayOptions.map(day => (
                          <option key={day} value={day} className="bg-gray-800">
                            {day < 10 ? `0${day}` : day}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        name="birthYear"
                        value={formData.birthYear}
                        onChange={handleChange}
                        className="bg-transparent py-2 px-2 text-white focus:outline-none w-1/3"
                      >
                        <option value="" className="bg-gray-800">YEAR</option>
                        {yearOptions.map(year => (
                          <option key={year} value={year} className="bg-gray-800">
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 flex justify-between">
                  <div className="text-gray-300">
                    Already have an account?{" "}
                    <button type="button" className="text-white border border-white rounded px-4 py-1" onClick={() => navigate("/login")}>
                      REDIRECT TO LOGIN
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={validateStage1}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            
            {/* Stage 2: Account Information */}
            {stage === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Login Credential</h2>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                  />
                </div>
                
                <div className="flex items-center mb-4">
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    {showPassword ? "Hide Password" : "Show Password"}
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => validateStage2()}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mt-4"
                >
                  Confirm
                </button>
                
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStage(1)}
                    className="bg-transparent text-white font-bold py-2 px-4"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={validateStage2}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            
            {/* Stage 3: Security PIN */}
            {stage === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Provide a 4-numerical character pin</h2>
                
                <div className="flex justify-center gap-2 my-8">
                  <input
                    type="password"
                    maxLength="1"
                    value={formData.pin ? formData.pin.charAt(0) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.match(/\d/) || val === '') {
                        setFormData('pin', val + (formData.pin?.substring(1) || ''));
                      }
                    }}
                    className="bg-gray-800 border border-gray-700 rounded w-16 h-16 text-center text-xl"
                  />
                  <input
                    type="password"
                    maxLength="1"
                    value={formData.pin ? formData.pin.charAt(1) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.match(/\d/) || val === '') {
                        setFormData('pin', (formData.pin?.charAt(0) || '') + val + (formData.pin?.substring(2) || ''));
                      }
                    }}
                    className="bg-gray-800 border border-gray-700 rounded w-16 h-16 text-center text-xl"
                  />
                  <input
                    type="password"
                    maxLength="1"
                    value={formData.pin ? formData.pin.charAt(2) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.match(/\d/) || val === '') {
                        setFormData('pin', (formData.pin?.substring(0, 2) || '') + val + (formData.pin?.charAt(3) || ''));
                      }
                    }}
                    className="bg-gray-800 border border-gray-700 rounded w-16 h-16 text-center text-xl"
                  />
                  <input
                    type="password"
                    maxLength="1"
                    value={formData.pin ? formData.pin.charAt(3) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.match(/\d/) || val === '') {
                        setFormData('pin', (formData.pin?.substring(0, 3) || '') + val);
                      }
                    }}
                    className="bg-gray-800 border border-gray-700 rounded w-16 h-16 text-center text-xl"
                  />
                </div>
                
                {error && <p className="text-red-500 text-center">Error Message Here</p>}
                
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStage(2)}
                    className="text-white font-bold py-2 px-4"
                  >
                    Return to Registration
                  </button>
                  <button
                    type="button"
                    onClick={validateStage3}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded"
                  >
                    Set Pin
                  </button>
                </div>
              </div>
            )}

            {/* Stage 4: Security Question */}
            {stage === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Security Question</h2>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Security Phrase</label>
                  <input
                    type="text"
                    name="securityPhrase"
                    value={formData.securityPhrase}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                    placeholder="Enter a memorable security phrase"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be at least 10 characters long</p>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Security Answer</label>
                  <input
                    type="text"
                    name="securityAnswer"
                    value={formData.securityAnswer}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-white focus:outline-none focus:border-gray-500"
                    placeholder="Your security answer"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be used for account recovery</p>
                </div>
                
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStage(3)}
                    className="bg-transparent text-white font-bold py-2 px-4"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded"
                  >
                    {loading ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;