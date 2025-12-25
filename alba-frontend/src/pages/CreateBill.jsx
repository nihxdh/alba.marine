import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardSidebar from '../components/Sidebar';

const CreateBill = () => {
  const [adminData, setAdminData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [newBill, setNewBill] = useState({
    billNo: '',
    date: new Date().toISOString().split('T')[0],
    wholeCount: '',
    vehicleNo: '',
    purchaseSpot: '',
    boxCount: '',
    MeatDetails: []
  });
  const [isGeneratingBillNo, setIsGeneratingBillNo] = useState(true);
  // Each meat detail is a variety with one or more count rows.
  const [meatDetails, setMeatDetails] = useState([
    {
      varity: '',
      counts: [
        {
          count: '',
          noOfBox: '',
          kgs: '',
          grams: ''
        }
      ]
    }
  ]);

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
      generateBillNumber();
    } catch (error) {
      console.error('Error parsing admin data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const generateBillNumber = async () => {
    try {
      setIsGeneratingBillNo(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      // Fetch all bills to get the latest bill number
      const response = await axios.get(`${baseURL}/billing/bills?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const bills = response.data.data;
        
        // Find the highest bill number
        let maxBillNumber = 499; // Start from 500, so base is 499
        
        bills.forEach(bill => {
          const billNo = bill.billNo;
          // Extract number from bill number (e.g., "BILL-2024-500" -> 500)
          const match = billNo.match(/(\d+)$/);
          if (match) {
            const number = parseInt(match[1]);
            if (number > maxBillNumber) {
              maxBillNumber = number;
            }
          }
        });
        
        // Generate next bill number
        const nextBillNumber = maxBillNumber + 1;
        const currentYear = new Date().getFullYear();
        const generatedBillNo = `BILL-${currentYear}-${nextBillNumber.toString().padStart(3, '0')}`;
        
        setNewBill(prev => ({
          ...prev,
          billNo: generatedBillNo
        }));
      }
    } catch (error) {
      console.error('Error generating bill number:', error);
      // Fallback to a default bill number
      const currentYear = new Date().getFullYear();
      const fallbackBillNo = `BILL-${currentYear}-500`;
      setNewBill(prev => ({
        ...prev,
        billNo: fallbackBillNo
      }));
    } finally {
      setIsGeneratingBillNo(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBill(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMeatDetailChange = (index, field, value) => {
    const updatedMeatDetails = [...meatDetails];
    updatedMeatDetails[index] = {
      ...updatedMeatDetails[index],
      [field]: value
    };
    setMeatDetails(updatedMeatDetails);
  };
  
  const handleCountRowChange = (meatIndex, rowIndex, field, value) => {
    const updatedMeatDetails = [...meatDetails];
    const meat = updatedMeatDetails[meatIndex];
    const counts = meat.counts || [];
    const updatedCounts = [...counts];
    updatedCounts[rowIndex] = {
      ...updatedCounts[rowIndex],
      [field]: value
    };
    updatedMeatDetails[meatIndex] = {
      ...meat,
      counts: updatedCounts
    };
    setMeatDetails(updatedMeatDetails);
  };

  const addMeatDetail = () => {
    setMeatDetails([
      ...meatDetails,
      {
        varity: '',
        counts: [
          {
            count: '',
            noOfBox: '',
            kgs: '',
            grams: ''
          }
        ]
      }
    ]);
  };

  const removeMeatDetail = (index) => {
    if (meatDetails.length > 1) {
      const updatedMeatDetails = meatDetails.filter((_, i) => i !== index);
      setMeatDetails(updatedMeatDetails);
    }
  };
  
  const addCountRow = (meatIndex) => {
    const updatedMeatDetails = [...meatDetails];
    const meat = updatedMeatDetails[meatIndex];
    const counts = meat.counts || [];
    updatedMeatDetails[meatIndex] = {
      ...meat,
      counts: [
        ...counts,
        {
          count: '',
          noOfBox: '',
          kgs: '',
          grams: ''
        }
      ]
    };
    setMeatDetails(updatedMeatDetails);
  };

  const removeCountRow = (meatIndex, rowIndex) => {
    const updatedMeatDetails = [...meatDetails];
    const meat = updatedMeatDetails[meatIndex];
    const counts = meat.counts || [];
    if (counts.length > 1) {
      const nextCounts = counts.filter((_, i) => i !== rowIndex);
      updatedMeatDetails[meatIndex] = {
        ...meat,
        counts: nextCounts
      };
      setMeatDetails(updatedMeatDetails);
    }
  };

  // Calculate totals from meat details
  const calculateTotals = () => {
    let totalBoxes = 0;
    let totalWeight = 0;

    meatDetails.forEach((meat) => {
      const rows = meat.counts || [];
      rows.forEach((row) => {
        const noOfBox = parseFloat(row.noOfBox || 0);
        const kgs = parseFloat(row.kgs || 0);
        totalBoxes += noOfBox;
        totalWeight += kgs;
      });
    });

    return {
      totalBoxes: totalBoxes.toString(),
      totalWeight: totalWeight.toString()
    };
  };

  // Build backend MeatDetails array from current UI model
  const buildBackendMeatDetails = () => {
    const transformed = [];
    let hasIncomplete = false;

    meatDetails.forEach((meat) => {
      const varity = (meat.varity || '').trim();
      const rows = meat.counts || [];

      rows.forEach((row) => {
        const count = (row.count || '').trim();
        const noOfBox = (row.noOfBox || '').trim();
        const kgs = (row.kgs || '').trim();
        const grams = (row.grams || '').trim() || '0'; // Default to '0' if grams is empty

        const anyFilled = varity || count || noOfBox || kgs;
        const allFilled = varity && count && noOfBox && kgs; // grams is now optional

        if (allFilled) {
          transformed.push({
            varity,
            count,
            noOfBox,
            weight: [{ kgs, grams }],
            totalWeight: '',
            totalNoBox: ''
          });
        } else if (anyFilled) {
          hasIncomplete = true;
        }
      });
    });

    if (hasIncomplete) {
      showNotification(
        'Please complete all meat rows (variety, count, boxes, KGs and grams) or clear incomplete ones',
        'error'
      );
      return null;
    }

    if (transformed.length === 0) {
      showNotification('Please fill in at least one complete meat detail', 'error');
      return null;
    }

    return transformed;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate basic bill information - only billNo and vehicleNo are required
    if (!newBill.billNo || !newBill.vehicleNo) {
      showNotification('Please fill in Bill Number and Vehicle Number', 'error');
      return;
    }

    const backendMeatDetails = buildBackendMeatDetails();
    if (!backendMeatDetails) {
      return;
    }

    try {
      setIsLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('authToken');
      
      const billData = {
        ...newBill,
        MeatDetails: backendMeatDetails
      };
      
      const response = await axios.post(`${baseURL}/billing/bills`, billData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 201) {
        showNotification('Bill created successfully!', 'success');
        navigate('/billing');
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      showNotification(error.response?.data?.message || 'Failed to create bill', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewPDF = () => {
    // Validate basic bill information - only billNo and vehicleNo are required
    if (!newBill.billNo || !newBill.vehicleNo) {
      showNotification('Please fill in Bill Number and Vehicle Number before generating PDF', 'error');
      return;
    }

    const backendMeatDetails = buildBackendMeatDetails();
    if (!backendMeatDetails) {
      return;
    }

    const billData = {
      ...newBill,
      MeatDetails: backendMeatDetails
    };

    navigate('/print/peeling/preview', {
      state: { billData }
    });
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

          {/* Fixed close icon for the page */}
          <button
            type="button"
            onClick={() => navigate('/billing')}
            className="fixed top-6 right-8 z-40 text-slate-500 hover:text-slate-800 focus:outline-none"
            aria-label="Close and go back to billing"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Section Header - Outside main container */}
          <div className="flex justify-between items-end mb-6 pt-6 px-8">
            <div>
              <h2 className="text-3xl font-thin text-slate-800 tracking-wide font-serif">Create New Bill</h2>
              <p className="text-sm text-slate-500 mt-1 font-light">Add a new supplier bill to the system</p>
            </div>
          </div>

          {/* Elegant Main Content */}
          <main className="max-w-4xl mx-auto px-6 pb-12">
            {/* Professional Bill Creation Form */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-slate-200/30">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70" style={{ backgroundColor: '#314158' }}>
                <div>
                  <h3 className="text-xl font-thin tracking-wide font-serif text-white">Bill Information</h3>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-6">
                                 {/* Basic Bill Information */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <div className="space-y-1.5">
                     <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                       Bill Number
                     </label>
                     <div className="relative">
                                               <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg 
                                 text-red-600 font-semibold text-lg shadow-sm cursor-not-allowed flex items-center justify-center">
                          {isGeneratingBillNo ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-red-600">Generating...</span>
                            </div>
                          ) : newBill.billNo ? (
                            // Extract only the number part (e.g., "BILL-2025-500" -> "500")
                            newBill.billNo.match(/(\d+)$/)?.[1] || newBill.billNo
                          ) : null}
                        </div>
                     </div>
                   </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={newBill.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                      Whole Count
                    </label>
                    <input
                      type="text"
                      name="wholeCount"
                      value={newBill.wholeCount}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                      placeholder="Enter whole count"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      name="vehicleNo"
                      value={newBill.vehicleNo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                      placeholder="Enter vehicle number"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                      Purchase Spot
                    </label>
                    <input
                      type="text"
                      name="purchaseSpot"
                      value={newBill.purchaseSpot}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                      placeholder="Enter purchase spot"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                      Box Count
                    </label>
                    <input
                      type="text"
                      name="boxCount"
                      value={newBill.boxCount}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                               transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm
                               shadow-sm hover:shadow-md hover:border-slate-300"
                      placeholder="Enter box count"
                    />
                  </div>
                </div>

                {/* Meat Details Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-slate-800">Meat Details</h4>
                    <button
                      type="button"
                      onClick={addMeatDetail}
                      className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium
                               hover:bg-slate-700 transition-all duration-200 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Meat Detail</span>
                    </button>
                  </div>

                  {meatDetails.map((meat, meatIndex) => (
                    <div key={meatIndex} className="bg-slate-50/50 rounded-xl px-4 py-6 mb-4 border border-slate-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-sm font-medium text-slate-700">Meat Detail #{meatIndex + 1}</h5>
                        {meatDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMeatDetail(meatIndex)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                            Variety
                          </label>
                          <input
                            type="text"
                            value={meat.varity}
                            onChange={(e) => handleMeatDetailChange(meatIndex, 'varity', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg 
                                     focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                                     transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-sm"
                            placeholder="Enter variety"
                          />
                        </div>

                        {/* Count rows for this variety */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                            Counts / Boxes / Weight
                          </label>
                          <div className="space-y-2">
                            {(meat.counts || []).map((row, rowIndex) => (
                              <div key={rowIndex} className="grid grid-cols-4 gap-2 items-center">
                                <input
                                  type="text"
                                  value={row.count}
                                  onChange={(e) =>
                                    handleCountRowChange(meatIndex, rowIndex, 'count', e.target.value)
                                  }
                                  className="px-2 py-2 bg-white border border-slate-200 rounded-lg 
                                           focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                                           transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-xs"
                                  placeholder="Count"
                                />
                                <input
                                  type="text"
                                  value={row.noOfBox}
                                  onChange={(e) =>
                                    handleCountRowChange(meatIndex, rowIndex, 'noOfBox', e.target.value)
                                  }
                                  className="px-2 py-2 bg-white border border-slate-200 rounded-lg 
                                           focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                                           transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-xs"
                                  placeholder="No. of Box"
                                />
                                <input
                                  type="text"
                                  value={row.kgs}
                                  onChange={(e) =>
                                    handleCountRowChange(meatIndex, rowIndex, 'kgs', e.target.value)
                                  }
                                  className="px-2 py-2 bg-white border border-slate-200 rounded-lg 
                                           focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                                           transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-xs"
                                  placeholder="KGs"
                                />
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="text"
                                    value={row.grams}
                                    onChange={(e) =>
                                      handleCountRowChange(meatIndex, rowIndex, 'grams', e.target.value)
                                    }
                                    className="w-30 px-2 py-2 bg-white border border-slate-200 rounded-lg 
                                             focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400
                                             transition-all duration-200 text-slate-700 placeholder-slate-400 font-light text-xs"
                                    placeholder="Grams"
                                  />
                                  {(meat.counts || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeCountRow(meatIndex, rowIndex)}
                                      className="text-red-600 hover:text-red-700 p-1"
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => addCountRow(meatIndex)}
                            className="mt-2 text-slate-600 hover:text-slate-700 text-xs"
                          >
                            + Add Count Row
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Section */}
                <div className="mb-8">
                  <div className="bg-slate-100/50 rounded-xl p-6 border border-slate-200/50">
                    <h4 className="text-lg font-medium text-slate-800 mb-4">Total</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                          Total Box Count
                        </label>
                        <div className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                                     text-slate-700 font-medium text-sm shadow-sm">
                          {calculateTotals().totalBoxes || '0'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5 font-light tracking-wide">
                          Total Weight (kg)
                        </label>
                        <div className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg 
                                     text-slate-700 font-medium text-sm shadow-sm">
                          {calculateTotals().totalWeight || '0'} kg
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                                 {/* Form Actions */}
                 <div className="flex items-center justify-center space-x-4 pt-6 border-t border-slate-200">
                   <button
                     type="button"
                     onClick={() => navigate('/billing')}
                     className="px-6 py-3 text-slate-600 bg-slate-100 rounded-full font-light text-sm
                              hover:bg-slate-200 hover:text-slate-700 transition-all duration-200"
                   >
                     Cancel
                   </button>
                   <button
                     type="button"
                     onClick={handlePreviewPDF}
                     className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium text-sm
                              hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400 
                              focus:ring-offset-1 transition-all duration-200 shadow-md hover:shadow-lg
                              flex items-center space-x-2"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                     </svg>
                     <span>Generate PDF</span>
                   </button>
                   <button
                     type="submit"
                     disabled={isLoading}
                     className="px-8 py-3 bg-slate-800 text-white rounded-full font-medium text-sm
                              hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 
                              focus:ring-offset-1 transition-all duration-200 shadow-md hover:shadow-lg
                              disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                   >
                     {isLoading ? (
                       <>
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         <span>Creating...</span>
                       </>
                     ) : (
                       <>
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                         </svg>
                         <span>Create Bill</span>
                       </>
                     )}
                   </button>
                 </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CreateBill;
