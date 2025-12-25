import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import albaMarineLogo from '../assets/alba Marine.png';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.username || !formData.password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Get base URL from environment variable
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      
      const response = await axios.post(`${baseURL}/admin/login`, {
        username: formData.username,
        password: formData.password
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data) {
        // Store authentication data
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('adminData', JSON.stringify(response.data.admin));
        
        showNotification('Login successful! Redirecting...', 'success');
        
        // Redirect to dashboard immediately
        navigate('/dashboard');
        
      } else {
        showNotification('Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        // Server responded with error status
        showNotification(error.response.data?.message || 'Login failed', 'error');
      } else if (error.request) {
        // Network error
        showNotification('Network error. Please check your connection.', 'error');
      } else {
        // Other error
        showNotification('An unexpected error occurred.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center px-4 md:ml-16 py-8 md:py-0" style={{ backgroundColor: '#FEFEFE' }}>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'error' 
            ? 'bg-red-500 text-white' 
            : notification.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="text-center mb-8 md:mb-12 w-full md:w-auto">
        <img 
          src={albaMarineLogo} 
          alt="ALBA MARINE" 
          className="mx-auto max-w-xs md:max-w-lg w-full h-auto"
        />
      </div>

      {/* Elegant Login Form - No Container */}
      <div className="w-full max-w-xs mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field */}
          <div className="relative">
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-black/20 
                       focus:outline-none focus:border-black/40 focus:bg-white
                       transition-all duration-300 text-slate-700 placeholder-slate-400 text-base
                       rounded-2xl shadow-sm"
              placeholder="Username"
              required
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-black/20 
                       focus:outline-none focus:border-black/40 focus:bg-white
                       transition-all duration-300 text-slate-700 placeholder-slate-400 text-base
                       rounded-2xl shadow-sm"
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isLoading}
              className="w-3/4 bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-6 
                       rounded-full hover:from-slate-600 hover:to-slate-700 
                       focus:outline-none focus:ring-4 focus:ring-slate-300 
                       transform hover:scale-[1.02] transition-all duration-300 font-medium text-base
                       shadow-lg hover:shadow-xl
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
