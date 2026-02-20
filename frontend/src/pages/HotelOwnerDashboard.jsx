import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hotelAPI, userAPI } from "../services/api.js";

export default function HotelOwnerDashboard() {
  const [hotels, setHotels] = useState([]);
  const [hotelsWithRooms, setHotelsWithRooms] = useState([]);
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // User management state
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  
  const [hotelForm, setHotelForm] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    gstNumber: ""
  });

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "branch_manager",
    hotel_id: "",
    branch_id: "",
    status: "active"
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const data = await hotelAPI.getHotels();
      setHotels(data.data);
      
      // Fetch rooms for each hotel
      const hotelsWithRoomData = await Promise.all(
        data.data.map(async (hotel) => {
          try {
            const roomsResponse = await hotelAPI.getHotelRooms(hotel._id);
            const rooms = roomsResponse.data || [];
            const totalRooms = rooms.length;
            const availableRooms = rooms.filter(r => r.status === 'available').length;
            return { ...hotel, totalRooms, availableRooms, branches: hotel.branches?.length || 0 };
          } catch (error) {
            return { ...hotel, totalRooms: 0, availableRooms: 0, branches: hotel.branches?.length || 0 };
          }
        })
      );
      setHotelsWithRooms(hotelsWithRoomData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      setLoading(false);
    }
  };

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    try {
      await hotelAPI.createHotel(hotelForm);
      alert("Hotel created successfully!");
      setShowAddHotel(false);
      setHotelForm({
        name: "",
        description: "",
        email: "",
        phone: "",
        address: "",
        gstNumber: ""
      });
      fetchHotels();
    } catch (error) {
      alert("Error creating hotel: " + error.message);
    }
  };

  const handleOpenUserManagement = async (hotelId, showAll = false) => {
    setSelectedHotelId(hotelId);
    setShowAllUsers(showAll);
    setShowUserManagement(true);
    setShowAddUser(false);
    setEditingUser(null);
    
    if (showAll) {
      await fetchAllUsers();
    } else if (hotelId) {
      await fetchUsers(hotelId);
    }
    
    // Fetch branches for the hotel
    if (hotelId && !showAll) {
      try {
        const branchesResponse = await hotelAPI.getBranches(hotelId);
        setBranches(branchesResponse.data || []);
      } catch (error) {
        console.error("Error fetching branches:", error);
        setBranches([]);
      }
    } else {
      setBranches([]);
    }
  };

  const fetchUsers = async (hotelId) => {
    try {
      const data = await userAPI.getUsers(hotelId);
      setUsers(data.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Fetch users from all hotels
      const allUsers = [];
      for (const hotel of hotels) {
        try {
          const data = await userAPI.getUsers(hotel._id);
          if (data.data) {
            allUsers.push(...data.data.map(u => ({ ...u, hotel_id: { _id: hotel._id, name: hotel.name } })));
          }
        } catch (error) {
          console.error(`Error fetching users for hotel ${hotel._id}:`, error);
        }
      }
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      setUsers([]);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const userData = {
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        branch_id: userForm.branch_id || null,
        status: userForm.status
      };
      
      const hotelId = showAllUsers ? userForm.hotel_id : selectedHotelId;
      if (!hotelId) {
        alert("Hotel ID is required");
        return;
      }
      
      const data = await userAPI.createUser(hotelId, userData);
      
      if (data) {
        alert("User created successfully!");
        setShowAddUser(false);
        setUserForm({
          name: "",
          email: "",
          password: "",
          role: "branch_manager",
          hotel_id: "",
          branch_id: "",
          status: "active"
        });
        
        if (showAllUsers) {
          await fetchAllUsers();
        } else {
          fetchUsers(selectedHotelId);
        }
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      const userData = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        branch_id: userForm.branch_id || null,
        status: userForm.status
      };
      
      // Use the user's hotel_id if available, otherwise use selectedHotelId
      const hotelId = editingUser.hotel_id?._id || selectedHotelId;
      if (!hotelId) {
        alert("Hotel ID not found for user");
        return;
      }
      
      const data = await userAPI.updateUser(hotelId, editingUser._id, userData);
      
      if (data) {
        alert("User updated successfully!");
        setEditingUser(null);
        setUserForm({
          name: "",
          email: "",
          password: "",
          role: "branch_manager",
          hotel_id: "",
          branch_id: "",
          status: "active"
        });
        
        if (showAllUsers) {
          await fetchAllUsers();
        } else {
          fetchUsers(selectedHotelId);
        }
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    
    try {
      // Find the user to get their hotel_id
      const userToDelete = users.find(u => u._id === userId);
      const hotelId = userToDelete?.hotel_id?._id || selectedHotelId;
      
      if (!hotelId) {
        alert("Hotel ID not found for user");
        return;
      }
      
      await userAPI.deleteUser(hotelId, userId);
      alert("User deleted successfully!");
      
      if (showAllUsers) {
        await fetchAllUsers();
      } else {
        fetchUsers(selectedHotelId);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      hotel_id: user.hotel_id?._id || "",
      branch_id: user.branch_id?._id || "",
      status: user.status || "active"
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Vertical Sidebar Navigation */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-gray-900">Owner Panel</h1>
              <p className="text-sm text-gray-500">{user.name}</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Main</h3>
              <Link
                to="/owner-dashboard"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 bg-indigo-50 text-indigo-700"
              >
                <svg className="mr-3 h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                </svg>
                Dashboard
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hotel Management</h3>
              <Link
                to="/owner-dashboard"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                My Hotels
              </Link>
              <button
                onClick={() => handleOpenUserManagement(null, true)}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Users
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <button
                onClick={() => setShowAddHotel(!showAddHotel)}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Hotel
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">System</h3>
              <Link
                to="/"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7-7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                </svg>
                Back to Home
              </Link>
              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:text-red-900 hover:bg-red-50"
              >
                <svg className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-900">Hotel Management Dashboard</h2>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <div className="flex items-center space-x-3 pl-4 border-l">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              {/* Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Hotels</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{hotels.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Active Hotels</h3>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {hotels.filter(h => h.status === 'active').length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Rooms</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {hotelsWithRooms.reduce((sum, hotel) => sum + hotel.totalRooms, 0)}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Available Rooms</h3>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {hotelsWithRooms.reduce((sum, hotel) => sum + hotel.availableRooms, 0)}
                  </p>
                </div>
              </div>

              {/* Hotels List */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">My Hotels</h3>
                    <button
                      onClick={() => setShowAddHotel(!showAddHotel)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                    >
                      + Add Hotel
                    </button>
                  </div>
                </div>

                {hotels.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hotels registered yet</h3>
                    <p className="text-gray-500 mb-4">Get started by adding your first hotel to manage your properties.</p>
                    <button
                      onClick={() => setShowAddHotel(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                    >
                      Add Your First Hotel
                    </button>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 gap-4 p-6">
                      {hotelsWithRooms.map((hotel) => (
                        <div key={hotel?._id || Math.random()} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">{hotel?.name || 'Unknown Hotel'}</h4>
                              <p className="text-sm text-gray-500">{hotel.email}</p>
                            </div>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              hotel.status === 'active' ? 'bg-green-100 text-green-800' :
                              hotel.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {hotel.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {hotel.branches} Branches
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7-7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                              </svg>
                              {hotel.totalRooms} Total Rooms
                            </div>
                            <div className="flex items-center text-sm text-green-600">
                              <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {hotel.availableRooms} Available
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 4.077a1 1 0 01-1.123.606l-2.257-4.077a1 1 0 01-.502-1.21L7.228 3.684A1 1 0 018.172 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5z" />
                              </svg>
                              {hotel.phone}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => hotel?._id && navigate(`/view-hotel/${hotel._id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            <button
                              onClick={() => hotel?._id && navigate(`/branches/${hotel._id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              Branches
                            </button>
                            <button
                              onClick={() => hotel?._id && navigate(`/hotel-rooms/${hotel._id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              Rooms
                            </button>
                            <button
                              onClick={() => hotel?._id && handleOpenUserManagement(hotel._id)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-purple-700 bg-purple-50 hover:bg-purple-100"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              Users
                            </button>
                            <button
                              onClick={() => navigate(`/edit-hotel/${hotel._id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-indigo-600 bg-indigo-600 hover:bg-indigo-700"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0l8.586 8.586a2 2 0 012.828 0l-8.586-8.586a2 2 0 00-2.828 0z" />
                              </svg>
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Hotel Modal */}
      {showAddHotel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add New Hotel</h3>
              <button
                onClick={() => setShowAddHotel(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateHotel} className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
                  <input
                    type="text"
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm({...hotelForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={hotelForm.description}
                    onChange={(e) => setHotelForm({...hotelForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={hotelForm.email}
                    onChange={(e) => setHotelForm({...hotelForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={hotelForm.phone}
                    onChange={(e) => setHotelForm({...hotelForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={hotelForm.address}
                    onChange={(e) => setHotelForm({...hotelForm, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    value={hotelForm.gstNumber}
                    onChange={(e) => setHotelForm({...hotelForm, gstNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
               
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  Create Hotel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddHotel(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <button
                onClick={() => {
                  setShowUserManagement(false);
                  setSelectedHotelId(null);
                  setShowAddUser(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
             
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  {showAllUsers ? "Manage all users in the system" : "Manage staff members for this hotel"}
                </p>
                <button
                  onClick={() => {
                    setShowAddUser(true);
                    setEditingUser(null);
                    setUserForm({
                      name: "",
                      email: "",
                      password: "",
                      role: "branch_manager",
                      hotel_id: "",
                      branch_id: "",
                      status: "active"
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  + Add User
                </button>
              </div>

              {/* Add/Edit User Form */}
              {(showAddUser || editingUser) && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    {editingUser ? "Edit User" : "Add New User"}
                  </h4>
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={userForm.name}
                          onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      {!editingUser && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <input
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required={!editingUser}
                          />
                        </div>
                      )}
                      {showAllUsers && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Hotel *</label>
                          <select
                            value={userForm.hotel_id || ""}
                            onChange={(e) => setUserForm({...userForm, hotel_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          >
                            <option value="">Select Hotel</option>
                            {hotels.map(hotel => (
                              <option key={hotel._id} value={hotel._id}>{hotel.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="branch_manager">Branch Manager</option>
                          <option value="receptionist">Receptionist</option>
                          <option value="housekeeping">Housekeeping</option>
                          <option value="accountant">Accountant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch (Optional)</label>
                        <select
                          value={userForm.branch_id}
                          onChange={(e) => setUserForm({...userForm, branch_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">No Branch</option>
                          {branches.map(branch => (
                            <option key={branch._id} value={branch._id}>{branch.name}</option>
                          ))}
                        </select>
                      </div>
                      {editingUser && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={userForm.status}
                            onChange={(e) => setUserForm({...userForm, status: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                      >
                        {editingUser ? "Update User" : "Create User"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddUser(false);
                          setEditingUser(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      {showAllUsers && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={showAllUsers ? 7 : 6} className="px-6 py-4 text-center text-sm text-gray-500">
                          No users found. Add your first user to get started.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role?.replace('_', ' ')}</td>
                          {showAllUsers && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.hotel_id?.name || '-'}</td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.branch_id?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
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
};
