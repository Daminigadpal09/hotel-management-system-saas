import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { billingAPI, hotelAPI, branchAPI, paymentAPI } from "../services/api.js";

export default function AccountantDashboard() {
  const [hotels, setHotels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [billingRecords, setBillingRecords] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('billing'); // billing, payments, reports
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const [paymentForm, setPaymentForm] = useState({
    billingId: '',
    amount: '',
    paymentMethod: 'cash',
    transactionId: '',
    notes: ''
  });
  
  const [billingForm, setBillingForm] = useState({
    bookingId: '',
    guestName: '',
    roomNumber: '',
    amount: '',
    type: 'room_charge',
    description: '',
    dueDate: ''
  });

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch hotels
      const hotelsResponse = await hotelAPI.getHotels();
      const allHotels = hotelsResponse.data || [];
      setHotels(allHotels);
      
      // If user has assigned hotel, select it
      if (user.hotel_id) {
        const userHotel = allHotels.find(h => h._id === user.hotel_id);
        if (userHotel) {
          setSelectedHotel(userHotel);
          const branchesResponse = await hotelAPI.getBranches(userHotel._id);
          const hotelBranches = branchesResponse.data || [];
          setBranches(hotelBranches);
          
          if (user.branch_id) {
            const userBranch = hotelBranches.find(b => b._id === user.branch_id);
            if (userBranch) {
              setSelectedBranch(userBranch);
              await fetchBillingAndPayments(userHotel._id, userBranch._id);
            }
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const fetchBillingAndPayments = async (hotelId, branchId) => {
    try {
      // Fetch billing records
      const billingResponse = await billingAPI.getBillingByBranch(branchId);
      setBillingRecords(billingResponse.data || []);
      
      // Fetch payment records
      const paymentResponse = await paymentAPI.getPaymentsByBranch(branchId);
      setPaymentRecords(paymentResponse.data || []);
    } catch (error) {
      console.error("Error fetching billing and payments:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHotelChange = async (hotelId) => {
    try {
      const hotel = hotels.find(h => h._id === hotelId);
      setSelectedHotel(hotel);
      
      const branchesResponse = await hotelAPI.getBranches(hotelId);
      const hotelBranches = branchesResponse.data || [];
      setBranches(hotelBranches);
      
      if (hotelBranches.length > 0) {
        setSelectedBranch(hotelBranches[0]);
        await fetchBillingAndPayments(hotelId, hotelBranches[0]._id);
      }
    } catch (error) {
      console.error("Error changing hotel:", error);
    }
  };

  const handleBranchChange = async (branchId) => {
    try {
      const branch = branches.find(b => b._id === branchId);
      setSelectedBranch(branch);
      
      if (selectedHotel && branch) {
        await fetchBillingAndPayments(selectedHotel._id, branchId);
      }
    } catch (error) {
      console.error("Error changing branch:", error);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      const paymentData = {
        ...paymentForm,
        hotelId: selectedHotel._id,
        branchId: selectedBranch._id,
        amount: parseFloat(paymentForm.amount),
        status: 'completed',
        createdBy: user._id
      };
      
      await paymentAPI.createPayment(paymentData);
      alert("Payment recorded successfully!");
      setShowPaymentModal(false);
      setPaymentForm({
        billingId: '',
        amount: '',
        paymentMethod: 'cash',
        transactionId: '',
        notes: ''
      });
      fetchBillingAndPayments(selectedHotel._id, selectedBranch._id);
    } catch (error) {
      alert("Error recording payment: " + error.message);
    }
  };

  const handleCreateBilling = async (e) => {
    e.preventDefault();
    try {
      // Validate that hotel and branch are selected
      if (!selectedHotel || !selectedHotel._id) {
        alert("Please select a hotel first");
        return;
      }
      
      if (!selectedBranch || !selectedBranch._id) {
        alert("Please select a branch first");
        return;
      }

      const billingData = {
        ...billingForm,
        hotelId: selectedHotel._id,
        branchId: selectedBranch._id,
        amount: parseFloat(billingForm.amount),
        status: 'pending',
        createdBy: user._id
      };
      
      await billingAPI.createBilling(billingData);
      alert("Billing record created successfully!");
      setShowBillingModal(false);
      setBillingForm({
        bookingId: '',
        guestName: '',
        roomNumber: '',
        amount: '',
        type: 'room_charge',
        description: '',
        dueDate: ''
      });
      fetchBillingAndPayments(selectedHotel._id, selectedBranch._id);
    } catch (error) {
      console.error("Billing creation error:", error);
      alert("Error creating billing record: " + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Calculate statistics
  const totalBilling = billingRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalPayments = paymentRecords.reduce((sum, record) => sum + record.amount, 0);
  const pendingBilling = billingRecords.filter(r => r.status === 'pending').reduce((sum, record) => sum + record.amount, 0);
  const paidBilling = billingRecords.filter(r => r.status === 'paid').reduce((sum, record) => sum + record.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-semibold text-blue-600">Accountant</h1>
          <p className="text-sm text-gray-500">{user.name}</p>
        </div>
        
        <nav className="p-4">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'billing' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Billing Management
            </button>
            
            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'payments' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Payment Records
            </button>
            
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'reports' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Financial Reports
            </button>
          </div>
          
          <div className="border-t pt-4">
            <button
              onClick={handleLogout}
              className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50"
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Accountant Dashboard - {selectedBranch?.name || 'Select Branch'}
              </h2>
              
              {/* Hotel Selector */}
              {hotels.length > 0 && (
                <select
                  value={selectedHotel?._id || ""}
                  onChange={(e) => handleHotelChange(e.target.value)}
                  className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Hotel</option>
                  {hotels.map(hotel => (
                    <option key={hotel._id} value={hotel._id}>{hotel.name}</option>
                  ))}
                </select>
              )}
              
              {/* Branch Selector */}
              {branches.length > 0 && (
                <select
                  value={selectedBranch?._id || ""}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} ({branch.city})
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Billing</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">${totalBilling.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Payments</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">${totalPayments.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">${pendingBilling.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Paid Amount</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">${paidBilling.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'billing' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Billing Records</h3>
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  + Create Billing
                </button>
              </div>
              
              <div className="p-6">
                {billingRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No billing records found</h3>
                    <p className="text-gray-500">No billing records available for this branch.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {billingRecords.map(record => (
                          <tr key={record._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.guestName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.roomNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                record.status === 'paid' ? 'bg-green-100 text-green-800' :
                                record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(record.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {record.status === 'pending' && (
                                <button
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setPaymentForm({...paymentForm, billingId: record._id, amount: record.amount});
                                    setShowPaymentModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Record Payment
                                </button>
                              )}
                              <button className="text-gray-600 hover:text-gray-900">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Payment Records</h3>
              </div>
              
              <div className="p-6">
                {paymentRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No payment records found</h3>
                    <p className="text-gray-500">No payment records available for this branch.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentRecords.map(payment => (
                          <tr key={payment._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.billingId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${payment.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.transactionId || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Financial Reports</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Revenue Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Revenue:</span>
                        <span className="text-sm font-medium text-gray-900">${totalPayments.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pending Revenue:</span>
                        <span className="text-sm font-medium text-orange-600">${pendingBilling.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Collected Revenue:</span>
                        <span className="text-sm font-medium text-green-600">${paidBilling.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Payment Methods</h4>
                    <div className="space-y-3">
                      {['cash', 'card', 'bank_transfer', 'online'].map(method => {
                        const methodPayments = paymentRecords.filter(p => p.paymentMethod === method);
                        const methodTotal = methodPayments.reduce((sum, p) => sum + p.amount, 0);
                        return (
                          <div key={method} className="flex justify-between">
                            <span className="text-sm text-gray-600 capitalize">{method.replace('_', ' ')}:</span>
                            <span className="text-sm font-medium text-gray-900">${methodTotal.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Create Billing Record</h3>
              <button
                onClick={() => setShowBillingModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateBilling} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                  <input
                    type="text"
                    value={billingForm.guestName}
                    onChange={(e) => setBillingForm({...billingForm, guestName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    value={billingForm.roomNumber}
                    onChange={(e) => setBillingForm({...billingForm, roomNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={billingForm.amount}
                    onChange={(e) => setBillingForm({...billingForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
                  <select
                    value={billingForm.type}
                    onChange={(e) => setBillingForm({...billingForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="room_charge">Room Charge</option>
                    <option value="service_fee">Service Fee</option>
                    <option value="amenity">Amenity</option>
                    <option value="penalty">Penalty</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={billingForm.description}
                    onChange={(e) => setBillingForm({...billingForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter billing description..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={billingForm.dueDate}
                    onChange={(e) => setBillingForm({...billingForm, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBillingModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreatePayment} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({...paymentForm, transactionId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter transaction ID (optional)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Add payment notes..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
