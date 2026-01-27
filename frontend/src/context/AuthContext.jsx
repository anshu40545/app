import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'devmora_auth_token';
const USER_KEY = 'devmora_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      
      if (token && savedUser) {
        try {
          // Set token in axios headers
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token is still valid by fetching user profile
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
          localStorage.setItem(USER_KEY, JSON.stringify(response.data));
        } catch (error) {
          // Token is invalid, clear auth state
          console.log('[Auth] Token validation failed, clearing auth state');
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          delete apiClient.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Register new user
  const register = useCallback(async (name, email, password) => {
    try {
      const response = await apiClient.post('/auth/register', {
        name,
        email,
        password
      });
      
      const { access_token, user: userData } = response.data;
      
      // Store token and user
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      return { success: false, error: message };
    }
  }, []);

  // Login user
  const login = useCallback(async (email, password, rememberMe = false) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        remember_me: rememberMe
      });
      
      const { access_token, user: userData } = response.data;
      
      // Store token and user
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid email or password.';
      return { success: false, error: message };
    }
  }, []);

  // Logout user
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (data) => {
    try {
      const response = await apiClient.put('/auth/profile', data);
      const updatedUser = response.data;
      
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update profile.';
      return { success: false, error: message };
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to change password.';
      return { success: false, error: message };
    }
  }, []);

  // Request password reset
  const forgotPassword = useCallback(async (email) => {
    try {
      await apiClient.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error) {
      // Always return success to prevent email enumeration
      return { success: true };
    }
  }, []);

  // Reset password with token
  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reset password.';
      return { success: false, error: message };
    }
  }, []);

  // Verify email
  const verifyEmail = useCallback(async (token) => {
    try {
      await apiClient.post(`/auth/verify-email?token=${token}`);
      
      // Refresh user data
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to verify email.';
      return { success: false, error: message };
    }
  }, []);

  // Resend verification email
  const resendVerification = useCallback(async () => {
    try {
      await apiClient.post('/auth/resend-verification');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send verification email.';
      return { success: false, error: message };
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      return null;
    }
  }, []);

  // Initiate GitHub OAuth login
  const initiateGithubLogin = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/github');
      const { auth_url } = response.data;
      
      // Redirect to GitHub
      window.location.href = auth_url;
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'GitHub login is not available.';
      return { success: false, error: message };
    }
  }, []);

  // Complete GitHub OAuth login (called from callback page)
  const githubLogin = useCallback(async (code, state) => {
    try {
      const response = await apiClient.post('/auth/github/callback', {
        code,
        state
      });
      
      const { access_token, user: userData } = response.data;
      
      // Store token and user
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'GitHub authentication failed.';
      throw new Error(message);
    }
  }, []);

  // Check if GitHub OAuth is enabled
  const checkGithubEnabled = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/github/config');
      return response.data.enabled;
    } catch (error) {
      return false;
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    refreshUser,
    initiateGithubLogin,
    githubLogin,
    checkGithubEnabled
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
