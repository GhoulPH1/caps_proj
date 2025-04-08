import React, { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from './store/user.js';
import AuthRoute from './services/auth.service/AuthRoute.jsx';

// Lazy load components
const LoginPage = lazy(() => import('./pages/main/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/main/RegisterPage.jsx'));
const HomePage = lazy(() => import('./pages/main/HomePage.jsx'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard.jsx'));
const FileVerifyer = lazy(() => import('./components/file/FileCheck'));
const FileUpload = lazy(() => import('./components/file/FileUpload'));
const LoadingScreen = lazy(() => import('./components/LoadingScreen.jsx')); 
const PasswordReset = lazy(() => import('./components/PasswordReset.jsx'));

function App() {
  const { initUserSession } = useUserStore();
  const location = useLocation();

  // Initialize user session on app load and route changes
  useEffect(() => {
    initUserSession();
  }, []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/load" element={<LoadingScreen />} />

        {/* Protected Routes - AuthRoute will verify authentication */}
        <Route element={<AuthRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/verify-file" element={<FileVerifyer />} />
        </Route>

        {/* Catch-all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;