import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import albaMarineLogo from '../assets/albaMarine.png';

const DashboardSidebar = ({ adminData, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isExpanded = true; // Always expanded

  // Navigation items with professional SVG icons
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4" />
        </svg>
      )
    },
    { 
      path: '/tokens', 
      label: 'Token Entry', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    { 
      path: '/billing', 
      label: 'Billing', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      path: '/payout', 
      label: 'Weekly Payout', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  // Check if current path is active
  const isActivePath = (path) => {
    if (path === '/billing') {
      // Highlight billing for both /billing and /billing/create
      return location.pathname === path || location.pathname.startsWith('/billing/');
    }
    return location.pathname === path;
  };

  return (
    <aside 
      className="fixed left-0 top-0 h-full bg-white/70 backdrop-blur-md shadow-lg border-r border-slate-200/50 z-30 w-64"
    >
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="border-b border-slate-200/50 p-3">
          <div className="text-center">
            <div className="w-full h-18 overflow-hidden flex items-center justify-center">
              <img 
                src={albaMarineLogo} 
                alt="ALBA MARINE" 
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-4">
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center transition-all duration-200 group space-x-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    isActivePath(item.path)
                      ? 'bg-slate-600/20 text-slate-800 shadow-lg transform scale-[1.02] border border-slate-300/50 backdrop-blur-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/40 hover:shadow-md hover:backdrop-blur-sm'
                  }`}
                >
                  <span className={`transition-all duration-200 ${
                    isActivePath(item.path) 
                      ? 'text-slate-700' 
                      : 'text-slate-500 group-hover:text-slate-700'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="font-medium tracking-wide">{item.label}</span>
                  {isActivePath(item.path) && (
                    <div className="ml-auto w-2 h-2 bg-slate-600 rounded-full animate-pulse shadow-sm"></div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-slate-200/50 bg-slate-50/50 p-4">
          {adminData && (
            <div className="mb-4 px-2">
              <div className="flex items-center transition-all duration-300 bg-white/60 rounded-xl border border-slate-200/50 space-x-3 p-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-semibold">
                    {adminData.username ? adminData.username.charAt(0).toUpperCase() : 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {adminData.username || 'Admin'}
                  </p>
                  <p className="text-xs text-slate-500 truncate font-light">Administrator</p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-slate-700/10 text-slate-700 border border-slate-300/50
                     hover:bg-slate-700/20 hover:text-slate-800 shadow-md hover:shadow-lg hover:transform hover:scale-[1.02]
                     focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 group backdrop-blur-sm"
          >
            <svg className="w-4 h-4 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="tracking-wide">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;

