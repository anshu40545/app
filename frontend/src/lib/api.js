// API Configuration - handles dev tunnels and local development
// 
// When using dev tunnels:
// 1. Start backend with: uvicorn server:app --reload --host 0.0.0.0 --port 8000
// 2. Create a dev tunnel for port 8000 (backend)
// 3. Create a dev tunnel for port 3000 (frontend)
// 4. Set REACT_APP_BACKEND_URL in .env to your backend tunnel URL
//    OR the app will try to auto-detect based on current URL

const getBackendUrl = () => {
  // If explicitly set in environment, use that
  if (process.env.REACT_APP_BACKEND_URL) {
    // Remove trailing slash to prevent double slashes in API paths
    return process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, '');
  }
  
  // Auto-detect for dev tunnels - if frontend is on dev tunnel, 
  // backend should be accessible via the same tunnel base URL on a different port
  // However, dev tunnels typically need explicit URLs
  
  // Default fallback to localhost
  return 'http://localhost:8000';
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance with default configuration
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 seconds timeout - dev tunnels can be slow
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to check if error is from a cancelled request
const isCancelledError = (error) => {
  return (
    error.code === 'ERR_CANCELED' ||
    error.name === 'CanceledError' ||
    error.name === 'AbortError' ||
    axios.isCancel(error) ||
    error.message === 'canceled'
  );
};

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    // Only log in development and not too frequently
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    if (!isCancelledError(error)) {
      console.error('[API] Request error:', error);
    }
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Silently reject cancelled requests - they're intentional
    if (isCancelledError(error)) {
      return Promise.reject(error);
    }
    
    // Only log actual errors, not timeouts from cancelled requests
    if (error.code === 'ERR_NETWORK') {
      console.error('[API] Network error - check if backend is running and CORS is configured');
      console.error('[API] Backend URL:', BACKEND_URL);
    } else if (error.code === 'ECONNABORTED' && !isCancelledError(error)) {
      console.error('[API] Request timeout - the server took too long to respond');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
