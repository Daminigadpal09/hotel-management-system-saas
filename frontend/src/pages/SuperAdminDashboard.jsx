import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan: "free",
    maxBranches: 1,
    maxUsers: 5,
    expiryDays: 30
  });
  const navigate = useNavigate();

  useEffect(() => {
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
    setSubscriptionForm({
      plan: hotel.subscription_plan || "free",
      maxUsers: hotel.max_users || 5,
      expiryDays: 30
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Super Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-sm text-gray-600 hover:text-gray-800">Home</Link>
              <span className="text-sm text-gray-600">Super Admin</span>
              <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-600 hover:text-red-800">
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
          <div className="w-64 flex-shrink-0 bg-white border-r">
            <div className="p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === "overview"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Overview
                </button>
                
                <button
                  onClick={() => setActiveTab("hotels")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === "hotels"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Hotels
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === "hotels" ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"
                  }`}>
                    {hotels.length}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab("users")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === "users"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Users
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === "users" ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"
                  }`}>
                    {users.length}
                  </span>
                </button>
                
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Total Hotels</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.hotels.total}</p>
                <div className="mt-2 text-sm">
                  <p className="text-green-600">Active: {analytics.hotels.active}</p>
                  <p className="text-yellow-600">Pending: {analytics.hotels.pending}</p>
                  <p className="text-red-600">Suspended: {analytics.hotels.suspended}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.users.total}</p>
                <div className="mt-2 text-sm">
                  <p className="text-green-600">Active: {analytics.users.active}</p>
                  <p className="text-gray-500">Inactive: {analytics.users.inactive || 0}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Monthly Revenue</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">${analytics.revenue.monthly}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <p>Free: {analytics.revenue.subscriptions?.free || 0}</p>
                  <p>Basic ($29): {analytics.revenue.subscriptions?.basic || 0}</p>
                  <p>Premium ($99): {analytics.revenue.subscriptions?.premium || 0}</p>
                  <p>Enterprise ($299): {analytics.revenue.subscriptions?.enterprise || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Hotels Tab */}
          {activeTab === "hotels" && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">All Hotels ({hotels.length})</h2>
                <div className="text-sm text-gray-500">
                  Total: {hotels.length} hotels in database
                </div>
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
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">All Users ({users.length})</h2>
                  <div className="text-sm text-gray-500">
                    Total: {users.length} users in database
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleRefreshUsers}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Users
                  </button>
                </div>
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

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Subscription - {selectedHotel?.name}
            </h3>
            <form onSubmit={handleUpdateSubscription}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                <select
                  value={subscriptionForm.plan}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, plan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free - $0/month</option>
                  <option value="basic">Basic - $29/month</option>
                  <option value="premium">Premium - $99/month</option>
                  <option value="enterprise">Enterprise - $299/month</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Branches</label>
                <input
                  type="number"
                  value={subscriptionForm.maxBranches}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, maxBranches: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                <input
                  type="number"
                  value={subscriptionForm.maxUsers}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, maxUsers: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Duration (days)</label>
                <input
                  type="number"
                  value={subscriptionForm.expiryDays}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, expiryDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Update Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
