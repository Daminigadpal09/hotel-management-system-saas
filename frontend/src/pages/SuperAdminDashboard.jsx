import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
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
      const response = await fetch("http://localhost:5000/api/super-admin/analytics", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
        setHotels(data.data.hotels.list || []);
        setUsers(data.data.users.list || []);
        setBranches(data.data.branches.list || []);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
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
      maxBranches: hotel.max_branches || 1,
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
      branch_manager: "bg-blue-100 text-blue-800",
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
                
                <button
                  onClick={() => setActiveTab("branches")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === "branches"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Branches
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === "branches" ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"
                  }`}>
                    {branches.length}
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
                <h3 className="text-sm font-medium text-gray-500">Total Branches</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.branches.total}</p>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Hotels</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branches/Users</th>
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
                          <div className="text-sm text-gray-900">{hotel.owner_id?.name}</div>
                          <div className="text-sm text-gray-500">{hotel.owner_id?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            hotel.status === 'active' ? 'bg-green-100 text-green-800' :
                            hotel.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {hotel.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanColor(hotel.subscription_plan)}`}>
                            {hotel.subscription_plan || 'free'}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">{getPlanPrice(hotel.subscription_plan)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Max: {hotel.max_branches || 1} branches<br/>
                          Max: {hotel.max_users || 5} users
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
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Users</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.hotel_id?.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.branch_id?.name || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Branches Tab */}
          {activeTab === "branches" && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Branches</h2>
              {branches.length === 0 ? (
                <p className="text-gray-500">No branches found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {branches.map((branch) => (
                        <tr key={branch._id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{branch.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {branch.hotel_id?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {branch.address || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {branch.phone || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(branch.createdAt).toLocaleDateString()}
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
      </main>
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
