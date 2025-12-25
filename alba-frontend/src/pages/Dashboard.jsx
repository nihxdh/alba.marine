import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardSidebar from '../components/Sidebar';
import albaMarineLogo from '../assets/albaMarineLogo.png';

const Dashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    employeeId: '',
    phoneNo: '',
    onamBata: 0,
    status: true // Default to active
  });
  const [notification, setNotification] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState({
    id: '',
    name: '',
    employeeId: '',
    phoneNo: '',
    onamBata: 0,
    status: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    const admin = localStorage.getItem('adminData');

    if (!token || !admin) {
      navigate('/login');
      return;
    }

    try {
      setAdminData(JSON.parse(admin));
      fetchEmployees(); // Fetch employees after authentication
    } catch (error) {
      console.error('Error parsing admin data:', error);
      navigate('/login');
    }
  }, [navigate]);


  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter employees based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = employees.filter(employee => {
      const name = (employee.name || '').toLowerCase();
      const employeeId = (employee.employeeId || '').toLowerCase();
      const phoneNo = (employee.phoneNo || '').toLowerCase();
      
      return name.includes(query) || 
             employeeId.includes(query) || 
             phoneNo.includes(query);
    });
    
    setFilteredEmployees(filtered);
  }, [searchQuery, employees]);

  const generateNextEmployeeId = (employeeList) => {
    // Extract numeric IDs from existing employees
    const numericIds = employeeList
      .map(emp => {
        // Extract numbers from employeeId (handles formats like "001", "EMP001", etc.)
        const match = emp.employeeId?.toString().match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(id => id > 0);
    
    // Find the highest ID and increment by 1, or start from 1
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    
    // Format as 3-digit string with leading zeros
    const formattedId = nextId.toString().padStart(3, '0');
    
    // Update the newEmployee state with the generated ID
    setNewEmployee(prev => ({
      ...prev,
      employeeId: formattedId
    }));
  };

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(`${baseURL}/admin/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const employeeList = response.data.data || [];
        setEmployees(employeeList);
        setFilteredEmployees(employeeList);
        // Auto-generate employee ID when employees are fetched
        if (showCreateForm) {
          generateNextEmployeeId(employeeList);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      showNotification('Failed to fetch employees', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    
    if (!newEmployee.name) {
      showNotification('Name is required', 'error');
      return;
    }
    
    // Ensure employee ID is generated if not present
    if (!newEmployee.employeeId) {
      generateNextEmployeeId(employees);
    }

    try {
      setIsLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const response = await axios.post(`${baseURL}/admin/employees`, newEmployee, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 201) {
        showNotification('Employee created successfully!', 'success');
        setNewEmployee({ name: '', employeeId: '', phoneNo: '', onamBata: 0, status: true });
        setShowCreateForm(false);
        fetchEmployees(); // Refresh the list and generate next ID
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      showNotification(error.response?.data?.message || 'Failed to create employee', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };



  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      setIsLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const response = await axios.delete(`${baseURL}/admin/employees/${employeeToDelete._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        showNotification(`Employee ${employeeToDelete.name} deleted successfully!`, 'success');
        setShowDeleteConfirm(false);
        setEmployeeToDelete(null);
        fetchEmployees(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      showNotification(error.response?.data?.message || 'Failed to delete employee', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirm(true);
  };

  const handleEditEmployee = (employee) => {
    setEditEmployee({
      id: employee._id,
      name: employee.name,
      employeeId: employee.employeeId,
      phoneNo: employee.phoneNo || '',
      onamBata: employee.onamBata || 0,
      status: employee.status
    });
    setShowEditForm(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    
    if (!editEmployee.name || !editEmployee.employeeId) {
      showNotification('Name and Employee ID are required', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const response = await axios.put(`${baseURL}/admin/employees/${editEmployee.id}`, {
        name: editEmployee.name,
        employeeId: editEmployee.employeeId,
        phoneNo: editEmployee.phoneNo,
        onamBata: editEmployee.onamBata,
        status: editEmployee.status
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        showNotification('Employee updated successfully!', 'success');
        setEditEmployee({ id: '', name: '', employeeId: '', phoneNo: '', onamBata: 0, status: true });
        setShowEditForm(false);
        fetchEmployees(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      showNotification(error.response?.data?.message || 'Failed to update employee', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditEmployee(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminData');
    navigate('/login');
  };

  if (!adminData) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar */}
        <DashboardSidebar 
          adminData={{}} 
          onLogout={handleLogout}
        />

        {/* Loading Content */}
        <div className="flex-1 ml-64">
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <DashboardSidebar 
        adminData={adminData} 
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

          {/* Elegant Main Content */}
          <main className="max-w-7xl mx-auto pt-4 pb-12 px-6">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-4xl font-thin text-slate-800 tracking-wide font-serif">Employee Directory</h2>
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2.5 pr-10 bg-white border border-black/20 rounded-full text-sm
                         focus:outline-none focus:border-black/40 focus:ring-1 focus:ring-black/20
                         transition-all duration-200 text-slate-700 placeholder-slate-400
                         w-64"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                if (!showCreateForm) {
                  generateNextEmployeeId(employees);
                }
                setShowCreateForm(!showCreateForm);
              }}
              className="mt-2 bg-slate-800 text-white px-8 py-2.5 rounded-full text-sm font-medium
                       hover:bg-slate-700 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Professional Employee Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-slate-200/30">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider font-light border-r border-slate-600 first:border-l-0 last:border-r-0 w-32">
                  Employee ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider font-light border-r border-slate-600 first:border-l-0 last:border-r-0">
                  Employee Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider font-light border-r border-slate-600 first:border-l-0 last:border-r-0">
                  Contact
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider font-light border-r border-slate-600 first:border-l-0 last:border-r-0">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/40 backdrop-blur-sm">
              {isLoading ? (
                <tr className="border-t border-slate-300">
                  <td colSpan="4" className="px-5 py-8 text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-600 font-light">Loading employees...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr className="border-t border-slate-300">
                  <td colSpan="4" className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 font-light">
                          {searchQuery ? 'No employees found matching your search' : 'No employees found'}
                        </p>
                        {!searchQuery && (
                          <p className="text-sm text-slate-400 mt-1">Create your first employee to get started</p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <tr key={employee._id} className={`hover:bg-slate-50/60 transition-all duration-200 ${index !== 0 ? 'border-t border-black/20' : ''}`}>
                    <td className="px-5 py-3 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0 w-32">
                      <div className="text-sm text-slate-600 font-mono">{employee.employeeId}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                      <div className="text-sm font-medium text-slate-900">{employee.name}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                      <div className="text-sm text-slate-600">{employee.phoneNo || '—'}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowEmployeeDetails(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="View Employee Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditEmployee(employee)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200"
                          title="Edit Employee"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => confirmDelete(employee)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete Employee"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Professional Modal Form */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowCreateForm(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/80 rounded-t-2xl border-b border-slate-200">
              <div className="flex items-center space-x-4 flex-1">
                {/* Logo on the left */}
                <div className="flex-shrink-0">
                  <img 
                    src={albaMarineLogo} 
                    alt="ALBA MARINE" 
                    className="h-18 w-auto object-contain"
                  />
                </div>
                {/* Text section */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-xl font-thin text-slate-800 tracking-widest font-serif">
                      ALBA MARINE
                    </h1>
                    <h2 className="text-xs font-light text-slate-600 tracking-wider font-sans">
                      ENTERPRISE
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 font-light">New Employee Registration</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 hover:bg-white/80 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <form onSubmit={handleCreateEmployee} className="space-y-5">
                {/* Name Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newEmployee.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                             transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                             shadow-sm hover:shadow-md hover:border-slate-300"
                    placeholder="Enter employee's full name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Employee ID Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      name="employeeId"
                      value={newEmployee.employeeId}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg 
                               text-slate-700 font-light text-sm font-mono
                               shadow-sm cursor-not-allowed"
                      placeholder="001"
                    />
                  </div>

                  {/* Phone Number Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phoneNo"
                      value={newEmployee.phoneNo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                {/* Onam Bata Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                    Onam Bata
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="onamBata"
                    value={newEmployee.onamBata}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                             transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                             shadow-sm hover:shadow-md hover:border-slate-300"
                    placeholder="Enter onam bata tokens (savings/advance)"
                  />
                  <p className="text-xs text-slate-500 font-light">
                    💡 These tokens will be converted to money later (₹19.5 per token)
                  </p>
                </div>

                {/* Status Toggle Switch */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600 font-light">
                    Employee Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium transition-colors duration-200 ${
                      newEmployee.status ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Inactive
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="status"
                        id="status"
                        checked={newEmployee.status}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <label 
                        htmlFor="status"
                        className={`flex items-center justify-center w-10 h-5 rounded-full cursor-pointer transition-all duration-300 ${
                          newEmployee.status 
                            ? 'bg-green-500 shadow-sm' 
                            : 'bg-slate-300 shadow-sm'
                        }`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 transform ${
                          newEmployee.status ? 'translate-x-2.5' : '-translate-x-2.5'
                        }`}></div>
                      </label>
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-200 ${
                      newEmployee.status ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      Active
                    </span>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-center space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 text-slate-600 bg-slate-100 rounded-full font-light text-sm
                             hover:bg-slate-200 hover:text-slate-700 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-2 bg-slate-800 text-white rounded-full font-medium text-sm
                             hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 
                             focus:ring-offset-1 transition-all duration-200 shadow-md hover:shadow-lg
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Employee</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}



      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <img 
                  src={albaMarineLogo} 
                  alt="ALBA MARINE" 
                  className="h-16 w-auto object-contain"
                />
                <div>
                  <h4 className="text-lg font-medium text-slate-900">Delete Employee</h4>
                  <p className="text-sm text-slate-500 mt-1">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-slate-700 mb-6 text-center">
                Are you sure you want to delete <strong>{employeeToDelete.name}</strong> (ID: {employeeToDelete.employeeId})? 
              </p>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-2 text-slate-600 bg-slate-100 rounded-full text-sm font-medium
                           hover:bg-slate-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  disabled={isLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-full text-sm font-medium
                           hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Employee</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowEditForm(false)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/80 rounded-t-2xl border-b border-slate-200">
              <div className="flex items-center space-x-4 flex-1">
                {/* Logo on the left */}
                <div className="flex-shrink-0">
                  <img 
                    src={albaMarineLogo} 
                    alt="ALBA MARINE" 
                    className="h-18 w-auto object-contain"
                  />
                </div>
                {/* Text section */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-xl font-thin text-slate-800 tracking-widest font-serif">
                      ALBA MARINE
                    </h1>
                    <h2 className="text-xs font-light text-slate-600 tracking-wider font-sans">
                      ENTERPRISE
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 font-light">Edit Employee Details</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditForm(false)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 hover:bg-white/80 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <form onSubmit={handleUpdateEmployee} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={editEmployee.name}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                             transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                             shadow-sm hover:shadow-md hover:border-slate-300"
                    placeholder="Enter employee's full name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">Employee ID *</label>
                    <input
                      type="text"
                      name="employeeId"
                      value={editEmployee.employeeId}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                      placeholder="EMP001"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">Phone Number</label>
                    <input
                      type="text"
                      name="phoneNo"
                      value={editEmployee.phoneNo}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                {/* Onam Bata Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                    Onam Bata (Savings Tokens)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="onamBata"
                    value={editEmployee.onamBata}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                             transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                             shadow-sm hover:shadow-md hover:border-slate-300"
                    placeholder="Enter onam bata tokens (savings/advance)"
                  />
                  <p className="text-xs text-slate-500 font-light">
                    💡 These tokens will be converted to money later (₹19.5 per token)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600 font-light">
                    Employee Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium transition-colors duration-200 ${
                      editEmployee.status ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Inactive
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="status"
                        id="editStatus"
                        checked={editEmployee.status}
                        onChange={handleEditInputChange}
                        className="sr-only"
                      />
                      <label 
                        htmlFor="editStatus"
                        className={`flex items-center justify-center w-10 h-5 rounded-full cursor-pointer transition-all duration-300 ${
                          editEmployee.status 
                            ? 'bg-green-500 shadow-sm' 
                            : 'bg-slate-300 shadow-sm'
                        }`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 transform ${
                          editEmployee.status ? 'translate-x-2.5' : '-translate-x-2.5'
                        }`}></div>
                      </label>
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-200 ${
                      editEmployee.status ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-6 py-2 text-slate-600 bg-slate-100 rounded-full font-light text-sm
                             hover:bg-slate-200 hover:text-slate-700 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-2 bg-slate-800 text-white rounded-full font-medium text-sm
                             hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 
                             focus:ring-offset-1 transition-all duration-200 shadow-md hover:shadow-lg
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Employee</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
          )}

      {/* Employee Details View Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowEmployeeDetails(false)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/80 rounded-t-2xl border-b border-slate-200">
              <div className="flex items-center space-x-4 flex-1">
                {/* Logo on the left */}
                <div className="flex-shrink-0">
                  <img 
                    src={albaMarineLogo} 
                    alt="ALBA MARINE" 
                    className="h-18 w-auto object-contain"
                  />
                </div>
                {/* Text section */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-xl font-thin text-slate-800 tracking-widest font-serif">
                      ALBA MARINE
                    </h1>
                    <h2 className="text-xs font-light text-slate-600 tracking-wider font-sans">
                      ENTERPRISE
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 font-light">Employee Details</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmployeeDetails(false)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 hover:bg-white/80 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="space-y-4">
                {/* Employee ID */}
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Employee ID:</span>
                  <span className="text-sm font-mono text-slate-900">{selectedEmployee.employeeId}</span>
                </div>

                {/* Employee Name */}
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Full Name:</span>
                  <span className="text-sm font-medium text-slate-900">{selectedEmployee.name}</span>
                </div>

                {/* Phone Number */}
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Contact:</span>
                  <span className="text-sm text-slate-900">{selectedEmployee.phoneNo || '—'}</span>
                </div>

                {/* Onam Bata */}
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Onam Bata (Savings Tokens):</span>
                  <span className="text-sm text-slate-900">
                    {selectedEmployee.onamBata > 0 ? `${selectedEmployee.onamBata} tokens` : 'None'}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-slate-600">Status:</span>
                  <span className="text-sm text-slate-900">
                    {selectedEmployee.status ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowEmployeeDetails(false)}
                  className="px-6 py-2 bg-slate-800 text-white rounded-full font-medium text-sm
                           hover:bg-slate-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
