import axios from 'axios';

// Configure global Axios defaults for CSRF protection and credentials
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'x-csrf-token';
axios.defaults.withCredentials = true;

// Create a configured Axios instance
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'x-csrf-token',
  withCredentials: true
});

// Interceptor to add JWT token details to every outbound request
api.interceptors.request.use(
  (config) => {
    // Record request start time for Kisumu network performance telemetry
    (config as any).metadata = { startTime: performance.now() };

    const token = localStorage.getItem('kazify_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to global catch and manage response-level errors
api.interceptors.response.use(
  (response) => {
    // Log successful request execution duration
    const startTime = (response.config as any).metadata?.startTime;
    if (startTime) {
      const duration = Math.round(performance.now() - startTime);
      console.log(
        `%c[Performance Telemetry] ${response.config.method?.toUpperCase()} ${response.config.url} resolved in ${duration}ms (Kisumu Network Environment Optimization)`,
        "color: #10b981; font-weight: bold;"
      );
    }
    return response;
  },
  async (error) => {
    // Log failed/rejected request execution duration
    const startTime = (error.config as any)?.metadata?.startTime;
    if (startTime) {
      const duration = Math.round(performance.now() - startTime);
      console.warn(
        `[Performance Telemetry] ${error.config?.method?.toUpperCase()} ${error.config?.url} failed/rejected after ${duration}ms`
      );
    }

    const originalRequest = error.config;
    
    // Check for 401 Unauthorized errors and verify we haven't retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('kazify_refresh_token');
      
      if (refreshToken) {
        try {
          // Attempt token refresh via silent backend call
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const newAccessToken = response.data.token;
          
          if (newAccessToken) {
            localStorage.setItem('kazify_token', newAccessToken);
            window.dispatchEvent(new CustomEvent('token-refreshed', { detail: newAccessToken }));
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return api(originalRequest); // Retry original request with new token
          }
        } catch (refreshError) {
          console.error('Refresh token has expired or is invalid. Force logging out.', refreshError);
        }
      }
    }

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('Authentication token challenge failed. Removing credentials.', error.response.status);
      
      // Clear token references on authorization error
      localStorage.removeItem('kazify_token');
      localStorage.removeItem('kazify_user');
      localStorage.removeItem('kazify_refresh_token');
      
      // Dispatch standard global window event so React can adjust state accordingly
      window.dispatchEvent(new CustomEvent('auth-error', { detail: error.response.status }));
    }
    return Promise.reject(error);
  }
);

export default api;
