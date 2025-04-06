import React, { lazy, Suspense } from 'react';
import { Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from './store/user.js';
// import LoadingScreen from './components/LoadingScreen.jsx';

// Lazy load components
const LoginPage = lazy(() => import('./pages/main/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/main/RegisterPage.jsx'));
const HomePage = lazy(() => import('./pages/main/HomePage.jsx'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard.jsx'));
const FileVerifyer = lazy(() => import('./components/file/FileCheck'));
const FileUpload = lazy(() => import('./components/file/FileUpload'));
const LoadingScreen  = lazy(() => import('./components/LoadingScreen.jsx')); 
const PasswordReset = lazy(() => import('./components/PasswordReset.jsx'));
// PrivateRoute Component
const PrivateRoute = () => {
  const { currentUser } = useUserStore();

  // Redirect to login if no current user
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/load" element={<LoadingScreen />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
         
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/verify-file" element={<FileVerifyer />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;