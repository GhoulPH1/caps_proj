import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user';

const LoginReminder = ({ onClose }) => {
  const navigate = useNavigate();
  const { currentUser } = useUserStore();
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let timeoutId;
    
    if (currentUser) {
      timeoutId = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 500); // Match the slide-out animation duration
      }, 4000); // 4 seconds
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentUser, onClose]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed top-20 right-10 w-[420px] bg-[#1f1f1f] shadow-lg rounded-2xl border border-black/10 p-3 z-50 transition-all duration-500 ease-in-out 
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
    >
      <div className={`absolute left-5 top-5 h-3 w-3 ${currentUser ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
      
      <button 
        onClick={onClose} 
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
      
      <div className="flex flex-col space-y-1 pl-10">
        <h2 className="text-lg font-prompt text-white">
          {currentUser ? 'Welcome' : 'Login Required'}
        </h2>
        
        <p className="text-xs text-gray-400">
          {!currentUser ? (
            <>
              Please{' '}
              <span 
                onClick={() => navigate('/login')} 
                className="text-blue-600 hover:underline cursor-pointer"
              >
                sign in
              </span>{' '}
              or{' '}
              <span 
                onClick={() => navigate('/register')} 
                className="text-blue-600 hover:underline cursor-pointer"
              >
                sign up
              </span>{' '}
              to proceed.
            </>
          ) : `Welcome back, ${currentUser.name}! You're all set to explore SynoCore.`}
        </p>
      </div>
    </div>
  );
};

export default LoginReminder;
