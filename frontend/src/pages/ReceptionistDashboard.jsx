import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hotelAPI, branchAPI, roomAPI, bookingAPI, guestAPI } from "../services/api.js";

export default function ReceptionistDashboard() {
  const [hotels, setHotels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showBookingsPage, setShowBookingsPage] = useState(false);
  const [showRoomManagement, setShowRoomManagement] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(null);
  const [showCheckOutModal, setShowCheckOutModal] = useState(null);
  const [showRoomStatusModal, setShowRoomStatusModal] = useState(null);
  const [roomMgmtTab, setRoomMgmtTab] = useState('status'); // status, categories, inventory, pricing
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    checkIn: "",
    checkOut: "",
    roomId: "",
    adults: 1,
    children: 0,
    totalAmount: 0,
    paymentStatus: "pending",
    specialRequests: ""
  });

  const fetchData = async () => {
    try {
      console.log("DEBUG: Fetching data for receptionist...");
      
      // Get user's assigned hotel and branch
      const hotelId = user.hotel_id?._id || user.hotel_id || user.hotelId;
      const branchId = user.branch_id?._id || user.branch_id || user.branchId;
      
      console.log("DEBUG: User hotel/branch:", { hotelId, branchId });
      
      // If user has a specific hotel assigned, use that
      if (hotelId) {
        // Fetch hotel details
        const hotelsResponse = await hotelAPI.getHotels();
        const allHotels = hotelsResponse.data || [];
        const userHotel = allHotels.find(h => h._id === hotelId);
        if (userHotel) {
          setSelectedHotel(userHotel);
        }
        setHotels(allHotels);
        
        // Fetch branches for the hotel
        const branchesResponse = await hotelAPI.getBranches(hotelId);
        const hotelBranches = branchesResponse.data || [];
        setBranches(hotelBranches);
        
        // If user has specific branch, use that
        if (branchId) {
          const branch = hotelBranches.find(b => b._id === branchId);
          if (branch) {
            setSelectedBranch(branch);
          }
          
          // Fetch rooms for this branch
          const roomsResponse = await roomAPI.getRooms(hotelId, branchId);
          setRooms(roomsResponse.data || []);
        } else if (hotelBranches.length > 0) {
          // If no specific branch, use first branch
          setSelectedBranch(hotelBranches[0]);
          
          const roomsResponse = await roomAPI.getRooms(hotelId, hotelBranches[0]._id);
          setRooms(roomsResponse.data || []);
        }
        
        // Fetch bookings
        const bookingsResponse = await bookingAPI.getBookingsByHotel(hotelId);
        setBookings(bookingsResponse.data || bookingsResponse);
        
        // Fetch guests
        const guestsResponse = await guestAPI.getGuests(hotelId);
        setGuests(guestsResponse.data || guestsResponse);
      } else {
        // No specific hotel - fetch all hotels
        const hotelsResponse = await hotelAPI.getHotels();
        setHotels(hotelsResponse.data || []);
        
        // Fetch all bookings
        const bookingsResponse = await bookingAPI.getBookingsByHotel(hotelId);
        setBookings(bookingsResponse.data || bookingsResponse);
        
        // Fetch all branches for display
        const allBranchesResponse = await hotelAPI.getAllBranches();
        setAllBranches(allBranchesResponse.data || []);
        
        // If user has specific hotel, also fetch its branches
        if (hotelId) {
          const hotelBranches = allBranchesResponse.data?.filter(branch => 
            branch.hotel_id && branch.hotel_id._id?.toString() === hotelId
          ) || [];
          setBranches(hotelBranches);
          
          if (hotelBranches.length > 0) {
            setSelectedBranch(hotelBranches[0]);
            
            // Fetch rooms for this branch
            const roomsResponse = await roomAPI.getRooms(hotelId, hotelBranches[0]._id);
            setRooms(roomsResponse.data || []);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.hotel_id, user.branch_id]);

  const handleHotelChange = async (hotelId) => {
    try {
      const hotel = hotels.find(h => h._id === hotelId);
      setSelectedHotel(hotel);
      
      // Fetch all branches and filter by selected hotel
      const allBranchesResponse = await hotelAPI.getAllBranches();
      const allBranchesData = allBranchesResponse.data || [];
      const hotelBranches = allBranchesData.filter(branch => 
        branch.hotel_id && branch.hotel_id._id?.toString() === hotelId
      );
      setBranches(hotelBranches);
      
      console.log("DEBUG: Hotel branches found:", {
        hotelId,
        totalBranches: allBranchesData.length,
        hotelBranches: hotelBranches.length,
        branchCities: hotelBranches.map(b => ({ name: b.name, city: b.city }))
      });
      
      if (hotelBranches.length > 0) {
        setSelectedBranch(hotelBranches[0]);
        
        // Fetch rooms
        const roomsResponse = await roomAPI.getRooms(hotelId, hotelBranches[0]._id);
        setRooms(roomsResponse.data || []);
      }
      
      // Fetch bookings
      const bookingsResponse = await bookingAPI.getBookings(hotelId);
      setBookings(bookingsResponse.data || bookingsResponse);
      
      // Fetch guests
      const guestsResponse = await guestAPI.getGuests(hotelId);
      setGuests(guestsResponse.data || guestsResponse);
    } catch (error) {
      console.error("Error changing hotel:", error);
    }
  };

  const handleBranchChange = async (branchId) => {
    try {
      const branch = branches.find(b => b._id === branchId);
      setSelectedBranch(branch);
      
      if (selectedHotel) {
        const roomsResponse = await roomAPI.getRooms(selectedHotel._id, branchId);
        setRooms(roomsResponse.data || []);
      }
    } catch (error) {
      console.error("Error changing branch:", error);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      const bookingData = {
        ...bookingForm,
        hotelId: selectedHotel?._id,
        branchId: selectedBranch?._id,
        status: "BOOKED"
      };
      
      await bookingAPI.createBooking(bookingData);
      alert("Booking created successfully!");
      setShowNewBooking(false);
      setBookingForm({
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        checkIn: "",
        checkOut: "",
        roomId: "",
        adults: 1,
        children: 0,
        totalAmount: 0,
        paymentStatus: "pending",
        specialRequests: ""
      });
      fetchData();
    } catch (error) {
      alert("Error creating booking: " + error.message);
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      await bookingAPI.updateBooking(bookingId, { status: "CHECKED_IN" });
      alert("Guest checked in successfully!");
      setShowCheckInModal(null);
      fetchData();
    } catch (error) {
      alert("Error checking in: " + error.message);
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      await bookingAPI.updateBooking(bookingId, { status: "CHECKED_OUT" });
      alert("Guest checked out successfully!");
      setShowCheckOutModal(null);
      fetchData();
    } catch (error) {
      alert("Error checking out: " + error.message);
    }
  };

  const handleRoomStatusUpdate = async (roomId, newStatus) => {
    try {
      if (!selectedHotel || !selectedBranch) {
        alert("Please select a hotel and branch first");
        return;
      }
      await roomAPI.updateRoomStatus(selectedHotel._id, selectedBranch._id, roomId, newStatus);
      alert(`Room status updated to ${newStatus} successfully!`);
      setShowRoomStatusModal(null);
      fetchData();
    } catch (error) {
      alert("Error updating room status: " + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Filter bookings for today
  const today = new Date().toISOString().split('T')[0];
  const todaysCheckIns = bookings.filter(b => 
    b.status === "BOOKED" && b.checkIn?.split('T')[0] === today
  );
  const todaysCheckOuts = bookings.filter(b => 
    b.status === "CHECKED_IN" && b.checkOut?.split('T')[0] === today
  );
  
  const activeBookings = bookings.filter(b => b.status === "CHECKED_IN");
  const availableRooms = rooms.filter(r => r.status === "available");

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
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-gray-900">Receptionist</h1>
              <p className="text-sm text-gray-500">{user.name}</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Main</h3>
              <Link
                to="/receptionist-dashboard"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 bg-teal-50 text-teal-700"
              >
                <svg className="mr-3 h-5 w-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                </svg>
                Dashboard
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Operations</h3>
              <button
                onClick={() => setShowNewBooking(true)}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                📅 New Booking
              </button>
              <button
                onClick={() => {
                  setShowBookingsPage(true);
                  setShowNewBooking(false);
                }}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                All Bookings
              </button>
              <button
                onClick={() => {
                  setShowRoomManagement(true);
                  setShowBookingsPage(false);
                  setShowNewBooking(false);
                }}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                </svg>
                Room Status
              </button>
              <Link
                to="/billing"
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 4.077a1 1 0 01-1.123.606l-2.257-4.077a1 1 0 01-.502-1.21L7.228 3.684A1 1 0 018.172 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5z" />
                </svg>
                💰 Billing
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <button
                onClick={() => navigate("/bookings")}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Today's Tasks
              </button>
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
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">Receptionist Dashboard</h2>
                
                {/* Hotel Selector */}
                {hotels.length > 0 && (
                  <select
                    value={selectedHotel?._id || ""}
                    onChange={(e) => handleHotelChange(e.target.value)}
                    className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                <div className="flex items-center space-x-3 pl-4 border-l">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-teal-600">{user.name.charAt(0).toUpperCase()}</span>
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
              {/* Show Bookings Page */}
              {showBookingsPage ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">All Bookings ({bookings.length})</h3>
                    <button
                      onClick={() => setShowBookingsPage(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>
                  
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                      <p className="text-gray-500 mb-4">Start creating bookings to see them here.</p>
                      <button
                        onClick={() => {
                          setShowBookingsPage(false);
                          setShowNewBooking(true);
                        }}
                        className="px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
                      >
                        Create First Booking
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bookings.map((booking) => (
                            <tr key={booking._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-teal-600">
                                        {booking.guestName?.charAt(0).toUpperCase() || "?"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                                    <div className="text-sm text-gray-500">{booking.guestEmail || 'No email'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{booking.roomId?.roomNumber || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{booking.roomId?.category || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(booking.checkIn).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(booking.checkOut).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  booking.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                                  booking.status === 'CHECKED_IN' ? 'bg-green-100 text-green-800' :
                                  booking.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {booking.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${booking.totalAmount || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  {booking.status === 'BOOKED' && (
                                    <button
                                      onClick={() => setShowCheckInModal(booking)}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      Check In
                                    </button>
                                  )}
                                  {booking.status === 'CHECKED_IN' && (
                                    <button
                                      onClick={() => setShowCheckOutModal(booking)}
                                      className="text-orange-600 hover:text-orange-900"
                                    >
                                      Check Out
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : showRoomManagement ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Room Management - {selectedBranch?.name || 'All Rooms'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowRoomManagement(false);
                        setRoomMgmtTab('status');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>
                  
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                      <button
                        onClick={() => setRoomMgmtTab('status')}
                        className={`py-4 px-6 border-b-2 font-medium text-sm ${
                          roomMgmtTab === 'status'
                            ? 'border-teal-500 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Room Status
                      </button>
                      <button
                        onClick={() => setRoomMgmtTab('categories')}
                        className={`py-4 px-6 border-b-2 font-medium text-sm ${
                          roomMgmtTab === 'categories'
                            ? 'border-teal-500 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Categories
                      </button>
                      <button
                        onClick={() => setRoomMgmtTab('inventory')}
                        className={`py-4 px-6 border-b-2 font-medium text-sm ${
                          roomMgmtTab === 'inventory'
                            ? 'border-teal-500 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Inventory
                      </button>
                      <button
                        onClick={() => setRoomMgmtTab('pricing')}
                        className={`py-4 px-6 border-b-2 font-medium text-sm ${
                          roomMgmtTab === 'pricing'
                            ? 'border-teal-500 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Pricing
                      </button>
                    </nav>
                  </div>
                  
                  <div className="p-6">
                    {/* Room Status Tab */}
                    {roomMgmtTab === 'status' && (
                      <div>
                        {/* Status Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                              <span className="text-sm font-medium text-green-800">Available</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                              {rooms.filter(r => r.status === 'available').length}
                            </p>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                              <span className="text-sm font-medium text-red-800">Occupied</span>
                            </div>
                            <p className="text-2xl font-bold text-red-600 mt-1">
                              {rooms.filter(r => r.status === 'occupied').length}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                              <span className="text-sm font-medium text-blue-800">Cleaning</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-600 mt-1">
                              {rooms.filter(r => r.status === 'cleaning').length}
                            </p>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                              <span className="text-sm font-medium text-yellow-800">Maintenance</span>
                            </div>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">
                              {rooms.filter(r => r.status === 'maintenance' || r.status === 'out_of_order').length}
                            </p>
                          </div>
                        </div>
                        
                        {/* Room Status Grid */}
                        {rooms.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
                            <p className="text-gray-500">No rooms available for this branch.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {rooms.map(room => (
                              <div key={room._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900">Room {room.roomNumber}</h4>
                                    <p className="text-sm text-gray-500">{room.category} - {room.type}</p>
                                  </div>
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    room.status === 'available' ? 'bg-green-100 text-green-800' :
                                    room.status === 'occupied' ? 'bg-red-100 text-red-800' :
                                    room.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                                    room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {room.status === 'available' ? 'Available' :
                                     room.status === 'occupied' ? 'Occupied' :
                                     room.status === 'cleaning' ? 'Cleaning' :
                                     room.status === 'maintenance' ? 'Maintenance' :
                                     room.status === 'out_of_order' ? 'Out of Order' : room.status}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 mb-3">
                                  <p>Floor: {room.floor}</p>
                                  <p>Capacity: {room.capacity} guests</p>
                                  <p>Beds: {room.bedCount}</p>
                                </div>
                                <button
                                  onClick={() => setShowRoomStatusModal(room)}
                                  className="w-full mt-2 px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
                                >
                                  Update Status
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Room Categories Tab */}
                    {roomMgmtTab === 'categories' && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Room Categories per Branch</h4>
                        {(() => {
                          const categories = {};
                          rooms.forEach(room => {
                            if (!categories[room.category]) {
                              categories[room.category] = { total: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0 };
                            }
                            categories[room.category].total++;
                            if (room.status === 'available') categories[room.category].available++;
                            else if (room.status === 'occupied') categories[room.category].occupied++;
                            else if (room.status === 'maintenance' || room.status === 'out_of_order') categories[room.category].maintenance++;
                            else if (room.status === 'cleaning') categories[room.category].cleaning++;
                          });
                          
                          const categoryList = Object.entries(categories);
                          
                          return categoryList.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No room categories found</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Rooms</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupied</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaning</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {categoryList.map(([category, stats]) => (
                                    <tr key={category} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 capitalize">{category}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{stats.total}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                          {stats.available}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                          {stats.occupied}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                          {stats.cleaning}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                          {stats.maintenance}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* Room Inventory Tab */}
                    {roomMgmtTab === 'inventory' && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Room Inventory per Branch</h4>
                        {rooms.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No rooms found</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rooms.map(room => (
                              <div key={room._id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h5 className="text-md font-semibold text-gray-900">Room {room.roomNumber}</h5>
                                  <span className="text-xs text-gray-500 capitalize">{room.category}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Towels:</span>
                                    <span className="font-medium">{room.inventory?.towels || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Bedsheets:</span>
                                    <span className="font-medium">{room.inventory?.bedsheets || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Pillows:</span>
                                    <span className="font-medium">{room.inventory?.pillows || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Blankets:</span>
                                    <span className="font-medium">{room.inventory?.blankets || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Soap:</span>
                                    <span className="font-medium">{room.inventory?.soap || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Shampoo:</span>
                                    <span className="font-medium">{room.inventory?.shampoo || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Water Bottles:</span>
                                    <span className="font-medium">{room.inventory?.waterBottles || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Tea Bags:</span>
                                    <span className="font-medium">{room.inventory?.tea || 0}</span>
                                  </div>
                                </div>
                                {room.lastCleaned && (
                                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                    Last cleaned: {new Date(room.lastCleaned).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Inventory Summary */}
                        <div className="mt-8 bg-gray-50 rounded-lg p-4">
                          <h5 className="text-md font-semibold text-gray-900 mb-3">Total Inventory Summary</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                            {(() => {
                              const totals = { towels: 0, bedsheets: 0, pillows: 0, blankets: 0, soap: 0, shampoo: 0, waterBottles: 0, tea: 0 };
                              rooms.forEach(room => {
                                if (room.inventory) {
                                  Object.keys(totals).forEach(key => {
                                    totals[key] += room.inventory[key] || 0;
                                  });
                                }
                              });
                              return Object.entries(totals).map(([item, count]) => (
                                <div key={item} className="bg-white p-3 rounded border">
                                  <div className="text-gray-500 capitalize">{item.replace(/([A-Z])/g, ' $1').trim()}</div>
                                  <div className="text-lg font-bold text-gray-900">{count}</div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Pricing Tab */}
                    {roomMgmtTab === 'pricing' && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Pricing Setup per Branch</h4>
                        {rooms.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No rooms found</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekend Price</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Price</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {rooms.map(room => (
                                  <tr key={room._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">Room {room.roomNumber}</div>
                                      <div className="text-xs text-gray-500">Floor {room.floor}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 capitalize">
                                        {room.category}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                      {room.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-bold text-green-600">${room.basePrice}</div>
                                      <div className="text-xs text-gray-500">per night</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {room.weekendPrice ? `${room.weekendPrice}` : '-'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {room.holidayPrice ? `${room.holidayPrice}` : '-'}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Pricing Summary by Category */}
                        <div className="mt-8 bg-gray-50 rounded-lg p-4">
                          <h5 className="text-md font-semibold text-gray-900 mb-3">Pricing by Category</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(() => {
                              const categoryPricing = {};
                              rooms.forEach(room => {
                                if (!categoryPricing[room.category]) {
                                  categoryPricing[room.category] = { count: 0, minBase: room.basePrice, maxBase: room.basePrice, avgBase: 0 };
                                }
                                categoryPricing[room.category].count++;
                                categoryPricing[room.category].minBase = Math.min(categoryPricing[room.category].minBase, room.basePrice);
                                categoryPricing[room.category].maxBase = Math.max(categoryPricing[room.category].maxBase, room.basePrice);
                              });
                              
                              Object.keys(categoryPricing).forEach(cat => {
                                const catRooms = rooms.filter(r => r.category === cat);
                                const total = catRooms.reduce((sum, r) => sum + r.basePrice, 0);
                                categoryPricing[cat].avgBase = Math.round(total / catRooms.length);
                              });
                              
                              return Object.entries(categoryPricing).map(([category, pricing]) => (
                                <div key={category} className="bg-white p-4 rounded border">
                                  <div className="text-sm font-semibold text-gray-900 capitalize mb-2">{category}</div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">Rooms:</span>
                                      <span className="font-medium ml-1">{pricing.count}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Avg:</span>
                                      <span className="font-medium ml-1 text-green-600">${pricing.avgBase}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Min:</span>
                                      <span className="font-medium ml-1">${pricing.minBase}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Max:</span>
                                      <span className="font-medium ml-1">${pricing.maxBase}</span>
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Stats Section */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-sm font-medium text-gray-500">Today's Check-ins</h3>
                      <p className="text-2xl font-bold text-green-600 mt-2">{todaysCheckIns.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-sm font-medium text-gray-500">Today's Check-outs</h3>
                      <p className="text-2xl font-bold text-orange-600 mt-2">{todaysCheckOuts.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-sm font-medium text-gray-500">Active Guests</h3>
                      <p className="text-2xl font-bold text-blue-600 mt-2">{activeBookings.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-sm font-medium text-gray-500">Available Rooms</h3>
                      <p className="text-2xl font-bold text-green-600 mt-2">{availableRooms.length} / {rooms.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-sm font-medium text-gray-500">Total Guests</h3>
                      <p className="text-2xl font-bold text-purple-600 mt-2">{guests.length}</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <button
                      onClick={() => setShowNewBooking(true)}
                      className="bg-teal-600 hover:bg-teal-700 text-white p-6 rounded-lg shadow flex items-center justify-center"
                    >
                      <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-lg font-semibold">New Booking</span>
                    </button>
                    <button
                      onClick={() => {
                        console.log("DEBUG: View All Bookings quick action clicked, setting showBookingsPage to true");
                        console.log("DEBUG: Current bookings:", bookings);
                        setShowBookingsPage(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow flex items-center justify-center"
                    >
                      <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-lg font-semibold">View All Bookings</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowRoomManagement(true);
                        setShowBookingsPage(false);
                        setShowNewBooking(false);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow flex items-center justify-center"
                    >
                      <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                      </svg>
                      <span className="text-lg font-semibold">Room Status</span>
                    </button>
                  </div>

                  {/* Today's Tasks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Check-ins Today */}
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Check-ins Today ({todaysCheckIns.length})
                        </h3>
                      </div>
                      <div className="p-6">
                        {todaysCheckIns.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No check-ins scheduled for today</p>
                        ) : (
                          <div className="space-y-3">
                            {todaysCheckIns.map(booking => (
                              <div key={booking._id} className="flex items-center justify-between border rounded-lg p-3">
                                <div>
                                  <p className="font-medium text-gray-900">{booking.guestName}</p>
                                  <p className="text-sm text-gray-500">Room {booking.roomId?.roomNumber || 'N/A'} • {booking.adults} Adult(s)</p>
                                </div>
                                <button
                                  onClick={() => setShowCheckInModal(booking)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  Check In
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                </div>

                    {/* Check-outs Today */}
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Check-outs Today ({todaysCheckOuts.length})
                        </h3>
                      </div>
                      <div className="p-6">
                        {todaysCheckOuts.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No check-outs scheduled for today</p>
                        ) : (
                          <div className="space-y-3">
                            {todaysCheckOuts.map(booking => (
                              <div key={booking._id} className="flex items-center justify-between border rounded-lg p-3">
                                <div>
                                  <p className="font-medium text-gray-900">{booking.guestName}</p>
                                  <p className="text-sm text-gray-500">Room {booking.roomId?.roomNumber || 'N/A'} • {booking.adults} Adult(s)</p>
                                </div>
                                <button
                                  onClick={() => setShowCheckOutModal(booking)}
                                  className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                                >
                                  Check Out
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Bookings */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
                        <Link
                          to="/bookings"
                          className="text-sm text-teal-600 hover:text-teal-800"
                        >
                          View All Bookings →
                        </Link>
                      </div>
                    </div>
                    {bookings.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                        <p className="text-gray-500 mb-4">Start creating bookings to see them here.</p>
                        <button
                          onClick={() => setShowNewBooking(true)}
                          className="px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
                        >
                          Create First Booking
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <div className="grid grid-cols-1 gap-4 p-6">
                          {bookings.slice(0, 5).map((booking) => (
                            <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        {bookings.length > 5 && (
                          <div className="px-6 py-4 border-t border-gray-200">
                            <Link
                              to="/bookings"
                              className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                            >
                              View all {bookings.length} bookings →
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* All Hotels Section */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">All Hotels ({hotels.length})</h3>
                    </div>
                    {hotels.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                            </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hotels found</h3>
                        <p className="text-gray-500">There are no hotels in the system yet.</p>
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {hotels.map((hotel) => (
                            <div key={hotel._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900">{hotel.name}</h4>
                                    <p className="text-sm text-gray-500">Hotel ID: {hotel._id}</p>
                                  </div>
                                </div>
                                {selectedHotel?._id === hotel._id && (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                    Current
                                  </span>
                                )}
                            
                            {hotel.email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {hotel.email}
                              </div>
                            )}
                            
                            {hotel.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {hotel.phone}
                              </div>
                            )}
                            
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {hotel.branchCount || 0} Branch{hotel.branchCount !== 1 ? 'es' : ''}
                            </div>
                            
                            {/* Show branch cities */}
                            {(() => {
                              const hotelBranches = allBranches.filter(b => b.hotel_id?._id?.toString() === hotel._id);
                              const cities = [...new Set(hotelBranches.map(b => b.city))];
                              if (cities.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {cities.map(city => (
                                      <span 
                                        key={city}
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          city === 'Mumbai' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : city === 'Pune'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {city}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                              onClick={() => handleHotelChange(hotel._id)}
                              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                selectedHotel?._id === hotel._id
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {selectedHotel?._id === hotel._id ? 'Selected Hotel' : 'Select This Hotel'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* New Booking Modal */}
      {showNewBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Create New Booking</h3>
              <button
                onClick={() => setShowNewBooking(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateBooking} className="p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Booking ID:</label>
                  <div className="text-lg font-bold text-teal-600">
                    {showNewBooking ? 'AUTO-GENERATED' : 'N/A'}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Booking ID will be automatically assigned when you create the booking
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                  <input
                    type="text"
                    value={bookingForm.guestName}
                    onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={bookingForm.guestEmail}
                    onChange={(e) => setBookingForm({...bookingForm, guestEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={bookingForm.guestPhone}
                    onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
                  <select
                    value={bookingForm.roomId}
                    onChange={(e) => setBookingForm({...bookingForm, roomId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Room</option>
                    {availableRooms.map(room => (
                      <option key={room._id} value={room._id}>
                        Room {room.roomNumber} - {room.category} (${room.basePrice}/night)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    value={bookingForm.checkIn}
                    onChange={(e) => setBookingForm({...bookingForm, checkIn: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date *</label>
                  <input
                    type="date"
                    value={bookingForm.checkOut}
                    onChange={(e) => setBookingForm({...bookingForm, checkOut: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adults *</label>
                  <input
                    type="number"
                    min="1"
                    value={bookingForm.adults}
                    onChange={(e) => setBookingForm({...bookingForm, adults: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.children}
                    onChange={(e) => setBookingForm({...bookingForm, children: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                  <textarea
                    value={bookingForm.specialRequests}
                    onChange={(e) => setBookingForm({...bookingForm, specialRequests: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows={3}
                  />
                </div>
              </div>
               
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
                >
                  Create Booking
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewBooking(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-in Confirmation Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Confirm Check-in</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to check in <strong>{showCheckInModal.guestName}</strong>?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Room:</strong> {showCheckInModal.roomId?.roomNumber || 'N/A'}<br />
                  <strong>Check-in:</strong> {new Date(showCheckInModal.checkIn).toLocaleDateString()}<br />
                  <strong>Check-out:</strong> {new Date(showCheckInModal.checkOut).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckIn(showCheckInModal._id)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Confirm Check-in
                </button>
                <button
                  onClick={() => setShowCheckInModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Confirmation Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Confirm Check-out</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to check out <strong>{showCheckOutModal.guestName}</strong>?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Room:</strong> {showCheckOutModal.roomId?.roomNumber || 'N/A'}<br />
                  <strong>Check-in:</strong> {new Date(showCheckOutModal.checkIn).toLocaleDateString()}<br />
                  <strong>Check-out:</strong> {new Date(showCheckOutModal.checkOut).toLocaleDateString()}<br />
                  <strong>Total Amount:</strong> ${showCheckOutModal.totalAmount || 0}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckOut(showCheckOutModal._id)}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
                >
                  Confirm Check-out
                </button>
                <button
                  onClick={() => setShowCheckOutModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Status Update Modal */}
      {showRoomStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Update Room Status</h3>
              <button
                onClick={() => setShowRoomStatusModal(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Room:</strong> {showRoomStatusModal.roomNumber}<br />
                  <strong>Category:</strong> {showRoomStatusModal.category}<br />
                  <strong>Current Status:</strong> {' '}
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    showRoomStatusModal.status === 'available' ? 'bg-green-100 text-green-800' :
                    showRoomStatusModal.status === 'occupied' ? 'bg-red-100 text-red-800' :
                    showRoomStatusModal.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                    showRoomStatusModal.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {showRoomStatusModal.status === 'available' ? 'Available' :
                     showRoomStatusModal.status === 'occupied' ? 'Occupied' :
                     showRoomStatusModal.status === 'cleaning' ? 'Cleaning' :
                     showRoomStatusModal.status === 'maintenance' ? 'Maintenance' :
                     showRoomStatusModal.status === 'out_of_order' ? 'Out of Order' : showRoomStatusModal.status}
                  </span>
                </p>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">Select new status:</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleRoomStatusUpdate(showRoomStatusModal._id, 'available')}
                  disabled={showRoomStatusModal.status === 'available'}
                  className={`w-full p-3 rounded-lg border-2 flex items-center justify-between ${
                    showRoomStatusModal.status === 'available'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Available</span>
                  </div>
                  {showRoomStatusModal.status === 'available' && (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={() => handleRoomStatusUpdate(showRoomStatusModal._id, 'occupied')}
                  disabled={showRoomStatusModal.status === 'occupied'}
                  className={`w-full p-3 rounded-lg border-2 flex items-center justify-between ${
                    showRoomStatusModal.status === 'occupied'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Occupied</span>
                  </div>
                  {showRoomStatusModal.status === 'occupied' && (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={() => handleRoomStatusUpdate(showRoomStatusModal._id, 'cleaning')}
                  disabled={showRoomStatusModal.status === 'cleaning'}
                  className={`w-full p-3 rounded-lg border-2 flex items-center justify-between ${
                    showRoomStatusModal.status === 'cleaning'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Cleaning</span>
                  </div>
                  {showRoomStatusModal.status === 'cleaning' && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={() => handleRoomStatusUpdate(showRoomStatusModal._id, 'maintenance')}
                  disabled={showRoomStatusModal.status === 'maintenance'}
                  className={`w-full p-3 rounded-lg border-2 flex items-center justify-between ${
                    showRoomStatusModal.status === 'maintenance'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Maintenance</span>
                  </div>
                  {showRoomStatusModal.status === 'maintenance' && (
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={() => handleRoomStatusUpdate(showRoomStatusModal._id, 'out_of_order')}
                  disabled={showRoomStatusModal.status === 'out_of_order'}
                  className={`w-full p-3 rounded-lg border-2 flex items-center justify-between ${
                    showRoomStatusModal.status === 'out_of_order'
                      ? 'border-gray-500 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-500 rounded-full mr-3"></div>
                    <span className="font-medium text-gray-900">Out of Order</span>
                  </div>
                  {showRoomStatusModal.status === 'out_of_order' && (
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowRoomStatusModal(null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

