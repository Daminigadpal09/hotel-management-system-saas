import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hotelAPI, userAPI, branchAPI, roomAPI, bookingAPI } from "../services/api.js";

export default function HotelOwnerDashboard() {
  const [hotels, setHotels] = useState([]);
  const [hotelsWithRooms, setHotelsWithRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Room Management state
  const [showRoomManagement, setShowRoomManagement] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomNumber: "",
    category: "standard",
    type: "single",
    floor: 1,
    basePrice: 1000,
    capacity: 2,
    bedCount: 1,
    description: ""
  });
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const fetchHotels = async () => {
    try {
      console.log("DEBUG: Fetching hotels...");
      const data = await hotelAPI.getHotels();
      console.log("DEBUG: Hotels API response:", data);
      setHotels(data.data || []);
      console.log("DEBUG: Hotels set:", data.data || []);
      
      // Fetch rooms for each hotel
      const hotelsWithRoomData = await Promise.all(
        (data.data || []).map(async (hotel) => {
          try {
            // First get branches for this hotel
            const branchesResponse = await branchAPI.getBranches(hotel._id);
            const branches = branchesResponse.data || [];
            
            // Then get rooms for each branch
            let allRooms = [];
            if (branches.length > 0) {
              const roomsPromises = branches.map(branch => 
                roomAPI.getRooms(hotel._id, branch._id).catch(() => ({ data: [] }))
              );
              const roomsResponses = await Promise.all(roomsPromises);
              allRooms = roomsResponses.flatMap(response => response.data || []);
            }
            
            const totalRooms = allRooms.length;
            const availableRooms = allRooms.filter(r => r.status === 'available').length;
            return { ...hotel, totalRooms, availableRooms, branches: branches.length };
          } catch {
            return { ...hotel, totalRooms: 0, availableRooms: 0, branches: 0 };
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

  const fetchBookings = async () => {
    try {
      const data = await bookingAPI.getBookings();
      setBookings(data.data || data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  useEffect(() => {
    fetchHotels();
    fetchBookings();
  }, []);

  // Room Management functions
  const fetchBranches = async (hotelId) => {
    try {
      const data = await branchAPI.getBranches(hotelId);
      setBranches(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedBranch(data.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchRooms = async () => {
    if (!selectedBranch) return;
    
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const hotelId = hotels[0]?._id || user.hotel_id;
      
      if (!hotelId) {
        setRooms([]);
        return;
      }
      
      const data = await roomAPI.getRooms(hotelId, selectedBranch);
      setRooms(data.data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    if (!roomForm.roomNumber || !roomForm.type || !roomForm.basePrice) {
      alert("Please fill all required fields");
      return;
    }
    
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const hotelId = hotels[0]?._id || user.hotel_id;
      
      if (!hotelId || !selectedBranch) {
        alert("Please select both hotel and branch");
        return;
      }
      
      const roomData = {
        ...roomForm,
        basePrice: parseFloat(roomForm.basePrice),
        capacity: parseInt(roomForm.capacity),
        floor: parseInt(roomForm.floor),
        bedCount: parseInt(roomForm.bedCount)
      };
      
      await roomAPI.createRoom(hotelId, selectedBranch, roomData);
      alert("Room created successfully!");
      setShowAddRoom(false);
      setRoomForm({
        roomNumber: "",
        category: "standard",
        type: "single",
        floor: 1,
        basePrice: 1000,
        capacity: 2,
        bedCount: 1,
        description: ""
      });
      fetchRooms();
    } catch (error) {
      alert("Error creating room: " + error.message);
    }
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
              <h1 className="text-xl font-semibold text-gray-900">Hotel Owner Dashboard</h1>
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
              <Link
                to="/owner-dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  setShowRoomManagement(!showRoomManagement);
                  if (!showRoomManagement) {
                    // Initialize room management when opening
                    const user = JSON.parse(localStorage.getItem("user") || "{}");
                    const hotelId = hotels[0]?._id || user.hotel_id;
                    if (hotelId) {
                      fetchBranches(hotelId);
                    }
                  }
                }}
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                </svg>
                Room Management
              </Link>
              <Link
                to="/bookings"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                📅 Booking Management
              </Link>
              <Link
                to="/guests"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                👥 Guest Management
              </Link>
              <Link
                to="/billing"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 4.077a1 1 0 01-1.123.606l-2.257-4.077a1 1 0 01-.502-1.21L7.228 3.684A1 1 0 018.172 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5z" />
                </svg>
                💰 Billing & Payments
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">System</h3>
              <Link
                to="/"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
                  <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{bookings.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Checked In</h3>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {bookings.filter(b => b.status === 'CHECKED_IN').length}
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
                    <p className="text-gray-500">Contact administrator to add hotels to your account.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 gap-4 p-6">
                      {hotelsWithRooms.map((hotel) => (
                        <div key={hotel?._id || `hotel-${hotel?.name || 'unknown'}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">{hotel?.name || 'Unknown Hotel'}</h4>
                              <p className="text-sm text-gray-500">{hotel.email}</p>
                              <p className="text-xs text-gray-400 mt-1">{hotel?.address}</p>
                              <p className="text-xs text-gray-400">{hotel?.city}, {hotel?.state}</p>
                              <p className="text-xs text-gray-400">{hotel?.phone}</p>
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
                              onClick={() => {
                                console.log("Booking button clicked for hotel:", hotel?._id);
                                if (hotel?._id) {
                                  navigate(`/bookings/${hotel._id}`);
                                } else {
                                  console.error("No hotel ID found");
                                }
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 font-semibold"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              📅 Bookings
                            </button>
                            <button
                              onClick={() => navigate(`/guests/${hotel._id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              👥 Guests
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

            {/* Room Management Section */}
            {showRoomManagement && (
              <div className="bg-white rounded-lg shadow mt-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Room Management</h3>
                    <button
                      onClick={() => setShowRoomManagement(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Room Actions */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Rooms</h4>
                    <button
                      onClick={() => setShowAddRoom(!showAddRoom)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                    >
                      Add New Room
                    </button>
                  </div>

                  {/* Branch Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
                    <select
                      value={selectedBranch || ""}
                      onChange={(e) => {
                        setSelectedBranch(e.target.value);
                        fetchRooms();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a branch...</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Categories</option>
                        <option value="standard">Standard</option>
                        <option value="deluxe">Deluxe</option>
                        <option value="suite">Suite</option>
                        <option value="executive">Executive</option>
                        <option value="presidential">Presidential</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Types</option>
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="twin">Twin</option>
                        <option value="family">Family</option>
                        <option value="dormitory">Dormitory</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Status</option>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="cleaning">Cleaning</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Add Room Modal */}
                {showAddRoom && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                      <div className="px-6 py-4 border-b flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Add New Room</h3>
                        <button
                          onClick={() => setShowAddRoom(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <form onSubmit={handleCreateRoom} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
                            <input
                              type="text"
                              value={roomForm.roomNumber}
                              onChange={(e) => setRoomForm({...roomForm, roomNumber: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                              value={roomForm.category}
                              onChange={(e) => setRoomForm({...roomForm, category: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            >
                              <option value="standard">Standard</option>
                              <option value="deluxe">Deluxe</option>
                              <option value="suite">Suite</option>
                              <option value="executive">Executive</option>
                              <option value="presidential">Presidential</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Type *</label>
                            <select
                              value={roomForm.type}
                              onChange={(e) => setRoomForm({...roomForm, type: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            >
                              <option value="single">Single</option>
                              <option value="double">Double</option>
                              <option value="twin">Twin</option>
                              <option value="family">Family</option>
                              <option value="dormitory">Dormitory</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Floor *</label>
                            <input
                              type="number"
                              value={roomForm.floor}
                              onChange={(e) => setRoomForm({...roomForm, floor: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price *</label>
                            <input
                              type="number"
                              value={roomForm.basePrice}
                              onChange={(e) => setRoomForm({...roomForm, basePrice: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                            <input
                              type="number"
                              value={roomForm.capacity}
                              onChange={(e) => setRoomForm({...roomForm, capacity: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bed Count *</label>
                            <input
                              type="number"
                              value={roomForm.bedCount}
                              onChange={(e) => setRoomForm({...roomForm, bedCount: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                              value={roomForm.description}
                              onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                          <button
                            type="button"
                            onClick={() => setShowAddRoom(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                          >
                            Create Room
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Rooms List */}
                <div className="p-6">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Loading rooms...</div>
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
                      <p className="text-gray-500">Add your first room to get started.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rooms.map((room) => (
                        <div key={room._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-md font-medium text-gray-900">{room.roomNumber}</h4>
                              <p className="text-sm text-gray-500">{room.category} • {room.type}</p>
                            </div>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              room.status === 'available' ? 'bg-green-100 text-green-800' :
                              room.status === 'occupied' ? 'bg-red-100 text-red-800' :
                              room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {room.status}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Floor:</span>
                              <span className="font-medium">{room.floor}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Capacity:</span>
                              <span className="font-medium">{room.capacity} guests</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Price:</span>
                              <span className="font-medium">${room.basePrice}/night</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Beds:</span>
                              <span className="font-medium">{room.bedCount}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Bookings Section */}
            <div className="bg-white rounded-lg shadow mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
                  <Link
                    to="/bookings"
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    View All Bookings →
                  </Link>
                </div>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                  <p className="text-gray-500 mb-4">Start creating bookings to see them here.</p>
                  <Link
                    to="/bookings"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                  >
                    Create First Booking
                  </Link>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 gap-4 p-6">
                      {bookings.slice(0, 5).map((booking) => (
                        <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">{booking.guestName}</h4>
                                  <p className="text-sm text-gray-500">
                                    Room {booking.roomId?.roomNumber || booking.roomId} • {booking.roomId?.category || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                                <span>Check-in: {new Date(booking.checkIn).toLocaleDateString()}</span>
                                <span>Check-out: {new Date(booking.checkOut).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                booking.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                                booking.status === 'CHECKED_IN' ? 'bg-green-100 text-green-800' :
                                booking.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {booking.status}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                ${booking.totalAmount || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {bookings.length > 5 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Link
                        to="/bookings"
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View all {bookings.length} bookings →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
