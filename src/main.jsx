import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { queryClient } from './lib/queryClient.js';
import { AuthProvider } from './lib/auth.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#111A33',
                color: '#E6EAF2',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '14px',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#00D4AA', secondary: '#0A0F1E' } },
              error: { iconTheme: { primary: '#F87171', secondary: '#0A0F1E' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);
