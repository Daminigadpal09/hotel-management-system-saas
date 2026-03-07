import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [error, setError] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan: "basic",
    maxBranches: 2,
    maxUsers: 10,
    expiryDays: 30
  });
  const navigate = useNavigate();

  // Get user role from localStorage
  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : {};
  const userRole = userObj.role || localStorage.getItem("userRole");
  const isSuperAdmin = userRole === "super_admin";
  
  // Allow branch managers and owners to see the dashboard with limited access
  const canViewDashboard = isSuperAdmin || userRole === "branch_manager" || userRole === "owner";

  useEffect(() => {
    // Check if user can view dashboard
    if (!canViewDashboard) {
      setError("Access denied. Super Admin privileges required.");
      setLoading(false);
      return;
    }
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 Starting fetchAnalytics with token:', token ? 'Present' : 'Missing');
      
      const response = await fetch("http://localhost:5000/api/super-admin/analytics", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log('📊 Analytics API Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Analytics response:', data);
        console.log('📊 Analytics success:', data.success);
        console.log('📊 Analytics data structure:', data.data ? 'Present' : 'Missing');
        
        setAnalytics(data.data);
        
        // Extract data properly from analytics response
        const hotelsList = data.data?.hotels?.list || [];
        const usersList = data.data?.users?.list || [];
        
        console.log('📊 Extracted data:', {
          hotels: hotelsList.length,
          users: usersList.length
        });
        
        setHotels(hotelsList);
        setUsers(usersList);
        
        console.log('👥 Users set to state:', usersList.length);
        console.log('👥 Sample user:', usersList[0]);
        
        // If users are empty, try individual fetch
        if (usersList.length === 0) {
          console.log('⚠️ No users from analytics, trying individual fetch...');
          await fetchIndividualData();
        }
      } else {
        console.error('❌ Failed to fetch analytics:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        // Try to fetch individual data if analytics fails
        await fetchIndividualData();
      }
    } catch (error) {
      console.error("❌ Error fetching analytics:", error);
      // Fallback to individual API calls
      await fetchIndividualData();
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch hotels separately
      const hotelsResponse = await fetch("http://localhost:5000/api/super-admin/hotels", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (hotelsResponse.ok) {
        const hotelsData = await hotelsResponse.json();
        setHotels(hotelsData.data || []);
        console.log('Hotels loaded:', hotelsData.data?.length || 0);
      }
      
      // Fetch users separately
      console.log('👥 Fetching users from dedicated endpoint...');
      const usersResponse = await fetch("http://localhost:5000/api/super-admin/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      console.log('👥 Users API Response Status:', usersResponse.status);
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        console.log('👥 Users response:', usersData);
        console.log('👥 Users success:', usersData.success);
        console.log('👥 Users data length:', usersData.data?.length || 0);
        
        let usersList = usersData.data || [];
        
        // If no users found, add mock users for testing
        if (usersList.length === 0) {
          console.log('⚠️ No users found in database, adding mock users for testing');
          usersList = [
            {
              _id: '507f1f77bcf86cd799439001',
              name: 'John Smith',
              email: 'john.smith@hotel.com',
              role: 'owner',
              status: 'active',
              hotel_id: { _id: '507f1f77bcf86cd799439010', name: 'Grand Hotel' },
              branch_id: null,
              createdAt: new Date().toISOString()
            }
          ];
          console.log('🎭 Added mock users for testing:', usersList.length);
        }
        
        setUsers(usersList);
        console.log('👥 Users loaded from dedicated endpoint:', usersList.length);
        console.log('👥 Sample user:', usersList[0]);
      } else {
        console.error('❌ Failed to fetch users from dedicated endpoint:', usersResponse.status);
        const errorText = await usersResponse.text();
        console.error('❌ Error response:', errorText);
        
        // Try alternative endpoint
        try {
          console.log('🔄 Trying alternative users endpoint...');
          const altUsersResponse = await fetch("http://localhost:5000/api/users", {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          console.log('🔄 Alternative users API Response Status:', altUsersResponse.status);
          
          if (altUsersResponse.ok) {
            const altUsersData = await altUsersResponse.json();
            const usersList = altUsersData.data || altUsersData.users || [];
            setUsers(usersList);
            console.log('🔄 Users loaded from alternative endpoint:', usersList.length);
          } else {
            console.error('❌ Alternative endpoint also failed:', altUsersResponse.status);
            const altErrorText = await altUsersResponse.text();
            console.error('❌ Alternative error response:', altErrorText);
          }
        } catch (altError) {
          console.error('❌ Alternative users fetch failed:', altError);
        }
      }
      
    } catch (error) {
      console.error("Error fetching individual data:", error);
    }
  };

  const handleApproveHotel = async (hotelId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/super-admin/hotels/${hotelId}/approve`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("Hotel approved successfully!");
        fetchAnalytics();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to approve hotel");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSuspendHotel = async (hotelId) => {
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/super-admin/hotels/${hotelId}/suspend`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        alert("Hotel suspended successfully!");
        fetchAnalytics();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to suspend hotel");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const openSubscriptionModal = (hotel) => {
    setSelectedHotel(hotel);
    // Get the hotel's current subscription plan
    const currentPlan = hotel.subscription_plan || hotel.subscription?.plan || "free";
    const currentMaxBranches = hotel.max_branches || hotel.subscription?.maxBranches || 2;
    const currentMaxUsers = hotel.max_users || hotel.subscription?.maxUsers || 10;
    const currentExpiryDays = hotel.subscription?.expiryDays || 30;
    
    setSubscriptionForm({
      plan: currentPlan,
      maxBranches: currentMaxBranches,
      maxUsers: currentMaxUsers,
      expiryDays: currentExpiryDays
    });
    setShowSubscriptionModal(true);
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/super-admin/hotels/${selectedHotel._id}/subscription`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionForm),
      });

      if (response.ok) {
        alert("Subscription updated successfully!");
        setShowSubscriptionModal(false);
        fetchAnalytics();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update subscription");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const getPlanPrice = (plan) => {
    const prices = {
      free: "$0",
      basic: "$29/mo",
      premium: "$99/mo",
      enterprise: "$299/mo"
    };
    return prices[plan] || "$0";
  };

  const getPlanColor = (plan) => {
    const colors = {
      free: "bg-gray-100 text-gray-800",
      basic: "bg-blue-100 text-blue-800",
      premium: "bg-purple-100 text-purple-800",
      enterprise: "bg-yellow-100 text-yellow-800"
    };
    return colors[plan] || "bg-gray-100 text-gray-800";
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: "bg-red-100 text-red-800",
      owner: "bg-purple-100 text-purple-800",
      receptionist: "bg-green-100 text-green-800",
      housekeeping: "bg-yellow-100 text-yellow-800",
      accountant: "bg-indigo-100 text-indigo-800"
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleRefreshUsers = async () => {
    setLoading(true);
    await fetchIndividualData();
    setLoading(false);
  };

  const handleRefreshHotels = async () => {
    setLoading(true);
    await fetchIndividualData();
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/50 text-center border border-slate-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-amber-500/25"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Super Admin Dashboard</h1>
                <p className="text-xs text-slate-500">System management & control</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-slate-600 hover:text-slate-800 font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Home</Link>
              <span className="text-sm text-slate-500">|</span>
              <span className="text-sm font-medium text-slate-600 px-3 py-2 bg-slate-100 rounded-lg">Super Admin</span>
              <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex">
          {/* Vertical Navigation Sidebar */}
          <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200/50">
            <div className="p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === "overview"
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-l-2 border-amber-500"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${activeTab === "overview" ? 'bg-amber-500/20' : 'bg-slate-100'}`}>
                    <svg className={`w-5 h-5 ${activeTab === "overview" ? 'text-amber-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  Overview
                </button>
                
                <button
                  onClick={() => setActiveTab("hotels")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === "hotels"
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-l-2 border-amber-500"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${activeTab === "hotels" ? 'bg-amber-500/20' : 'bg-slate-100'}`}>
                      <svg className={`w-5 h-5 ${activeTab === "hotels" ? 'text-amber-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    Hotels
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    activeTab === "hotels" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {hotels.length}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab("users")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === "users"
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-l-2 border-amber-500"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${activeTab === "users" ? 'bg-amber-500/20' : 'bg-slate-100'}`}>
                      <svg className={`w-5 h-5 ${activeTab === "users" ? 'text-amber-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    Users
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    activeTab === "users" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {users.length}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === "subscriptions"
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-l-2 border-amber-500"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${activeTab === "subscriptions" ? 'bg-amber-500/20' : 'bg-slate-100'}`}>
                      <svg className={`w-5 h-5 ${activeTab === "subscriptions" ? 'text-amber-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    Subscriptions
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    activeTab === "subscriptions" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    SaaS
                  </span>
                </button>
                
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
          {/* Overview Tab */}
          {activeTab === "overview" && analytics && (
            <div className="space-y-6">
              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hotels</p>
                      <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">{analytics.hotels.total}</p>
                    </div>
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-medium">Active: {analytics.hotels.active}</span>
                      <span className="text-amber-600 font-medium">Pending: {analytics.hotels.pending}</span>
                      <span className="text-red-600 font-medium">Suspended: {analytics.hotels.suspended}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
                      <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">{analytics.users.total}</p>
                    </div>
                    <div className="w-11 h-11 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-medium">Active: {analytics.users.active}</span>
                      <span className="text-slate-500">Inactive: {analytics.users.inactive || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue</p>
                      <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">${analytics.revenue.monthly}</p>
                    </div>
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Free: {analytics.revenue.subscriptions?.free || 0}</span>
                      <span>Basic ($29): {analytics.revenue.subscriptions?.basic || 0}</span>
                      <span>Premium ($99): {analytics.revenue.subscriptions?.premium || 0}</span>
                      <span>Enterprise ($299): {analytics.revenue.subscriptions?.enterprise || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                      <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">${analytics.revenue.total}</p>
                    </div>
                    <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        +12% this month
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hotels Tab */}
          {activeTab === "hotels" && (
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">All Hotels</h2>
                    <p className="text-xs text-slate-500">{hotels.length} hotels in database</p>
                  </div>
                </div>
                <button
                  onClick={handleRefreshHotels}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-amber-500/25 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              {hotels.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">🏨</div>
                  <p className="text-gray-500">No hotels found in the database.</p>
                  <p className="text-sm text-gray-400 mt-1">Hotels will appear here when owners register them.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hotels.map((hotel) => (
                        <tr key={hotel._id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{hotel.name}</div>
                            <div className="text-sm text-gray-500">{hotel.email}</div>
                            <div className="text-sm text-gray-400">{hotel.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{hotel.owner_id?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{hotel.owner_id?.email || 'No email'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              hotel.status === 'active' ? 'bg-green-100 text-green-800' :
                              hotel.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {hotel.status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanColor(hotel.subscription_plan)}`}>
                              {hotel.subscription_plan || 'free'}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">{getPlanPrice(hotel.subscription_plan)}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(hotel.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {hotel.status === 'pending' && (
                              <button onClick={() => handleApproveHotel(hotel._id)} className="text-green-600 hover:text-green-900 mr-3">
                                Approve
                              </button>
                            )}
                            <button onClick={() => openSubscriptionModal(hotel)} className="text-blue-600 hover:text-blue-900 mr-3">
                              Plan
                            </button>
                            {hotel.status === 'active' && (
                              <button onClick={() => handleSuspendHotel(hotel._id)} className="text-red-600 hover:text-red-900">
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">All Users</h2>
                    <p className="text-xs text-slate-500">{users.length} users in database</p>
                  </div>
                </div>
                <button 
                  onClick={handleRefreshUsers}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-amber-500/25 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Users
                </button>
              </div>
              
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">👥</div>
                  <p className="text-gray-500">No users found in the database.</p>
                  <p className="text-sm text-gray-400 mt-1">Users will appear here when hotel owners register staff members.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name || 'Unknown'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{user.email || 'No email'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                              {user.role || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {user.hotel_id?.name || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

          {/* Subscriptions Tab - SaaS Management */}
          {activeTab === "subscriptions" && (
            <div className="space-y-6">
              {/* SaaS Overview */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Subscription Management (SaaS)</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage pricing plans, trials, and subscriptions for hotel clients</p>
                  </div>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Plan
                  </button>
                </div>

                {/* Subscription Modal - Inline */}
                {showSubscriptionModal && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                        <h3 className="text-lg font-bold text-white">
                          Update Subscription
                        </h3>
                        <p className="text-amber-100 text-sm">{selectedHotel?.name}</p>
                      </div>
                      <form onSubmit={handleUpdateSubscription} className="p-6">
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Subscription Plan</label>
                          <select
                            value={subscriptionForm.plan}
                            onChange={(e) => setSubscriptionForm({ ...subscriptionForm, plan: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          >
                            <option value="free">Free - $0/month</option>
                            <option value="basic">Standard - $29/month</option>
                            <option value="premium">Premium - $99/month</option>
                            <option value="enterprise">Enterprise - $299/month</option>
                          </select>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Max Branches</label>
                          <input
                            type="number"
                            value={subscriptionForm.maxBranches}
                            onChange={(e) => setSubscriptionForm({ ...subscriptionForm, maxBranches: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Max Users</label>
                          <input
                            type="number"
                            value={subscriptionForm.maxUsers}
                            onChange={(e) => setSubscriptionForm({ ...subscriptionForm, maxUsers: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Subscription Duration (days)</label>
                          <input
                            type="number"
                            value={subscriptionForm.expiryDays}
                            onChange={(e) => setSubscriptionForm({ ...subscriptionForm, expiryDays: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setShowSubscriptionModal(false)}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button type="submit" className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25">
                            Update Subscription
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Subscription Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                    <p className="text-xs font-medium text-green-100 uppercase">Active Subscriptions</p>
                    <p className="text-2xl font-bold mt-1">{hotels.filter(h => h.status === 'active').length}</p>
                    <p className="text-xs text-green-200 mt-1">Hotels</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
                    <p className="text-xs font-medium text-yellow-100 uppercase">Trial Period</p>
                    <p className="text-2xl font-bold mt-1">{hotels.filter(h => h.subscription?.trialUsed).length}</p>
                    <p className="text-xs text-yellow-200 mt-1">On Trial</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
                    <p className="text-xs font-medium text-red-100 uppercase">Expiring Soon</p>
                    <p className="text-2xl font-bold mt-1">0</p>
                    <p className="text-xs text-red-200 mt-1">Within 7 days</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <p className="text-xs font-medium text-blue-100 uppercase">MRR</p>
                    <p className="text-2xl font-bold mt-1">$0</p>
                    <p className="text-xs text-blue-200 mt-1">Monthly Revenue</p>
                  </div>
                </div>

                {/* Pricing Plans Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Plans</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Trial Plan */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Free Trial</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Optional</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">Free<span className="text-sm font-normal text-gray-500">/forever</span></p>
                      <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>1 Branch</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>5 Users</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>10 Rooms</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>14 Days Trial</li>
                      </ul>
                    </div>

                    {/* Monthly Plan */}
                    <div className="border-2 border-blue-500 rounded-lg p-4 relative">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-3 py-1 text-xs rounded-full">Popular</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Monthly</h4>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">Recurring</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">$99<span className="text-sm font-normal text-gray-500">/month</span></p>
                      <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Unlimited Branches</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Unlimited Users</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Unlimited Rooms</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Billing Included</li>
                      </ul>
                    </div>

                    {/* Yearly Plan */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Yearly</h4>
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded">Best Value</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">$990<span className="text-sm font-normal text-gray-500">/year</span></p>
                      <p className="text-xs text-green-600 mt-1">Save $198 (17%)</p>
                      <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Unlimited Branches</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Unlimited Users</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Unlimited Rooms</li>
                        <li className="flex items-center"><svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Priority Support</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Room-based Pricing */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Room-Based Pricing Tiers</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rooms</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yearly Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">Starter</td>
                          <td className="px-4 py-3 text-sm text-gray-500">1-10 rooms</td>
                          <td className="px-4 py-3 text-sm text-gray-900">$29/month</td>
                          <td className="px-4 py-3 text-sm text-gray-900">$290/year</td>
                          <td className="px-4 py-3 text-sm text-gray-500">Basic features</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">Standard</td>
                          <td className="px-4 py-3 text-sm text-gray-500">11-50 rooms</td>
                          <td className="px-4 py-3 text-sm text-gray-900">$79/month</td>
                          <td className="px-4 py-3 text-sm text-gray-900">$790/year</td>
                          <td className="px-4 py-3 text-sm text-gray-500">All features</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">Premium</td>
                          <td className="px-4 py-3 text-sm text-gray-500">51-100 rooms</td>
                          <td className="px-4 py-3 text-sm text-gray-900">$149/month</td>
                          <td className="px-4 py-3 text-sm text-gray-900">$1,490/year</td>
                          <td className="px-4 py-3 text-sm text-gray-500">All + Priority support</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">Enterprise</td>
                          <td className="px-4 py-3 text-sm text-gray-500">100+ rooms</td>
                          <td className="px-4 py-3 text-sm text-gray-900">Custom</td>
                          <td className="px-4 py-3 text-sm text-gray-900">Custom</td>
                          <td className="px-4 py-3 text-sm text-gray-500">Custom solutions</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Branch-based Pricing */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch-Based Pricing Option</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h4 className="font-semibold text-blue-900">Per Branch Pricing</h4>
                      </div>
                      <p className="text-sm text-blue-700">$49/month per branch</p>
                      <p className="text-xs text-blue-600 mt-1">Ideal for hotel chains with multiple locations</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-6 h-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h4 className="font-semibold text-purple-900">Unlimited Branches</h4>
                      </div>
                      <p className="text-sm text-purple-700">$99/month flat rate</p>
                      <p className="text-xs text-purple-600 mt-1">Best value for growing hotel groups</p>
                    </div>
                  </div>
                </div>

                {/* Subscription Settings */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Trial Period</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">Enable optional trial period for new hotels</p>
                      <div className="mt-2">
                        <label className="text-xs text-gray-600">Trial Duration:</label>
                        <select className="ml-2 text-sm border border-gray-300 rounded px-2 py-1">
                          <option>7 days</option>
                          <option>14 days</option>
                          <option>30 days</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Auto Suspension</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">Automatically suspend expired subscriptions</p>
                      <div className="mt-2">
                        <label className="text-xs text-gray-600">Suspend after:</label>
                        <select className="ml-2 text-sm border border-gray-300 rounded px-2 py-1">
                          <option>1 day overdue</option>
                          <option>3 days overdue</option>
                          <option>7 days overdue</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Payment Gateway</h4>
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Integrated</span>
                      </div>
                      <p className="text-sm text-gray-500">Stripe/PayPal payment processing</p>
                      <div className="mt-3 flex gap-2">
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Stripe</span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">PayPal</span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Razorpay</span>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Renewal Tracking</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">Track and manage subscription renewals</p>
                      <div className="mt-2">
                        <label className="text-xs text-gray-600">Reminder:</label>
                        <select className="ml-2 text-sm border border-gray-300 rounded px-2 py-1">
                          <option>7 days before</option>
                          <option>14 days before</option>
                          <option>30 days before</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subscription Renewal Tracking Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Renewals</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {hotels.filter(h => h.status === 'active').slice(0, 5).map((hotel) => (
                          <tr key={hotel._id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{hotel.name || 'Unnamed Hotel'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{hotel.subscription?.plan || 'Free'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-sm">
                              <button className="text-blue-600 hover:text-blue-900 mr-2">Renew</button>
                              <button className="text-gray-600 hover:text-gray-900">Details</button>
                            </td>
                          </tr>
                        ))}
                        {hotels.filter(h => h.status === 'active').length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                              No active subscriptions to display
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}
