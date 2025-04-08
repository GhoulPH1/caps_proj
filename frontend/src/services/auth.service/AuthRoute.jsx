import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/user.js';
import LoadingScreen from '../../components/LoadingScreen.jsx';

const AuthRoute = () => {
  const { currentUser, isLoading, initUserSession, authenticationComplete } = useUserStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Only run the check if no user or incomplete authentication
      if (!currentUser || !authenticationComplete) {
        await initUserSession();
      }
      setChecking(false);
    };
    
    checkAuth();
  }, [currentUser, authenticationComplete, initUserSession]);

  // Show loading while checking authentication
  if (checking || isLoading) {
    return <LoadingScreen />;
  }

  // Redirect if not authenticated after check
  if (!currentUser || !authenticationComplete) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the child routes
  return <Outlet />;
};

export default AuthRoute;