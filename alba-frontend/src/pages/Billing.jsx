import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardSidebar from '../components/Sidebar';
import { getTotalBoxesFromMeatDetails, getTotalWeightFromMeatDetails } from '../utils/billingUtils';

const Billing = () => {
  const [adminData, setAdminData] = useState(null);
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBills: 0,
    hasNextPage: false,
    hasPrevPage: false
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
      fetchBills(); // Fetch bills after authentication
    } catch (error) {
      navigate('/login');
    }
  }, [navigate]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchBills = async (page = 1) => {
    try {
      setIsLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy: 'date',
        sortOrder: 'desc'
      });
      
      const response = await axios.get(`${baseURL}/billing/bills?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        setBills(response.data.data || []);
        setPagination(response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalBills: 0,
          hasNextPage: false,
          hasPrevPage: false
        });
      }
    } catch (error) {
      showNotification('Failed to fetch bills', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminData');
    navigate('/login');
  };




  const handlePageChange = (page) => {
    fetchBills(page);
  };

  const handleOpenPrint = (billId) => {
    navigate(`/print/peeling/${billId}`)
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <main className="max-w-7xl mx-auto py-12 px-6">
            {/* Section Header */}
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-4xl font-thin text-slate-800 tracking-wide font-serif">Billing Management</h2>
              </div>
                             <div className="flex items-center space-x-4">
                 <button
                   onClick={() => navigate('/billing/create')}
                   className="bg-slate-800 text-white px-8 py-3 rounded-full text-sm font-medium
                            hover:bg-slate-700 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                   </svg>
                   <span>Create Bill</span>
                 </button>
               </div>
            </div>

            

            {/* Professional Bills Table */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-slate-200/30">
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/60 backdrop-blur-sm border-b border-slate-200/70">
                <div>
                  <h3 className="text-xl font-thin text-slate-800 tracking-wide font-serif">Bills List</h3>
                  <p className="text-xs text-slate-500 mt-1 font-light">
                    📋 All supplier bills with detailed information and meat quantities
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center">
                      <p className="text-slate-500 font-light">Loading bills...</p>
                      <p className="text-sm text-slate-400 mt-1">Please wait while we fetch your billing data</p>
                    </div>
                  </div>
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 font-light">No bills found</p>
                      <p className="text-sm text-slate-400 mt-1">Get started by creating a new bill</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead className="bg-slate-50/60 backdrop-blur-sm">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                            Bill Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                            Vehicle & Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                            Quantities
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                            Meat Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider font-light border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/40 backdrop-blur-sm">
                        {bills.map((bill, index) => (
                          <tr key={bill._id} className={`hover:bg-slate-50/60 transition-all duration-200 ${index !== 0 ? 'border-t border-slate-200' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{bill.billNo}</div>
                                <div className="text-sm text-slate-500 font-mono">ID: {bill._id.slice(-8)}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{bill.vehicleNo}</div>
                                <div className="text-sm text-slate-500">{bill.purchaseSpot}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  Whole: {bill.wholeCount}
                                </div>
                                <div className="text-sm text-slate-500">
                                  Boxes: {bill.boxCount}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                              <div className="text-sm text-slate-900">
                                <div className="font-medium">
                                  Total Boxes: {getTotalBoxesFromMeatDetails(bill.MeatDetails)}
                                </div>
                                <div className="text-slate-500">
                                  Weight: {getTotalWeightFromMeatDetails(bill.MeatDetails).toFixed(2)} kg
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {bill.MeatDetails?.length || 0} varieties
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                              {formatDate(bill.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200/70 first:border-l-0 last:border-r-0">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleOpenPrint(bill._id)}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                                  title="Generate PDF"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-700">
                          Showing page {pagination.currentPage} of {pagination.totalPages} 
                          ({pagination.totalBills} total bills)
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevPage}
                            className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={!pagination.hasNextPage}
                            className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
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
    </div>
  );
};

export default Billing;
