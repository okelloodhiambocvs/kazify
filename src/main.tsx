import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);

// Intercept and suppress benign WebSocket / HMR unhandled rejections or errors
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason) {
    const reasonStr = typeof reason === 'string' ? reason : (reason.message || '');
    if (
      reasonStr.includes('WebSocket') || 
      reasonStr.includes('websocket') || 
      reasonStr.includes('WebSocket closed')
    ) {
      console.warn('[Vite WS Suppressed]', reasonStr);
      event.preventDefault();
      event.stopPropagation();
    }
  }
});

window.addEventListener('error', (event) => {
  const message = event.message || '';
  const error = event.error;
  const errorStr = error ? (typeof error === 'string' ? error : (error.message || '')) : '';
  if (
    message.includes('WebSocket') || 
    message.includes('websocket') || 
    errorStr.includes('WebSocket') || 
    errorStr.includes('websocket')
  ) {
    console.warn('[Vite WS Error Suppressed]', message, errorStr);
    event.preventDefault();
    event.stopPropagation();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[Service Worker] Registered with scope:', reg.scope))
      .catch(err => console.error('[Service Worker] Registration failed:', err));
  });
}
