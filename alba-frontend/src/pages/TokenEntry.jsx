import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardSidebar from '../components/Sidebar';

const TokenEntry = () => {
  const [employees, setEmployees] = useState([]);
  const [allTokens, setAllTokens] = useState([]);
  const [todayTokens, setTodayTokens] = useState({});
  const [todayBata, setTodayBata] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = previous week, etc.
  const [showTokenEntry, setShowTokenEntry] = useState(false); // Toggle for token entry form
  const [editingCell, setEditingCell] = useState(null); // { employeeId, date }
  const [editValue, setEditValue] = useState('');
  const [editBata, setEditBata] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(null); // { employeeId, date }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { employeeId, date, employeeName, tokens }
  const [deleteLoading, setDeleteLoading] = useState(null); // { employeeId, date }
  const today = new Date().toISOString().split('T')[0];
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    const admin = localStorage.getItem('adminData');

    if (!token || !admin) {
      navigate('/login');
      return;
    }

    fetchEmployees();
    fetchAllTokens();
  }, [navigate, currentWeekOffset]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchEmployees = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(`${baseURL}/admin/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const allEmployees = response.data.data || [];
        console.log('All employees from API:', allEmployees); // Debug log
        
        // Filter only active employees (status === true or undefined)
        const activeEmployees = allEmployees.filter(emp => emp.status !== false);
        console.log('Active employees:', activeEmployees); // Debug log
        
        setEmployees(activeEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      showNotification('Failed to fetch employees', 'error');
    }
  };

  const fetchAllTokens = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      console.log('🔄 Fetching tokens from:', `${baseURL}/tokens/all`); // Debug log
      
      const response = await axios.get(`${baseURL}/tokens/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const tokenData = response.data.data || [];
        console.log('✅ All token data from API:', tokenData); // Debug log
        console.log('📅 Today is:', today); // Debug log
        
        setAllTokens(tokenData);
        
        // Set today's tokens for the entry form
        const todayTokenData = tokenData.filter(token => {
          const tokenDate = new Date(token.date).toISOString().split('T')[0];
          console.log(`🔍 Comparing: tokenDate=${tokenDate} vs today=${today}`); // Debug log
          return tokenDate === today;
        });
        
        console.log('📅 Today\'s tokens:', todayTokenData); // Debug log
        
        const todayEntries = {};
        const todayBataEntries = {};
        todayTokenData.forEach(token => {
          todayEntries[token.employeeId] = token.tokens;
          todayBataEntries[token.employeeId] = token.bata || false;
        });
        setTodayTokens(todayEntries);
        setTodayBata(todayBataEntries);
      }
    } catch (error) {
      console.error('❌ Error fetching tokens:', error);
      showNotification('Failed to fetch token data', 'error');
    }
  };

  const handleTodayTokenChange = (employeeId, tokens) => {
    setTodayTokens(prev => ({
      ...prev,
      [employeeId]: tokens
    }));
  };

  const handleTodayBataChange = (employeeId, bata) => {
    setTodayBata(prev => ({
      ...prev,
      [employeeId]: bata
    }));
  };



  const saveTokenForEmployee = async (employeeId, tokens, bata) => {
    if (!tokens || tokens < 0) return;

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const payload = {
        employeeId,
        date: today,
        tokens: parseInt(tokens),
        bata: bata || false
      };
      
      console.log('💾 Saving token with payload:', payload); // Debug log
      
      const response = await axios.post(`${baseURL}/tokens/daily`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Save response:', response.data); // Debug log

      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      console.error('❌ Error saving token:', error);
      return false;
    }
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    
    let successCount = 0;
    let totalCount = 0;

    for (const [employeeId, tokens] of Object.entries(todayTokens)) {
      if (tokens && tokens > 0) {
        totalCount++;
        const bata = todayBata[employeeId] || false;
        const success = await saveTokenForEmployee(employeeId, tokens, bata);
        if (success) successCount++;
      }
    }

    setIsLoading(false);

    if (successCount === totalCount && totalCount > 0) {
      showNotification(`Successfully saved tokens for ${successCount} employees!`, 'success');
    } else if (successCount > 0) {
      showNotification(`Saved ${successCount} out of ${totalCount} token entries`, 'warning');
    } else {
      showNotification('No tokens to save or all failed', 'error');
    }
    
    // Refresh data after saving and hide entry form
    fetchAllTokens();
    if (successCount > 0) {
      setShowTokenEntry(false);
    }
  };

  // Inline edit functions
  const startEdit = (employeeId, date, currentTokens, currentBata) => {
    // Don't allow editing Sunday (holiday) or future dates
    const cellDate = new Date(date);
    const todayDate = new Date(today);
    
    if (cellDate.getDay() === 0) { // Sunday
      showNotification('Cannot edit holiday entries', 'warning');
      return;
    }
    
    if (cellDate > todayDate) { // Future date
      showNotification('Cannot edit future dates', 'warning');
      return;
    }

    setEditingCell({ employeeId, date });
    setEditValue(currentTokens > 0 ? currentTokens.toString() : '0');
    setEditBata(currentBata || false);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
    setEditBata(false);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const tokens = parseInt(editValue) || 0;
    if (tokens < 0) {
      showNotification('Tokens cannot be negative', 'error');
      return;
    }

    setUpdateLoading({ employeeId: editingCell.employeeId, date: editingCell.date });

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      // Use POST for creating/updating token records (handles both new and existing records)
      const response = await axios.post(`${baseURL}/tokens/daily`, {
        employeeId: editingCell.employeeId,
        date: editingCell.date,
        tokens: tokens,
        bata: editBata
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        showNotification('Token saved successfully!', 'success');
        fetchAllTokens(); // Refresh data
        cancelEdit();
      }
    } catch (error) {
      console.error('Error saving token:', error);
      showNotification('Failed to save token', 'error');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const isEditing = (employeeId, date) => {
    return editingCell && editingCell.employeeId === employeeId && editingCell.date === date;
  };

  const isUpdating = (employeeId, date) => {
    return updateLoading && updateLoading.employeeId === employeeId && updateLoading.date === date;
  };

  // Delete functions
  const confirmDelete = (employeeId, date, employeeName, tokens) => {
    // Don't allow deleting Sunday (holiday) or future dates
    const cellDate = new Date(date);
    const todayDate = new Date(today);
    
    if (cellDate.getDay() === 0) { // Sunday
      showNotification('Cannot delete holiday entries', 'warning');
      return;
    }
    
    if (cellDate > todayDate) { // Future date
      showNotification('Cannot delete future dates', 'warning');
      return;
    }

    // Allow deleting even when tokens are 0 (to clear the entry)
    // No need to check for tokens === 0

    setDeleteConfirm({ employeeId, date, employeeName, tokens });
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;

    setDeleteLoading({ employeeId: deleteConfirm.employeeId, date: deleteConfirm.date });

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const response = await axios.delete(`${baseURL}/tokens/daily/${deleteConfirm.employeeId}/${deleteConfirm.date}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        showNotification('Token record deleted successfully!', 'success');
        fetchAllTokens(); // Refresh data
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      if (error.response?.status === 404) {
        showNotification('Token record not found', 'error');
      } else {
        showNotification('Failed to delete token record', 'error');
      }
    } finally {
      setDeleteLoading(null);
    }
  };

  const isDeleting = (employeeId, date) => {
    return deleteLoading && deleteLoading.employeeId === employeeId && deleteLoading.date === date;
  };

  // Get Saturday-Friday week dates
  const getCurrentWeekDates = (weekOffset = 0) => {
    const today = new Date();
    
    // Calculate the Saturday of the current week
    const currentSaturday = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Find the most recent Saturday
    // If today is Saturday, use today
    // Otherwise, go back to the previous Saturday
    if (dayOfWeek !== 6) { // If not Saturday
      const daysToSubtract = dayOfWeek + 1; // Days to go back to Saturday
      currentSaturday.setDate(today.getDate() - daysToSubtract);
    }
    
    // Apply week offset
    const targetSaturday = new Date(currentSaturday);
    targetSaturday.setDate(currentSaturday.getDate() + (weekOffset * 7));
    
    // Generate Saturday to Friday dates
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(targetSaturday);
      date.setDate(targetSaturday.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }
    
    return weekDates;
  };

  // Get week info for display
  const getWeekInfo = (weekOffset = 0) => {
    const dates = getCurrentWeekDates(weekOffset);
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[6]);
    
    return {
      dates,
      startDate,
      endDate,
      weekText: `${startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    };
  };

  // Get token for specific employee and date
  const getTokenForEmployeeAndDate = (employeeId, date) => {
    console.log(`🔍 Looking for token: employeeId=${employeeId}, date=${date}`); // Debug log
    console.log(`📊 Available tokens:`, allTokens); // Debug log
    
    const token = allTokens.find(t => {
      const tokenDate = new Date(t.date).toISOString().split('T')[0];
      const match = t.employeeId === employeeId && tokenDate === date;
      console.log(`🔍 Checking token: empId=${t.employeeId}, tokenDate=${tokenDate}, match=${match}`); // Debug log
      return match;
    });
    
    console.log(`✅ Found token:`, token); // Debug log
    return token ? token.tokens : 0;
  };

  // Get net tokens (after onam bata deduction) for specific employee and date
  const getNetTokensForEmployeeAndDate = (employeeId, date) => {
    const employee = employees.find(emp => emp._id === employeeId);
    const dailyTokens = getTokenForEmployeeAndDate(employeeId, date);
    
    // If no tokens assigned (absent) or no onam bata, return daily tokens
    if (dailyTokens === 0 || !employee || !employee.onamBata) {
      return dailyTokens;
    }
    
    // Deduct onam bata from daily tokens
    const netTokens = Math.max(0, dailyTokens - employee.onamBata);
    return netTokens;
  };

  // Get bata for specific employee and date
  const getBataForEmployeeAndDate = (employeeId, date) => {
    const token = allTokens.find(t => {
      const tokenDate = new Date(t.date).toISOString().split('T')[0];
      return t.employeeId === employeeId && tokenDate === date;
    });
    
    return token ? token.bata || false : false;
  };



  // Format date for display with weekday emphasis
  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
    const formattedDate = date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    return {
      dayName: dateString === todayString ? 'TODAY' : weekday.toUpperCase(),
      date: formattedDate,
      isToday: dateString === todayString
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminData');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <DashboardSidebar 
        adminData={JSON.parse(localStorage.getItem('adminData') || '{}')} 
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        <div className="min-h-screen bg-slate-50">
          {/* Notification Toast */}
          {notification && (
            <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
              notification.type === 'error' 
                ? 'bg-red-500 text-white' 
                : notification.type === 'success'
                ? 'bg-green-500 text-white'
                : notification.type === 'warning'
                ? 'bg-yellow-500 text-white'
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

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-red-50 border-b border-red-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-red-800">Delete Token Record</h3>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-4">
                  <p className="text-slate-700 mb-4">
                    Are you sure you want to delete the token record for:
                  </p>
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Employee:</span>
                      <span className="font-medium text-slate-800">{deleteConfirm.employeeName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="font-medium text-slate-600">Date:</span>
                      <span className="font-medium text-slate-800">
                        {new Date(deleteConfirm.date).toLocaleDateString('en-IN', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="font-medium text-slate-600">Tokens:</span>
                      <span className="font-bold text-red-600">{deleteConfirm.tokens}</span>
                    </div>
                  </div>
                  <p className="text-sm text-red-600">
                    ⚠️ This action cannot be undone.
                  </p>
                </div>

                {/* Modal Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                  <button
                    onClick={cancelDelete}
                    disabled={deleteLoading}
                    className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 
                             transition-all duration-200 text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDelete}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                             transition-all duration-200 text-sm font-medium disabled:opacity-50 
                             disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {deleteLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Elegant Main Content */}
          <main className="max-w-7xl mx-auto py-12 px-6">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-thin text-slate-800 tracking-wide font-serif">Token Management</h2>
          </div>
          <button
            onClick={() => setShowTokenEntry(!showTokenEntry)}
            className={`flex items-center space-x-2 px-8 py-3 rounded-full text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg ${
              showTokenEntry
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showTokenEntry ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              )}
            </svg>
            <span>{showTokenEntry ? 'Close Entry' : 'Add Daily Tokens'}</span>
          </button>
        </div>

        {/* Professional Token Entry Form */}
        {showTokenEntry && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-slate-200/30 mb-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/80 rounded-t-2xl border-b border-slate-200">
              <div className="text-center flex-1">
                <div className="relative inline-block">
                  <h1 className="text-xl font-thin text-slate-800 tracking-widest relative z-10 whitespace-nowrap font-serif">
                    ALBA MARINE
                  </h1>
                  <h2 className="text-xs font-light text-slate-600 tracking-wider mt-0.5 font-sans">
                    ENTERPRISE
                  </h2>
                  <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-14 h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent"></div>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-light">
                  Daily Token Entry - {new Date().toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowTokenEntry(false)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 hover:bg-white/80 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Entry Form Body */}
            <div className="px-6 py-5">
              {employees.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 font-light">No active employees found</p>
                      <p className="text-sm text-slate-400 mt-1">Add employees to start token entry</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-5">
                    {employees.map(employee => (
                      <div key={employee._id} className="space-y-3">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                          {employee.name} - ID: {employee.employeeId}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Enter tokens earned today"
                          value={todayTokens[employee._id] || ''}
                          onChange={(e) => handleTodayTokenChange(employee._id, e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                                   transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                                   shadow-sm hover:shadow-md hover:border-slate-300"
                        />
                        
                        {/* Bata Toggle */}
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-600 font-light">
                            Morning Bata (₹17)
                          </label>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-medium transition-colors duration-200 ${
                              todayBata[employee._id] ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              No
                            </span>
                            <div className="relative">
                              <input
                                type="checkbox"
                                id={`bata-${employee._id}`}
                                checked={todayBata[employee._id] || false}
                                onChange={(e) => handleTodayBataChange(employee._id, e.target.checked)}
                                className="sr-only"
                              />
                              <label 
                                htmlFor={`bata-${employee._id}`}
                                className={`flex items-center justify-center w-10 h-5 rounded-full cursor-pointer transition-all duration-300 ${
                                  todayBata[employee._id] 
                                    ? 'bg-green-500 shadow-sm' 
                                    : 'bg-slate-300 shadow-sm'
                                }`}
                              >
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 transform ${
                                  todayBata[employee._id] ? 'translate-x-2.5' : '-translate-x-2.5'
                                }`}></div>
                              </label>
                            </div>
                            <span className={`text-xs font-medium transition-colors duration-200 ${
                              todayBata[employee._id] ? 'text-green-600' : 'text-slate-400'
                            }`}>
                              Yes
                            </span>
                          </div>
                        </div>


                      </div>
                    ))}
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-center space-x-3 pt-5">
                    <button
                      type="button"
                      onClick={() => setShowTokenEntry(false)}
                      className="px-6 py-2 text-slate-600 bg-slate-100 rounded-full font-light text-sm
                               hover:bg-slate-200 hover:text-slate-700 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAll}
                      disabled={isLoading}
                      className="px-8 py-2 bg-slate-800 text-white rounded-full font-medium text-sm
                               hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 
                               focus:ring-offset-1 transition-all duration-200 shadow-md hover:shadow-lg
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v1m1 0h4m-4 0a1 1 0 011-1h2a1 1 0 011 1m-6 0V6a2 2 0 012-2h2a2 2 0 012 2v1"/>
                          </svg>
                          <span>Save Tokens</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Professional Token History Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-slate-200/30">
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50/60 backdrop-blur-sm border-b border-slate-200/70">
            <div>
              <h3 className="text-xl font-thin text-slate-800 tracking-wide font-serif">Token History</h3>
              <p className="text-xs text-slate-500 mt-1 font-light">
                💡 Click token to edit • Right-click to delete • Enter to save • Esc to cancel
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Week Navigation */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                  title="Previous Week"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="text-center min-w-[160px]">
                  <div className="text-sm font-medium text-slate-800">
                    {getWeekInfo(currentWeekOffset).weekText}
                  </div>
                  <div className="text-xs text-slate-500">
                    {currentWeekOffset === 0 ? 'Current Week' : 
                     currentWeekOffset === -1 ? 'Last Week' : 
                     `${Math.abs(currentWeekOffset)} weeks ago`}
                  </div>
                </div>
                
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                  disabled={currentWeekOffset >= 0}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    currentWeekOffset >= 0 
                      ? 'text-slate-300 cursor-not-allowed' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Next Week"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Reset to Current Week */}
              {currentWeekOffset !== 0 && (
                <button
                  onClick={() => setCurrentWeekOffset(0)}
                  className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300 transition-all duration-200"
                >
                  Current Week
                </button>
              )}
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 font-light">No token records found</p>
                  <p className="text-sm text-slate-400 mt-1">Start adding daily tokens to see history</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-slate-50/60 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 sticky left-0 bg-slate-50/60 w-24">
                      Employee ID
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                      Employee
                    </th>
                    {getCurrentWeekDates(currentWeekOffset).map(date => {
                      const dateObj = new Date(date);
                      const isSunday = dateObj.getDay() === 0; // Only Sunday gets special styling
                      const isToday = date === today;
                      const dateDisplay = formatDateDisplay(date);
                      
                      return (
                        <th key={date} className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 min-w-[80px] ${
                          isSunday ? 'bg-blue-50/60 text-blue-700' : 'text-slate-600'
                        } ${isToday ? 'bg-yellow-50/60 text-yellow-700' : ''}`}>
                          <div className="text-xs font-medium">{dateDisplay.dayName}</div>
                          <div className="text-xs opacity-75 mt-1">{dateDisplay.date}</div>
                          {dateObj.getDay() === 0 && <div className="text-xs text-blue-600 mt-1">Holiday</div>}
                        </th>
                      );
                    })}
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                      Weekly Total
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                      Onam Bata
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                      Net Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/40 backdrop-blur-sm">
                  {employees.map((employee, index) => {
                    const weekDates = getCurrentWeekDates(currentWeekOffset);
                    const weeklyTokens = weekDates.reduce((sum, date) => 
                      sum + getTokenForEmployeeAndDate(employee._id, date), 0
                    );
                    
                    return (
                      <tr key={employee._id} className={`hover:bg-slate-50/60 transition-all duration-200 ${index !== 0 ? 'border-t border-slate-200' : ''}`}>
                        <td className="px-3 py-2 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 sticky left-0 bg-white/40 w-24">
                          <div className="text-xs text-slate-600 font-mono">{employee.employeeId}</div>
                        </td>
                        <td className="px-5 py-2 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                          <div className="text-sm font-medium text-slate-900">{employee.name}</div>
                        </td>
                        {weekDates.map(date => {
                          const tokens = getTokenForEmployeeAndDate(employee._id, date);
                          const bata = getBataForEmployeeAndDate(employee._id, date);
                          const dateObj = new Date(date);
                          const isSunday = dateObj.getDay() === 0;
                          const isToday = date === today;
                          const isFutureDate = dateObj > new Date(today);
                          const canEdit = !isSunday && !isFutureDate;
                          const canDelete = !isSunday && !isFutureDate && tokens > 0;
                          const editing = isEditing(employee._id, date);
                          const updating = isUpdating(employee._id, date);
                          const deleting = isDeleting(employee._id, date);
                          
                          return (
                            <td key={date} className={`px-3 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 ${
                              isToday ? 'bg-yellow-50/60' : 
                              isSunday ? 'bg-blue-50/30' : ''
                            } ${editing ? 'bg-slate-100/80' : ''} ${deleting ? 'bg-red-50/60' : ''}`}>
                              {editing ? (
                                // Edit mode
                                <div className="flex flex-col items-center space-y-2">
                                  <div className="flex items-center justify-center space-x-1">
                                    <input
                                      type="number"
                                      min="0"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyPress={handleEditKeyPress}
                                      className="w-12 px-1 py-1 text-xs text-center border border-slate-300 rounded
                                               focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                                      autoFocus
                                    />
                                    <div className="flex space-x-0.5">
                                      <button
                                        onClick={saveEdit}
                                        disabled={updating}
                                        className="p-0.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-all duration-200"
                                        title="Save (Enter)"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        disabled={updating}
                                        className="p-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all duration-200"
                                        title="Cancel (Esc)"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  
                                                                     {/* Bata Toggle in Edit Mode */}
                                   <div className="flex items-center space-x-2">
                                     <input
                                       type="checkbox"
                                       id={`edit-bata-${employee._id}-${date}`}
                                       checked={editBata}
                                       onChange={(e) => setEditBata(e.target.checked)}
                                       className="w-3 h-3 text-green-600 border-slate-300 rounded focus:ring-green-500"
                                     />
                                     <label htmlFor={`edit-bata-${employee._id}-${date}`} className="text-xs text-slate-600">
                                       Bata (₹17)
                                     </label>
                                   </div>


                                </div>
                              ) : updating ? (
                                // Updating state
                                <div className="flex items-center justify-center">
                                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
              ) : deleting ? (
                                // Deleting state
                                <div className="flex items-center justify-center">
                                  <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              ) : (
                                // View mode
                                <div 
                                  className={`group relative ${canEdit ? 'cursor-pointer' : ''}`}
                                  onClick={() => canEdit && startEdit(employee._id, date, tokens, bata)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (canDelete) {
                                      confirmDelete(employee._id, date, employee.name, tokens);
                                    }
                                  }}
                                >
                                  <div className="relative">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                                      tokens > 0 
                                        ? isToday 
                                          ? 'bg-yellow-100/70 text-yellow-700 border border-yellow-200/50' 
                                          : isSunday
                                          ? 'bg-blue-100/70 text-blue-700 border border-blue-200/50'
                                          : 'bg-green-100/70 text-green-700 border border-green-200/50'
                                        : isSunday 
                                        ? 'text-blue-400'
                                        : 'text-slate-400'
                                    } ${canEdit ? 'group-hover:ring-1 group-hover:ring-slate-300 group-hover:shadow-sm' : ''}`}>
                                      {isSunday ? 'Holiday' : (tokens > 0 ? tokens : '0')}
                                    </span>
                                    
                                    {/* Bata Indicator */}
                                    {bata && (
                                      <div className="absolute -top-1 -right-1 text-xs font-bold text-orange-600 bg-white rounded-full w-3 h-3 flex items-center justify-center" title="Morning Bata (₹17)">+</div>
                                    )}
                                  </div>
                                  
                                  {/* Edit indicator */}
                                  {canEdit && (
                                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <div className="w-3 h-3 bg-slate-600 rounded-full flex items-center justify-center">
                                        <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-5 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                          <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-slate-100/70 text-slate-700 border border-slate-200/50">
                            {weeklyTokens}
                          </span>
                        </td>
                                                 <td className="px-5 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                           <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-purple-100/70 text-purple-700 border border-purple-200/50">
                             {(() => {
                               if (!employee.onamBata) return '0';
                               
                               const workingDays = weekDates.filter(date => {
                                 const tokens = getTokenForEmployeeAndDate(employee._id, date);
                                 return tokens > 0;
                               }).length;
                               
                               return Math.round(employee.onamBata * workingDays);
                             })()}
                           </span>
                         </td>
                         <td className="px-5 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                           <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-green-100/70 text-green-700 border border-green-200/50">
                             {(() => {
                               const onamBataTotal = employee.onamBata ? 
                                 (employee.onamBata * weekDates.filter(date => {
                                   const tokens = getTokenForEmployeeAndDate(employee._id, date);
                                   return tokens > 0;
                                 }).length) : 0;
                               
                               return Math.round(weeklyTokens - onamBataTotal);
                             })()}
                           </span>
                         </td>
                      </tr>
                    );
                  })}
                  
                  {/* Total Row */}
                  <tr className="bg-slate-100/70 border-t-2 border-slate-400 font-semibold">
                    <td className="px-3 py-2 whitespace-nowrap border-r border-slate-200/70 sticky left-0 bg-slate-100/70 w-24">
                      <div className="text-xs text-slate-600">—</div>
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70">
                      <div className="text-sm font-semibold text-slate-800">Total Daily Tokens</div>
                    </td>
                    {getCurrentWeekDates(currentWeekOffset).map(date => {
                      const dailyTotal = employees.reduce((sum, employee) => 
                        sum + getTokenForEmployeeAndDate(employee._id, date), 0
                      );
                      const dateObj = new Date(date);
                      const isSunday = dateObj.getDay() === 0;
                      const isToday = date === today;
                      
                      return (
                        <td key={date} className={`px-3 py-2 text-center whitespace-nowrap border-r border-slate-200/70 ${
                          isToday ? 'bg-yellow-100/70' : 
                          isSunday ? 'bg-blue-100/50' : 'bg-slate-100/70'
                        }`}>
                          <span className={`inline-flex px-2 py-1 text-sm font-bold rounded-full ${
                            dailyTotal > 0 
                              ? isToday 
                                ? 'bg-yellow-200 text-yellow-800 border border-yellow-300' 
                                : isSunday
                                ? 'bg-blue-200 text-blue-800 border border-blue-300'
                                : 'bg-slate-200 text-slate-800 border border-slate-300'
                              : isSunday 
                              ? 'text-blue-500'
                              : 'text-slate-500'
                          }`}>
                            {dailyTotal || (isSunday ? 'Holiday' : '0')}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-5 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70">
                      <span className="inline-flex px-3 py-1 text-sm font-bold rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                        {getCurrentWeekDates(currentWeekOffset).reduce((total, date) => 
                          total + employees.reduce((sum, employee) => 
                            sum + getTokenForEmployeeAndDate(employee._id, date), 0
                          ), 0
                        )}
                      </span>
                    </td>
                                         <td className="px-5 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70">
                       <span className="inline-flex px-3 py-1 text-sm font-bold rounded-full bg-purple-200 text-purple-800 border border-purple-300">
                         {Math.round(employees.reduce((total, employee) => {
                           if (!employee.onamBata) return total;
                           
                           const workingDays = getCurrentWeekDates(currentWeekOffset).filter(date => {
                             const tokens = getTokenForEmployeeAndDate(employee._id, date);
                             return tokens > 0;
                           }).length;
                           
                           return total + (employee.onamBata * workingDays);
                         }, 0))}
                       </span>
                     </td>
                     <td className="px-5 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70">
                       <span className="inline-flex px-3 py-1 text-sm font-bold rounded-full bg-green-200 text-green-800 border border-green-300">
                         {(() => {
                           const totalTokens = getCurrentWeekDates(currentWeekOffset).reduce((total, date) => 
                             total + employees.reduce((sum, employee) => 
                               sum + getTokenForEmployeeAndDate(employee._id, date), 0
                             ), 0
                           );
                           
                           const totalOnamBata = employees.reduce((total, employee) => {
                             if (!employee.onamBata) return total;
                             
                             const workingDays = getCurrentWeekDates(currentWeekOffset).filter(date => {
                               const tokens = getTokenForEmployeeAndDate(employee._id, date);
                               return tokens > 0;
                             }).length;
                             
                             return total + (employee.onamBata * workingDays);
                           }, 0);
                           
                           return Math.round(totalTokens - totalOnamBata);
                         })()}
                       </span>
                     </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TokenEntry;
