import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from 'react-error-boundary';
import './index.css';

// Lazy Load App
const App = lazy(() => import('./App.jsx'));

const ErrorFallback = ({ error }) => (
  <div role="alert" className="text-center p-8">
    <h2 className="text-2xl text-red-600">Something went wrong:</h2>
    <pre className="text-red-400">{error.message}</pre>
    <button 
      onClick={() => window.location.reload()}
      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
    >
      Reload Application
    </button>
  </div>
);

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
