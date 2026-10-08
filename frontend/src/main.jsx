import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Automatically prefix /api calls with VITE_BACKEND_URL in production if configured
if (import.meta.env.VITE_BACKEND_URL) {
  const originalFetch = window.fetch;
  const baseUrl = import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
  window.fetch = (url, options) => {
    if (typeof url === 'string' && url.startsWith('/api')) {
      return originalFetch(`${baseUrl}${url}`, options);
    }
    return originalFetch(url, options);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
