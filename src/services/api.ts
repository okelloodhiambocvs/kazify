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
    // Record request start time for performance telemetry
    (config as any).metadata = { startTime: performance.now() };

    const token = localStorage.getItem('kazify_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to globally manage API responses
api.interceptors.response.use(
  (response) => {
    // Log successful request duration
    const startTime = (response.config as any).metadata?.startTime;

    if (startTime) {
      const duration = Math.round(performance.now() - startTime);

      console.log(
        `%c[Performance Telemetry] ${response.config.method?.toUpperCase()} ${response.config.url} resolved in ${duration}ms`,
        'color: #10b981; font-weight: bold;'
      );
    }

    return response;
  },

  async (error) => {
    // STEP 1: Save the original request
    const originalRequest = error.config;

    // Log failed request duration
    const startTime = (originalRequest as any)?.metadata?.startTime;

    if (startTime) {
      const duration = Math.round(performance.now() - startTime);

      console.warn(
        `[Performance Telemetry] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} failed after ${duration}ms`
      );
    }

    // STEP 2:
    // Attempt silent token refresh only once.
    // Never try to refresh if the refresh endpoint itself failed.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/api/auth/refresh'
    ) {
      originalRequest._retry = true;

      try {
        // STEP 3:
        // Refresh token is now stored inside an HttpOnly cookie.
        // The browser automatically sends it.
        const response = await axios.post(
          '/api/auth/refresh',
          {},
          {
            withCredentials: true,
          }
        );

        const newAccessToken =
          response.data.accessToken || response.data.token;

        if (newAccessToken) {
          // Update stored access token
          localStorage.setItem('kazify_token', newAccessToken);

          // Notify the application
          window.dispatchEvent(
            new CustomEvent('token-refreshed', {
              detail: newAccessToken,
            })
          );

          // Retry original request with the new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return api(originalRequest);
        }
      } catch (refreshError) {
        console.warn(
          'Refresh token expired or invalid. User must log in again.'
        );
      }
    }

    // Authentication failed after refresh attempt
    if (
      error.response &&
      (error.response.status === 401 ||
        error.response.status === 403)
    ) {
      console.warn(
        'Authentication failed. Clearing local session.',
        error.response.status
      );

      // STEP 4:
      // Only access token and user data remain in local storage.
      localStorage.removeItem('kazify_token');
      localStorage.removeItem('kazify_user');

      // Notify React application
      window.dispatchEvent(
        new CustomEvent('auth-error', {
          detail: error.response.status,
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;