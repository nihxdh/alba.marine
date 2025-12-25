import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardSidebar from '../components/Sidebar';

const WeeklyPayout = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allTokens, setAllTokens] = useState([]);
  const [currentWeek, setCurrentWeek] = useState({ start: '', end: '' });
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week (default), -1 = previous week, etc.
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { employeeId, date }
  const [editValue, setEditValue] = useState('');
  const [editBata, setEditBata] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(null); // { employeeId, date }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { employeeId, date, employeeName, tokens }
  const [deleteLoading, setDeleteLoading] = useState(null); // { employeeId, date }
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    const admin = localStorage.getItem('adminData');

    if (!token || !admin) {
      navigate('/login');
      return;
    }

    const week = getCurrentWeek(currentWeekOffset);
    console.log('📅 Calculated week:', week);
    setCurrentWeek(week);
    fetchEmployees();
  }, [navigate, currentWeekOffset]);

  useEffect(() => {
    if (currentWeek.start && currentWeek.end) {
      fetchAllTokens();
    }
  }, [currentWeek]);

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

  // Calculate week (Saturday to Friday) with offset support
  const getCurrentWeek = (weekOffset = 0) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0=Sunday, 6=Saturday
    
    // Find the most recent Saturday
    const saturday = new Date(today);
    if (currentDay === 6) {
      // Today is Saturday, use today
      saturday.setDate(today.getDate());
    } else {
      // Go back to the previous Saturday
      const daysToSubtract = currentDay + 1;
      saturday.setDate(today.getDate() - daysToSubtract);
    }
    
    // Apply week offset
    const targetSaturday = new Date(saturday);
    targetSaturday.setDate(saturday.getDate() + (weekOffset * 7));
    
    // Calculate next Friday
    const friday = new Date(targetSaturday);
    friday.setDate(targetSaturday.getDate() + 6);
    
    const result = {
      start: targetSaturday.toISOString().split('T')[0],
      end: friday.toISOString().split('T')[0]
    };
    
    console.log('📅 Week calculation:', {
      today: today.toISOString().split('T')[0],
      currentDay,
      saturday: saturday.toISOString().split('T')[0],
      targetSaturday: targetSaturday.toISOString().split('T')[0],
      friday: friday.toISOString().split('T')[0],
      result
    });
    
    return result;
  };

  const fetchAllTokens = async () => {
    setIsLoading(true);
    
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      if (!baseURL) {
        throw new Error('API base URL not configured');
      }
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.get(`${baseURL}/tokens/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const tokenData = response.data.data || [];
        console.log('✅ API Response received:', response.data);
        console.log('📊 Token data from API:', tokenData);
        setAllTokens(tokenData);
        
        // Process weekly data for display
        processWeeklyData(tokenData);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      
      if (error.response?.status === 401) {
        showNotification('Authentication expired. Please login again.', 'error');
        navigate('/login');
      } else if (error.response?.status === 404) {
        showNotification('API endpoint not found. Please check configuration.', 'error');
      } else if (error.message === 'Network Error') {
        showNotification('Network error. Please check your connection.', 'error');
      } else {
        showNotification(error.response?.data?.message || 'Failed to fetch token data', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const processWeeklyData = (tokenData) => {
    console.log('🔍 Processing weekly data...');
    console.log('📅 Current week range:', currentWeek);
    console.log('📊 Total token data received:', tokenData.length);
    console.log('📊 All token dates:', tokenData.map(t => new Date(t.date).toISOString().split('T')[0]));
    
    // Filter tokens for current week
    const weekTokens = tokenData.filter(tokenRecord => {
      const tokenDate = new Date(tokenRecord.date).toISOString().split('T')[0];
      const isInWeek = tokenDate >= currentWeek.start && tokenDate <= currentWeek.end;
      console.log(`📅 Token date: ${tokenDate}, in week: ${isInWeek}`);
      return isInWeek;
    });

    console.log('📊 Tokens for current week:', weekTokens.length);
    console.log('📊 Week tokens:', weekTokens);

    // Create entries for ALL employees, not just those with tokens
    const employeeTokens = {};
    
    // Initialize all employees with zero data
    employees.forEach(employee => {
      employeeTokens[employee._id] = {
        employeeId: employee._id,
        employeeName: employee.name,
        totalTokens: 0,
        totalBata: 0,
        dailyTokens: [],
        onamBata: 0,
        onamBataPerDay: employee.onamBata || 0,
        workingDays: 0
      };
    });

    // Add actual token data
    weekTokens.forEach(tokenRecord => {
      const empId = tokenRecord.employeeId;
      if (employeeTokens[empId]) {
        employeeTokens[empId].totalTokens += tokenRecord.tokens;
        employeeTokens[empId].totalBata += tokenRecord.bata ? 17 : 0; // ₹17 per bata
        employeeTokens[empId].dailyTokens.push({
          date: tokenRecord.date,
          tokens: tokenRecord.tokens,
          bata: tokenRecord.bata || false
        });
      }
    });

    // Calculate onam bata and working days for all employees
    employees.forEach(employee => {
      if (employeeTokens[employee._id]) {
        const workingDays = weekTokens.filter(tokenRecord => 
          tokenRecord.employeeId === employee._id && tokenRecord.tokens > 0
        ).length;
        
        employeeTokens[employee._id].onamBata = (employee.onamBata || 0) * workingDays;
        employeeTokens[employee._id].workingDays = workingDays;
      }
    });

    // Convert to array and sort by name
    const weeklyArray = Object.values(employeeTokens).sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName)
    );

    setWeeklyData(weeklyArray);
    
    // Only show notification if there are no employees at all
    if (employees.length === 0) {
      showNotification('No employees found', 'info');
    }
  };



  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Get week info for display
  const getWeekInfo = () => {
    const startDate = new Date(currentWeek.start);
    const endDate = new Date(currentWeek.end);
    
    return {
      weekText: `${startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      isCurrentWeek: currentWeekOffset === 0,
      weekNumber: Math.abs(currentWeekOffset)
    };
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

  // Inline edit functions
  const startEdit = (employeeId, date, currentTokens, currentBata) => {
    // Don't allow editing Sunday (holiday) or future dates
    const cellDate = new Date(date);
    const todayDate = new Date();
    
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
    const todayDate = new Date();
    
    if (cellDate.getDay() === 0) { // Sunday
      showNotification('Cannot delete holiday entries', 'warning');
      return;
    }
    
    if (cellDate > todayDate) { // Future date
      showNotification('Cannot delete future dates', 'warning');
      return;
    }

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

  // Get token for specific employee and date
  const getTokenForEmployeeAndDate = (employeeId, date) => {
    const token = allTokens.find(t => {
      const tokenDate = new Date(t.date).toISOString().split('T')[0];
      return t.employeeId === employeeId && tokenDate === date;
    });
    
    return token ? token.tokens : 0;
  };

  // Get bata for specific employee and date
  const getBataForEmployeeAndDate = (employeeId, date) => {
    const token = allTokens.find(t => {
      const tokenDate = new Date(t.date).toISOString().split('T')[0];
      return t.employeeId === employeeId && tokenDate === date;
    });
    
    return token ? token.bata || false : false;
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

  const handlePrint = () => {
    window.print();
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

          {/* Main Content */}
          <main className="max-w-7xl mx-auto py-12 px-6">
            {/* Section Header */}
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-thin text-slate-800 tracking-wide font-serif">Weekly Payout</h2>
                <p className="text-sm text-slate-500 mt-1 font-light">Generate and manage weekly payment reports</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Week Navigation */}
                <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 px-4 py-2">
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
                      {getWeekInfo().weekText}
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
                    className="px-3 py-2 text-xs bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300 transition-all duration-200"
                  >
                    Current Week
                  </button>
                )}
                
                {/* Debug Info (remove in production) */}
                <div className="text-xs text-slate-500 px-2">
                  Week Offset: {currentWeekOffset}
                </div>
                
                <button
                  onClick={handlePrint}
                  className="bg-slate-800 text-white px-8 py-3 rounded-full text-sm font-medium
                           hover:bg-slate-700 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Bill</span>
                </button>
              </div>
            </div>

            {/* Professional Payout Card */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-slate-200/30">
              {/* Week Info Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/60 backdrop-blur-sm border-b border-slate-200/70">
                <div>
                  <h3 className="text-xl font-thin text-slate-800 tracking-wide font-serif">Payout Summary</h3>
                  <p className="text-xs text-slate-500 mt-1 font-light">
                    Week: {formatDate(currentWeek.start)} - {formatDate(currentWeek.end)} • Saturday to Friday Cycle
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchAllTokens}
                    disabled={isLoading}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 disabled:opacity-50"
                    title="Refresh Data"
                  >
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-500 font-light">Live Data</span>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center">
                      <p className="text-slate-500 font-light">Loading weekly payout data...</p>
                      <p className="text-sm text-slate-400 mt-1">Please wait while we calculate your earnings</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payout Table */}
              {!isLoading && (
                <>
                  {employees.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 font-light">No employees found</p>
                          <p className="text-sm text-slate-400 mt-1">Add employees to generate payout reports</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                                <div className="w-full">
              <table className="w-full border-separate border-spacing-0">
                        <thead className="bg-slate-50/60 backdrop-blur-sm">
                          <tr>
                            <th className="px-2 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 sticky left-0 bg-slate-50/60 w-16">
                              ID
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-24">
                              Employee
                            </th>
                            {getCurrentWeekDates(currentWeekOffset).map(date => {
                              const dateObj = new Date(date);
                              const isSunday = dateObj.getDay() === 0;
                              const isToday = date === new Date().toISOString().split('T')[0];
                              const dateDisplay = formatDateDisplay(date);
                              
                              return (
                                <th key={date} className={`px-1 py-3 text-center text-xs font-medium uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-12 ${
                                  isSunday ? 'bg-blue-50/60 text-blue-700' : 'text-slate-600'
                                } ${isToday ? 'bg-yellow-50/60 text-yellow-700' : ''}`}>
                                  <div className="text-xs font-medium">{dateDisplay.dayName}</div>
                                  <div className="text-xs opacity-75">{dateDisplay.date}</div>
                                  {dateObj.getDay() === 0 && <div className="text-xs text-blue-600">H</div>}
                                </th>
                              );
                            })}
                            <th className="px-2 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                              Weekly
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                              Onam
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                              Net
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-24">
                              Net×19.5
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                              Bata Days
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-24">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/40 backdrop-blur-sm">
                          {employees.map((employee, index) => {
                            const weekDates = getCurrentWeekDates(currentWeekOffset);
                            const weeklyTotal = weekDates.reduce((sum, date) => 
                              sum + getTokenForEmployeeAndDate(employee._id, date), 0
                            );
                            const onamBata = (() => {
                              if (!employee.onamBata) return 0;
                              
                              const workingDays = weekDates.filter(date => {
                                const tokens = getTokenForEmployeeAndDate(employee._id, date);
                                return tokens > 0;
                              }).length;
                              
                              return Math.round(employee.onamBata * workingDays);
                            })();
                            const netTotal = weekDates.reduce((sum, date) => 
                              sum + getNetTokensForEmployeeAndDate(employee._id, date), 0
                            );
                            const morningBataDays = weekDates.filter(date => 
                              getBataForEmployeeAndDate(employee._id, date)
                            ).length;
                            
                            // Calculate according to your formula
                            const netTotalAmount = netTotal * 19.5;
                            const morningBataAmount = morningBataDays * 17; // ₹17 per day
                            const totalAmount = netTotalAmount + morningBataAmount;
                            
                            return (
                              <tr key={employee._id} className={`hover:bg-slate-50/60 transition-all duration-200 ${index !== 0 ? 'border-t border-slate-200' : ''}`}>
                                <td className="px-2 py-2 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 sticky left-0 bg-white/40 w-16">
                                  <div className="text-xs text-slate-600 font-mono">{employee.employeeId}</div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-24">
                                  <div className="text-sm font-medium text-slate-900 truncate">{employee.name}</div>
                                </td>
                                {weekDates.map(date => {
                                  const tokens = getTokenForEmployeeAndDate(employee._id, date);
                                  const bata = getBataForEmployeeAndDate(employee._id, date);
                                  const dateObj = new Date(date);
                                  const isSunday = dateObj.getDay() === 0;
                                  const isToday = date === new Date().toISOString().split('T')[0];
                                  const isFutureDate = dateObj > new Date();
                                  const canEdit = !isSunday && !isFutureDate;
                                  const canDelete = !isSunday && !isFutureDate && tokens > 0;
                                  const editing = isEditing(employee._id, date);
                                  const updating = isUpdating(employee._id, date);
                                  const deleting = isDeleting(employee._id, date);
                                  
                                  return (
                                    <td key={date} className={`px-1 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-12 ${
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
                                                className="p-0.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                                                title="Save"
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              </button>
                                              <button
                                                onClick={cancelEdit}
                                                className="p-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                                title="Cancel"
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
                                            <span className={`inline-flex px-1 py-0.5 text-xs font-medium rounded transition-all duration-200 ${
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
                                              {isSunday ? 'H' : (tokens > 0 ? tokens : '0')}
                                            </span>
                                            
                                            {/* Bata Indicator */}
                                            {bata && (
                                              <div className="absolute -top-0.5 -right-0.5 text-xs font-bold text-orange-600 bg-white rounded-full w-2.5 h-2.5 flex items-center justify-center text-[8px]" title="Morning Bata (₹17)">+</div>
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
                                                                  <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                                   <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100/70 text-slate-700 border border-slate-200/50">
                                     {weeklyTotal}
                                   </span>
                                 </td>
                                 <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                                   <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100/70 text-purple-700 border border-purple-200/50">
                                     {onamBata}
                                   </span>
                                 </td>
                                 <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                                   <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100/70 text-slate-700 border border-slate-200/50">
                                     {netTotal}
                                   </span>
                                 </td>
                                 <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-24">
                                   <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100/70 text-green-700 border border-green-200/50">
                                     ₹{netTotalAmount.toFixed(0)}
                                   </span>
                                 </td>
                                 <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-20">
                                   <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-orange-100/70 text-orange-700 border border-orange-200/50">
                                     {morningBataDays}
                                   </span>
                                 </td>
                                 <td className="px-2 py-2 text-right whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-24">
                                   <span className="text-sm font-semibold text-slate-800">
                                     ₹{totalAmount.toFixed(0)}
                                   </span>
                                 </td>
                              </tr>
                            );
                          })}
                          
                          {/* Total Row */}
                                                      <tr className="bg-slate-100/70 border-t-2 border-slate-400 font-semibold">
                              <td className="px-2 py-2 whitespace-nowrap border-r border-slate-200/70 sticky left-0 bg-slate-100/70 w-16">
                                <div className="text-xs text-slate-600">—</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70 w-24">
                                <div className="text-sm font-semibold text-slate-800">Total</div>
                              </td>
                            {getCurrentWeekDates(currentWeekOffset).map(date => {
                              const dailyTotal = employees.reduce((sum, employee) => 
                                sum + getTokenForEmployeeAndDate(employee._id, date), 0
                              );
                              const dateObj = new Date(date);
                              const isSunday = dateObj.getDay() === 0;
                              const isToday = date === new Date().toISOString().split('T')[0];
                              
                                                             return (
                                 <td key={date} className={`px-1 py-2 text-center whitespace-nowrap border-r border-slate-200/70 w-12 ${
                                   isToday ? 'bg-yellow-100/70' : 
                                   isSunday ? 'bg-blue-100/50' : 'bg-slate-100/70'
                                 }`}>
                                   <span className={`inline-flex px-1 py-0.5 text-xs font-bold rounded ${
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
                                     {dailyTotal || (isSunday ? 'H' : '0')}
                                   </span>
                                 </td>
                               );
                                                         })}
                             <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70 w-20">
                               <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-slate-200 text-slate-800 border border-slate-300">
                                 {employees.reduce((total, employee) => {
                                   const weekDates = getCurrentWeekDates(currentWeekOffset);
                                   return total + weekDates.reduce((sum, date) => 
                                     sum + getTokenForEmployeeAndDate(employee._id, date), 0
                                   );
                                 }, 0)}
                               </span>
                             </td>
                             <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70 w-20">
                               <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-purple-200 text-purple-800 border border-purple-300">
                                 {Math.round(employees.reduce((total, employee) => {
                                   if (!employee.onamBata) return total;
                                   
                                   const weekDates = getCurrentWeekDates(currentWeekOffset);
                                   const workingDays = weekDates.filter(date => {
                                     const tokens = getTokenForEmployeeAndDate(employee._id, date);
                                     return tokens > 0;
                                   }).length;
                                   
                                   return total + (employee.onamBata * workingDays);
                                 }, 0))}
                               </span>
                             </td>
                             <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70 w-20">
                               <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-slate-200 text-slate-800 border border-slate-300">
                                 {employees.reduce((total, employee) => {
                                   const weekDates = getCurrentWeekDates(currentWeekOffset);
                                   return total + weekDates.reduce((sum, date) => 
                                     sum + getNetTokensForEmployeeAndDate(employee._id, date), 0
                                   );
                                 }, 0)}
                               </span>
                             </td>
                                                         <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70 w-24">
                               <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-green-200 text-green-800 border border-green-300">
                                 ₹{employees.reduce((total, employee) => {
                                   const weekDates = getCurrentWeekDates(currentWeekOffset);
                                   const netTotal = weekDates.reduce((sum, date) => 
                                     sum + getNetTokensForEmployeeAndDate(employee._id, date), 0
                                   );
                                   return total + (netTotal * 19.5);
                                 }, 0).toFixed(0)}
                               </span>
                             </td>
                             <td className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70 w-20">
                               <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-orange-200 text-orange-800 border border-orange-300">
                                 {employees.reduce((total, employee) => {
                                   const weekDates = getCurrentWeekDates(currentWeekOffset);
                                   return total + weekDates.filter(date => 
                                     getBataForEmployeeAndDate(employee._id, date)
                                   ).length;
                                 }, 0)}
                               </span>
                             </td>
                             <td className="px-2 py-2 text-right whitespace-nowrap border-r border-slate-200/70 bg-slate-100/70 w-24">
                               <span className="text-sm font-bold text-slate-800">
                                 ₹{employees.reduce((total, employee) => {
                                   const weekDates = getCurrentWeekDates(currentWeekOffset);
                                   const netTotal = weekDates.reduce((sum, date) => 
                                     sum + getNetTokensForEmployeeAndDate(employee._id, date), 0
                                   );
                                   const morningBataDays = weekDates.filter(date => 
                                     getBataForEmployeeAndDate(employee._id, date)
                                   ).length;
                                   return total + (netTotal * 19.5) + (morningBataDays * 17);
                                 }, 0).toFixed(0)}
                               </span>
                             </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary Card */}
                  {employees.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50/60 backdrop-blur-sm border-t border-slate-200/70">
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="text-2xl font-bold text-slate-800">{employees.length}</div>
                          <div className="text-xs text-slate-600 font-light tracking-wide uppercase">Employees</div>
                        </div>
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="text-2xl font-bold text-slate-800">
                            {employees.reduce((total, employee) => {
                              const weekDates = getCurrentWeekDates(currentWeekOffset);
                              return total + weekDates.reduce((sum, date) => 
                                sum + getTokenForEmployeeAndDate(employee._id, date), 0
                              );
                            }, 0)}
                          </div>
                          <div className="text-xs text-slate-600 font-light tracking-wide uppercase">Weekly Total Tokens</div>
                        </div>
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="text-2xl font-bold text-slate-800">
                            {Math.round(employees.reduce((total, employee) => {
                              if (!employee.onamBata) return total;
                              
                              const weekDates = getCurrentWeekDates(currentWeekOffset);
                              const workingDays = weekDates.filter(date => {
                                const tokens = getTokenForEmployeeAndDate(employee._id, date);
                                return tokens > 0;
                              }).length;
                              
                              return total + (employee.onamBata * workingDays);
                            }, 0))}
                          </div>
                          <div className="text-xs text-slate-600 font-light tracking-wide uppercase">Total Onam Bata</div>
                        </div>
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="text-2xl font-bold text-slate-800">
                            {employees.reduce((total, employee) => {
                              const weekDates = getCurrentWeekDates(currentWeekOffset);
                              return total + weekDates.filter(date => 
                                getBataForEmployeeAndDate(employee._id, date)
                              ).length;
                            }, 0)}
                          </div>
                          <div className="text-xs text-slate-600 font-light tracking-wide uppercase">Morning Bata Days</div>
                        </div>
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="text-2xl font-bold text-slate-800">
                            ₹{employees.reduce((total, employee) => {
                              const weekDates = getCurrentWeekDates(currentWeekOffset);
                              const netTotal = weekDates.reduce((sum, date) => 
                                sum + getNetTokensForEmployeeAndDate(employee._id, date), 0
                              );
                              return total + (netTotal * 19.5);
                            }, 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-600 font-light tracking-wide uppercase">Net Total × 19.5</div>
                        </div>
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="text-2xl font-bold text-slate-800">
                            ₹{employees.reduce((total, employee) => {
                              const weekDates = getCurrentWeekDates(currentWeekOffset);
                              const morningBataDays = weekDates.filter(date => 
                                getBataForEmployeeAndDate(employee._id, date)
                              ).length;
                              return total + (morningBataDays * 17);
                            }, 0)}
                          </div>
                          <div className="text-xs text-slate-600 font-light tracking-wide uppercase">Morning Bata Amount</div>
                        </div>
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="text-2xl font-bold text-slate-800">
                            ₹{employees.reduce((total, employee) => {
                              const weekDates = getCurrentWeekDates(currentWeekOffset);
                              const netTotal = weekDates.reduce((sum, date) => 
                                sum + getNetTokensForEmployeeAndDate(employee._id, date), 0
                              );
                              const morningBataDays = weekDates.filter(date => 
                                getBataForEmployeeAndDate(employee._id, date)
                              ).length;
                              return total + (netTotal * 19.5) + (morningBataDays * 17);
                            }, 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-600 font-light tracking-wide uppercase">Total Payout</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Confirm Delete</h3>
                <button
                  onClick={cancelDelete}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPayout;
