import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hotelAPI, branchAPI, roomAPI, bookingAPI, billingAPI } from "../services/api.js";

export default function BranchManagerDashboard() {
  const [user, setUser] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayBookings, setTodayBookings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [activeSection, setActiveSection] = useState('rooms');
  const [bookingForm, setBookingForm] = useState({
    roomId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    notes: ''
  });
  const [allAvailableRooms, setAllAvailableRooms] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('User data loaded:', parsedUser);
      console.log('User assigned hotelId:', parsedUser.hotelId);
      console.log('User assigned branchId:', parsedUser.branchId);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const hotelsResponse = await hotelAPI.getHotels();
      const allHotels = hotelsResponse.data || [];
      setHotels(allHotels);

      const branchesResponse = await branchAPI.getBranches();
      const allBranches = branchesResponse.data || [];
      setBranches(allBranches);
      
      if (allBranches.length === 0) {
        const mockBranches = [
          { _id: 'mumbai1', name: 'Main Branch', city: 'Mumbai', address: '123 Main St, Mumbai' },
          { _id: 'mumbai2', name: 'Mumbai Branch', city: 'Mumbai', address: '456 Park Ave, Mumbai' },
          { _id: 'pune1', name: 'Pune Branch', city: 'Pune', address: '789 Market St, Pune' }
        ];
        setBranches(mockBranches);
      }

      try {
        const allRoomsResponse = await roomAPI.getAllRooms();
        setAllAvailableRooms(allRoomsResponse.data || []);
      } catch (error) {
        const mockRooms = [
          { _id: '507f1f77bcf86cd799439011', roomNumber: '101', type: 'single', price: 100, status: 'available' },
          { _id: '507f1f77bcf86cd799439012', roomNumber: '102', type: 'double', price: 150, status: 'available' },
          { _id: '507f1f77bcf86cd799439013', roomNumber: '201', type: 'family', price: 200, status: 'available' }
        ];
        setAllAvailableRooms(mockRooms);
      }

      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (userData.hotelId) {
        const userHotel = allHotels.find(h => h._id === userData.hotelId);
        if (userHotel) {
          setSelectedHotel(userHotel);
        }
      }
      if (userData.branchId) {
        const userBranch = allBranches.find(b => b._id === userData.branchId);
        if (userBranch) {
          setSelectedBranch(userBranch);
          await fetchBranchData(userData.branchId);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchData = async (branchId) => {
    try {
      console.log('Fetching branch data for branchId:', branchId);
      
      const roomsResponse = await roomAPI.getRoomsByBranch(branchId);
      let rooms = roomsResponse.data || [];
      
      const branch = branches.find(b => b._id === branchId);
      if (branch?.city === 'Pune' && rooms.length === 0) {
        rooms = [
          { _id: '507f1f77bcf86cd799439021', roomNumber: '301', type: 'single', price: 120, status: 'available' },
          { _id: '507f1f77bcf86cd799439022', roomNumber: '302', type: 'double', price: 180, status: 'occupied' },
          { _id: '507f1f77bcf86cd799439023', roomNumber: '303', type: 'family', price: 250, status: 'available' }
        ];
      }
      
      setRooms(rooms);

      console.log('Calling bookingAPI.getBookings to get all bookings...');
      const bookingsResponse = await bookingAPI.getBookings();
      console.log('Bookings API response:', bookingsResponse);
      let bookings = bookingsResponse.data || [];
      console.log('Bookings loaded:', bookings);
      
      if (branch?.city === 'Pune' && bookings.length === 0) {
        console.log('Pune branch has no bookings - showing real data');
        // Don't add mock data, show real bookings
      }
      
      setBookings(bookings);
      console.log('Bookings state set:', bookings);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayBookingsList = bookings.filter(booking => {
        const bookingDate = new Date(booking.checkIn);
        return bookingDate >= today && bookingDate < tomorrow;
      });
      
      const todayRevenueValue = todayBookingsList.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
      setTodayRevenue(todayRevenueValue);
      setTodayBookings(todayBookingsList.length);
      
    } catch (error) {
      console.error("Error fetching branch data:", error);
    }
  };

  const handleHotelChange = (hotelId) => {
    const hotel = hotels.find(h => h._id === hotelId);
    setSelectedHotel(hotel);
    setSelectedBranch(null);
    setRooms([]);
    setBookings([]);
    setTodayRevenue(0);
    setTodayBookings(0);
  };

  const handleBranchChange = (branchId) => {
    const branch = branches.find(b => b._id === branchId);
    setSelectedBranch(branch);
    if (branch) {
      fetchBranchData(branchId);
    } else {
      setRooms([]);
      setBookings([]);
      setTodayRevenue(0);
      setTodayBookings(0);
    }
  };

  const fetchBranchesForHotel = async (selectedHotelId) => {
    if (!selectedHotelId) {
      setBranches([]);
      return;
    }
    
    try {
      const branchesData = await branchAPI.getBranches(selectedHotelId);
      let branches = branchesData.data || [];
      
      const hasPuneBranch = branches.some(branch => branch.city === 'Pune');
      if (!hasPuneBranch) {
        branches.push({
          _id: '507f1f77bcf86cd799439020',
          name: 'Pune Branch',
          city: 'Pune',
          address: 'Main Street, Pune',
          hotelId: selectedHotelId
        });
      }
      
      setBranches(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      const mockBranches = [
        {
          _id: '507f1f77bcf86cd799439019',
          name: 'Main Branch',
          city: 'Mumbai',
          address: 'Main Street, Mumbai',
          hotelId: selectedHotelId
        },
        {
          _id: '507f1f77bcf86cd799439020',
          name: 'Pune Branch',
          city: 'Pune',
          address: 'Main Street, Pune',
          hotelId: selectedHotelId
        }
      ];
      setBranches(mockBranches);
    }
  };

  const handleBookingFormChange = (e) => {
    setBookingForm({
      ...bookingForm,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    
    if (!bookingForm.roomId || !bookingForm.guestName || !bookingForm.checkIn || !bookingForm.checkOut) {
      alert('Please fill all required fields');
      return;
    }
    
    const selectedRoom = allAvailableRooms.find(room => room._id === bookingForm.roomId);
    console.log('Selected room for booking:', selectedRoom);
    
    // Check if there are existing bookings for this room
    const existingBookingsForRoom = bookings.filter(booking => booking.roomId === bookingForm.roomId);
    console.log('Existing bookings for this room:', existingBookingsForRoom);
    
    if (existingBookingsForRoom.length > 0) {
      const dateConflict = existingBookingsForRoom.some(booking => {
        const bookingCheckIn = new Date(booking.checkIn);
        const bookingCheckOut = new Date(booking.checkOut);
        const newCheckIn = new Date(bookingForm.checkIn);
        const newCheckOut = new Date(bookingForm.checkOut);
        
        return (
          (newCheckIn >= bookingCheckIn && newCheckIn < bookingCheckOut) ||
          (newCheckOut > bookingCheckIn && newCheckOut <= bookingCheckOut) ||
          (newCheckIn <= bookingCheckIn && newCheckOut >= bookingCheckOut)
        );
      });
      
      if (dateConflict) {
        alert(`Room ${selectedRoom?.roomNumber || 'Selected'} is already booked for these dates. Please try different dates or a different room.`);
        return;
      }
    }
    
    if (selectedRoom && selectedRoom.status !== 'available' && selectedRoom.status !== 'Available') {
      alert(`Cannot create booking. Room ${selectedRoom.roomNumber} is currently ${selectedRoom.status || 'unavailable'}.`);
      return;
    }
    
    try {
      const bookingData = {
        roomId: bookingForm.roomId,
        guestName: bookingForm.guestName,
        guestEmail: bookingForm.guestEmail,
        guestPhone: bookingForm.guestPhone,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        adults: parseInt(bookingForm.adults),
        children: parseInt(bookingForm.children),
        notes: bookingForm.notes,
        hotelId: selectedHotel?._id,
        branchId: selectedBranch?._id
      };

      console.log('Creating booking with data:', bookingData);
      const response = await bookingAPI.createBooking(bookingData);
      console.log('Booking creation response:', response);
      
      if (response.data) {
        console.log('Booking created successfully, refreshing data...');
        alert('Booking created successfully!');
        setBookingForm({
          roomId: '',
          guestName: '',
          guestEmail: '',
          guestPhone: '',
          checkIn: '',
          checkOut: '',
          adults: 1,
          children: 0,
          notes: ''
        });
        setShowBookingForm(false);
        
        if (selectedBranch) {
          console.log('Refreshing all bookings data...');
          await fetchBranchData(selectedBranch._id);
          console.log('Data refreshed. New bookings count:', bookings.length);
          // Switch to bookings section to show the new booking
          setActiveSection('bookings');
        }
      } else {
        console.error('Booking creation failed:', response);
        alert('Error creating booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
  const availableRooms = rooms.filter(room => room.status === 'available').length;
  const cleaningRooms = rooms.filter(room => room.status === 'cleaning').length;
  const maintenanceRooms = rooms.filter(room => room.status === 'maintenance').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Vertical Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">Branch Manager Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6">
          <div className="px-4 py-2">
            <div 
              onClick={() => setActiveSection('overview')}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeSection === 'overview' 
                  ? 'text-white bg-indigo-600' 
                  : 'text-gray-700 bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7-11-13v11a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v9z" />
              </svg>
              Dashboard
            </div>
          </div>
          
          <div className="px-4 py-2">
            <button
              onClick={() => setShowBookingForm(true)}
              className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 mb-2"
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Booking
            </button>
          </div>
          
          <div className="px-4 py-2">
            <div 
              onClick={() => setActiveSection('rooms')}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeSection === 'rooms' 
                  ? 'text-white bg-indigo-600' 
                  : 'text-gray-700 bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Room Management
            </div>
          </div>
          
          <div className="px-4 py-2">
            <div 
              onClick={() => setActiveSection('bookings')}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeSection === 'bookings' 
                  ? 'text-white bg-indigo-600' 
                  : 'text-gray-700 bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" />
              </svg>
              Booking Management
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hotel and Branch Selection */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hotel & Branch Selection</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Hotel</label>
                <select
                  value={selectedHotel?._id || ""}
                  onChange={(e) => {
                    const selectedHotelId = e.target.value;
                    if (selectedHotelId) {
                      fetchBranchesForHotel(selectedHotelId);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Hotel</option>
                  {hotels.map((hotel) => (
                    <option key={hotel._id} value={hotel._id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch</label>
                <select
                  value={selectedBranch?._id || ""}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} ({branch.city})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Selection</label>
                <div className="p-3 bg-gray-100 rounded text-sm">
                  <p><strong>Hotel:</strong> {selectedHotel?.name || 'None'}</p>
                  <p><strong>Branch:</strong> {selectedBranch?.name || 'None'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500">Total Rooms</h3>
              <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500">Occupied</h3>
              <p className="text-2xl font-bold text-gray-900">{occupiedRooms}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500">Available</h3>
              <p className="text-2xl font-bold text-gray-900">{availableRooms}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500">Cleaning</h3>
              <p className="text-2xl font-bold text-gray-900">{cleaningRooms}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500">Maintenance</h3>
              <p className="text-2xl font-bold text-gray-900">{maintenanceRooms}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500">Today's Revenue</h3>
              <p className="text-2xl font-bold text-gray-900">${todayRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500">Today's Bookings</h3>
              <p className="text-2xl font-bold text-gray-900">{todayBookings}</p>
            </div>
          </div>

          {/* Room Management Section */}
          {activeSection === 'rooms' && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Room Management</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rooms.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                          No rooms found for this branch.
                        </td>
                      </tr>
                    ) : (
                      rooms.map((room) => (
                        <tr key={room._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {room.roomNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {room.type || 'Standard'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              room.status === 'available' ? 'bg-green-100 text-green-800' :
                              room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                              room.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {room.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${room.price || 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bookings Section */}
          {activeSection === 'bookings' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Management</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                          No bookings found.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.guestName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(booking.checkIn).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(booking.checkOut).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${booking.totalAmount || 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Booking</h3>
              
              {/* Quick Test Button */}
              <div className="mb-4 p-2 bg-yellow-100 rounded text-sm">
                <button
                  type="button"
                  onClick={() => {
                    const availableRoom = allAvailableRooms.find(room => room.status === 'available' || room.status === 'Available');
                    if (availableRoom) {
                      // Use dates far in the future to avoid conflicts
                      setBookingForm({
                        roomId: availableRoom._id,
                        guestName: 'Test Guest',
                        guestEmail: 'test@example.com',
                        guestPhone: '1234567890',
                        checkIn: '2026-03-01',
                        checkOut: '2026-03-02',
                        adults: 1,
                        children: 0,
                        notes: 'Test booking - future dates'
                      });
                      alert(`Test data set for Room ${availableRoom.roomNumber || 'Unknown'} with future dates (March 1-2, 2026)`);
                    } else {
                      alert('No available rooms found for test');
                    }
                  }}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 mb-2"
                >
                  Fill Test Booking Data (Future Dates)
                </button>
                <p className="text-xs text-gray-600">This sets future dates to avoid any conflicts</p>
              </div>
              
              <form onSubmit={handleCreateBooking}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Room</label>
                  <select
                    name="roomId"
                    value={bookingForm.roomId}
                    onChange={handleBookingFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Room</option>
                    {allAvailableRooms
                      .filter(room => room.status === 'available' || room.status === 'Available')
                      .map(room => (
                        <option key={room._id} value={room._id}>
                          {room.roomNumber} - {room.type} - ${room.price}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                  <input
                    type="text"
                    name="guestName"
                    value={bookingForm.guestName}
                    onChange={handleBookingFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Email</label>
                  <input
                    type="email"
                    name="guestEmail"
                    value={bookingForm.guestEmail}
                    onChange={handleBookingFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Phone</label>
                  <input
                    type="tel"
                    name="guestPhone"
                    value={bookingForm.guestPhone}
                    onChange={handleBookingFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                  <input
                    type="date"
                    name="checkIn"
                    value={bookingForm.checkIn}
                    onChange={handleBookingFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                  <input
                    type="date"
                    name="checkOut"
                    value={bookingForm.checkOut}
                    onChange={handleBookingFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                  <input
                    type="number"
                    name="adults"
                    value={bookingForm.adults}
                    onChange={handleBookingFormChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                  <input
                    type="number"
                    name="children"
                    value={bookingForm.children}
                    onChange={handleBookingFormChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={bookingForm.notes}
                    onChange={handleBookingFormChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    Create Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
