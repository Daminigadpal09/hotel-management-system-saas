import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hotelAPI, userAPI, branchAPI, roomAPI, bookingAPI, billingAPI } from "../services/api.js";

export default function HotelOwnerDashboard() {
  const [hotels, setHotels] = useState([]);
  const [hotelsWithRooms, setHotelsWithRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  // View toggle state
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' or 'bookings'
  
  // Booking Management State
  const [bookingFilter, setBookingFilter] = useState("all");
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    totalAmount: 0
  });
  const [allRooms, setAllRooms] = useState([]);
  const [allGuests, setAllGuests] = useState([]);
  const [selectedBookingBranch, setSelectedBookingBranch] = useState("");
  
  // Guest Management State
  const [guestFilter, setGuestFilter] = useState("all");
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({
    name: "",
    email: "",
    phone: "",
    idType: "",
    idNumber: "",
    address: ""
  });
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [showEditGuest, setShowEditGuest] = useState(false);
  
  // Billing Management State
  const [billingFilter, setBillingFilter] = useState("all");
  const [allBills, setAllBills] = useState([]);
  const [showAddBill, setShowAddBill] = useState(false);
  const [billForm, setBillForm] = useState({
    bookingId: "",
    guestName: "",
    amount: "",
    dueDate: "",
    status: "pending"
  });
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [showEditBill, setShowEditBill] = useState(false);
  
  // Analytics Dashboard State
  const [analyticsData, setAnalyticsData] = useState({
    occupancyRate: 0,
    totalRevenue: 0,
    monthlyRevenue: [],
    bookingTrends: [],
    branchWiseRevenue: [],
    financialSummary: {
      totalBookings: 0,
      totalRevenue: 0,
      paidAmount: 0,
      pendingAmount: 0,
      cancelledBookings: 0
    },
    loading: true
  });

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

  // Fetch Analytics Data
  const fetchAnalyticsData = async () => {
    try {
      setAnalyticsData(prev => ({ ...prev, loading: true }));
      
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const hotelId = hotels[0]?._id || user.hotel_id;
      
      // Fetch all branches for all hotels
      let allBranches = [];
      for (const hotel of hotels) {
        try {
          const branchData = await branchAPI.getBranches(hotel._id);
          allBranches = [...allBranches, ...(branchData.data || []).map(b => ({ ...b, hotelName: hotel.name }))];
        } catch (e) {
          console.error("Error fetching branches for hotel", hotel._id, e);
        }
      }
      
      // Calculate occupancy rate across all branches
      let totalRooms = 0;
      let occupiedRooms = 0;
      
      for (const branch of allBranches) {
        try {
          const roomsData = await roomAPI.getRooms(hotelId, branch._id);
          const branchRooms = roomsData.data || [];
          totalRooms += branchRooms.length;
          occupiedRooms += branchRooms.filter(r => r.status === 'occupied' || r.status === 'booked').length;
        } catch (e) {
          console.error("Error fetching rooms for branch", branch._id, e);
        }
      }
      
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      
      // Fetch billing reports for revenue
      let totalRevenue = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let invoiceCount = 0;
      
      try {
        const billingData = await billingAPI.getBillingReports({ type: 'revenue' });
        if (billingData.data) {
          totalRevenue = billingData.data.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
          invoiceCount = billingData.data.reduce((sum, item) => sum + (item.invoiceCount || 0), 0);
        }
      } catch (e) {
        console.error("Error fetching billing reports", e);
      }
      
      // Fetch payments for paid/pending amounts
      try {
        const paymentsData = await billingAPI.getPayments();
        if (paymentsData.data) {
          paidAmount = paymentsData.data.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0);
          pendingAmount = paymentsData.data.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0);
        }
      } catch (e) {
        console.error("Error fetching payments", e);
      }
      
      // Calculate monthly revenue (last 6 months)
      const monthlyRevenue = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        
        // Filter bookings by month
        const monthBookings = bookings.filter(b => {
          const bookingDate = new Date(b.createdAt || b.checkIn);
          return bookingDate.getMonth() === month.getMonth() && 
                 bookingDate.getFullYear() === month.getFullYear();
        });
        
        const monthRevenue = monthBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        monthlyRevenue.push({
          month: monthKey,
          label: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: monthRevenue,
          bookings: monthBookings.length
        });
      }
      
      // Calculate booking trends (last 6 months)
      const bookingTrends = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthBookings = bookings.filter(b => {
          const bookingDate = new Date(b.createdAt || b.checkIn);
          return bookingDate.getMonth() === month.getMonth() && 
                 bookingDate.getFullYear() === month.getFullYear();
        });
        
        bookingTrends.push({
          month: month.toLocaleDateString('en-US', { month: 'short' }),
          bookings: monthBookings.length,
          checkedIn: monthBookings.filter(b => b.status === 'CHECKED_IN').length,
          checkedOut: monthBookings.filter(b => b.status === 'CHECKED_OUT').length,
          cancelled: monthBookings.filter(b => b.status === 'CANCELLED').length
        });
      }
      
      // Calculate branch-wise revenue
      const branchWiseRevenue = [];
      for (const branch of allBranches.slice(0, 5)) {
        try {
          const revenueData = await billingAPI.getBranchRevenue(branch._id, { period: 'monthly' });
          branchWiseRevenue.push({
            branchId: branch._id,
            branchName: branch.name,
            hotelName: branch.hotelName,
            revenue: revenueData.data?.totalRevenue || 0
          });
        } catch (e) {
          branchWiseRevenue.push({
            branchId: branch._id,
            branchName: branch.name,
            hotelName: branch.hotelName,
            revenue: 0
          });
        }
      }
      
      // Calculate financial summary
      const financialSummary = {
        totalBookings: bookings.length,
        totalRevenue: totalRevenue || bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        paidAmount,
        pendingAmount,
        cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length
      };
      
      setAnalyticsData({
        occupancyRate,
        totalRevenue: financialSummary.totalRevenue,
        monthlyRevenue,
        bookingTrends,
        branchWiseRevenue,
        financialSummary,
        loading: false
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setAnalyticsData(prev => ({ ...prev, loading: false }));
    }
  };

  // Booking Management Functions
  const fetchAllRooms = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const hotelId = hotels[0]?._id || user.hotel_id;
      
      if (!hotelId) return;
      
      // Get all branches first
      const branchData = await branchAPI.getBranches(hotelId);
      const hotelBranches = branchData.data || [];
      
      // Get rooms for all branches
      let rooms = [];
      for (const br of hotelBranches) {
        try {
          const roomsData = await roomAPI.getRooms(hotelId, br._id);
          rooms = [...rooms, ...(roomsData.data || []).map(r => ({ ...r, branchName: br.name }))];
        } catch (e) {
          console.error("Error fetching rooms for branch", br._id, e);
        }
      }
      setAllRooms(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchAllGuests = async () => {
    try {
      const { guestAPI } = await import("../services/api.js");
      const data = await guestAPI.getGuests({ limit: 1000 }); // Increased limit to get all guests
      console.log("Fetched guests:", data.data || data); // Debug log
      setAllGuests(data.data || data);
    } catch (error) {
      console.error("Error fetching guests:", error);
      // Set empty array on error to prevent undefined issues
      setAllGuests([]);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    
    if (!bookingForm.guestName || !bookingForm.roomId || !bookingForm.checkIn || !bookingForm.checkOut) {
      alert("Please fill all required fields");
      return;
    }
    
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const hotelId = hotels[0]?._id || user.hotel_id;
      
      if (!hotelId) {
        alert("Hotel not found");
        return;
      }
      
      // Find the room to get branch info
      const selectedRoom = allRooms.find(r => r._id === bookingForm.roomId);
      if (!selectedRoom) {
        alert("Room not found");
        return;
      }
      
      // Calculate total amount based on room price and nights
      const checkIn = new Date(bookingForm.checkIn);
      const checkOut = new Date(bookingForm.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const totalAmount = selectedRoom.basePrice * nights;
      
      const bookingData = {
        guestName: bookingForm.guestName,
        roomId: bookingForm.roomId,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        totalAmount,
        status: "BOOKED"
      };
      
      await bookingAPI.createBooking(hotelId, bookingData);
      alert("Booking created successfully!");
      setShowAddBooking(false);
      setBookingForm({
        guestName: "",
        roomId: "",
        checkIn: "",
        checkOut: "",
        totalAmount: 0
      });
      fetchBookings();
      fetchAnalyticsData();
    } catch (error) {
      alert("Error creating booking: " + error.message);
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      await bookingAPI.checkIn(bookingId);
      fetchBookings();
      fetchAnalyticsData();
      alert("Guest checked in successfully!");
    } catch (error) {
      alert("Error checking in: " + error.message);
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      await bookingAPI.checkOut(bookingId);
      fetchBookings();
      fetchAnalyticsData();
      alert("Guest checked out successfully!");
    } catch (error) {
      alert("Error checking out: " + error.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
      await bookingAPI.cancelBooking(bookingId);
      fetchBookings();
      fetchAnalyticsData();
      alert("Booking cancelled successfully!");
    } catch (error) {
      alert("Error cancelling booking: " + error.message);
    }
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    
    if (!guestForm.name || !guestForm.email || !guestForm.phone || !guestForm.idType || !guestForm.idNumber) {
      alert("Please fill all required fields");
      return;
    }
    
    try {
      const { guestAPI } = await import("../services/api.js");
      const guestData = {
        name: guestForm.name,
        email: guestForm.email,
        phone: guestForm.phone,
        idType: guestForm.idType,
        idNumber: guestForm.idNumber,
        address: guestForm.address,
        status: 'active'
      };
      
      await guestAPI.createGuest(guestData);
      alert("Guest added successfully!");
      setShowAddGuest(false);
      setGuestForm({
        name: "",
        email: "",
        phone: "",
        idType: "",
        idNumber: "",
        address: ""
      });
      fetchAllGuests();
    } catch (error) {
      alert("Error adding guest: " + error.message);
    }
  };

  const fetchAllBills = async () => {
    try {
      const { billingAPI } = await import("../services/api.js");
      const data = await billingAPI.getBills({ limit: 1000 });
      console.log("Fetched bills:", data.data || data);
      setAllBills(data.data || data);
    } catch (error) {
      console.error("Error fetching bills:", error);
      setAllBills([]);
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    
    if (!billForm.bookingId || !billForm.guestName || !billForm.amount || !billForm.dueDate) {
      alert("Please fill all required fields");
      return;
    }
    
    try {
      const { billingAPI } = await import("../services/api.js");
      const billData = {
        bookingId: billForm.bookingId,
        guestName: billForm.guestName,
        amount: parseFloat(billForm.amount),
        dueDate: billForm.dueDate,
        status: billForm.status
      };
      
      await billingAPI.createBill(billData);
      alert("Bill created successfully!");
      setShowAddBill(false);
      setBillForm({
        bookingId: "",
        guestName: "",
        amount: "",
        dueDate: "",
        status: "pending"
      });
      fetchAllBills();
    } catch (error) {
      alert("Error creating bill: " + error.message);
    }
  };

  useEffect(() => {
    fetchHotels();
    fetchBookings();
    fetchAllGuests();
    fetchAllBills();
  }, []);
  
  useEffect(() => {
    if (hotels.length > 0 && bookings.length > 0) {
      fetchAnalyticsData();
    }
  }, [hotels, bookings]);

  useEffect(() => {
    if (activeView === "guests") {
      fetchAllGuests();
    } else if (activeView === "billing") {
      fetchAllBills();
    }
  }, [activeView]);

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
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(activeView === "bookings" ? "dashboard" : "bookings");
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "bookings" 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                📅 Booking Management
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(activeView === "guests" ? "dashboard" : "guests");
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "guests" 
                    ? "bg-green-50 text-green-700" 
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                👥 Guest Management
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(activeView === "billing" ? "dashboard" : "billing");
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "billing" 
                    ? "bg-purple-50 text-purple-700" 
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
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
              {activeView === "bookings" ? (
                /* Booking Management Only View */
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">📅 Booking Management</h2>
                      <p className="text-sm text-gray-500">Manage all hotel bookings</p>
                    </div>
                    <button
                      onClick={() => setActiveView("dashboard")}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>

                  {/* Booking Filters */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setBookingFilter("all")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          bookingFilter === "all" 
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        All ({bookings.length})
                      </button>
                      <button
                        onClick={() => setBookingFilter("BOOKED")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          bookingFilter === "BOOKED" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Booked ({bookings.filter(b => b.status === "BOOKED").length})
                      </button>
                      <button
                        onClick={() => setBookingFilter("CHECKED_IN")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          bookingFilter === "CHECKED_IN" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Checked In ({bookings.filter(b => b.status === "CHECKED_IN").length})
                      </button>
                      <button
                        onClick={() => setBookingFilter("CHECKED_OUT")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          bookingFilter === "CHECKED_OUT" 
                            ? "bg-gray-100 text-gray-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Checked Out ({bookings.filter(b => b.status === "CHECKED_OUT").length})
                      </button>
                      <button
                        onClick={() => setBookingFilter("CANCELLED")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          bookingFilter === "CANCELLED" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Cancelled ({bookings.filter(b => b.status === "CANCELLED").length})
                      </button>
                    </div>
                  </div>

                  {/* Booking Content */}
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setShowAddBooking(true);
                            fetchAllRooms();
                            fetchAllGuests();
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                        >
                          + New Booking
                        </button>
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
                        <p className="text-gray-500 mb-4">Create your first booking to get started.</p>
                        <button
                          onClick={() => {
                            setShowAddBooking(true);
                            fetchAllRooms();
                            fetchAllGuests();
                          }}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
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
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {bookings
                              .filter(b => bookingFilter === "all" || b.status === bookingFilter)
                              .slice(0, 10)
                              .map((booking) => (
                              <tr key={booking._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                      <span className="text-indigo-600 font-medium">{booking.guestName?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                                      <div className="text-sm text-gray-500">{booking.guestEmail}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">Room {booking.roomId?.roomNumber || booking.roomId}</div>
                                  <div className="text-sm text-gray-500">{booking.roomId?.category || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(booking.checkIn).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(booking.checkOut).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  ${booking.totalAmount || 0}
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    {booking.status === 'BOOKED' && (
                                      <button
                                        onClick={() => handleCheckIn(booking._id)}
                                        className="text-green-600 hover:text-green-900"
                                      >
                                        Check In
                                      </button>
                                    )}
                                    {booking.status === 'CHECKED_IN' && (
                                      <button
                                        onClick={() => handleCheckOut(booking._id)}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        Check Out
                                      </button>
                                    )}
                                    {(booking.status === 'BOOKED' || booking.status === 'CHECKED_IN') && (
                                      <button
                                        onClick={() => handleCancelBooking(booking._id)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        Cancel
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedBooking(booking);
                                        setShowBookingDetails(true);
                                      }}
                                      className="text-gray-600 hover:text-gray-900"
                                    >
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeView === "guests" ? (
                /* Guest Management Only View */
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">👥 Guest Management</h2>
                      <p className="text-sm text-gray-500">Manage all hotel guests</p>
                    </div>
                    <button
                      onClick={() => setActiveView("dashboard")}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>

                  {/* Guest Filters */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setGuestFilter("all")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          guestFilter === "all" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        All ({allGuests.length})
                      </button>
                      <button
                        onClick={() => setGuestFilter("active")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          guestFilter === "active" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Active ({allGuests.filter(g => g.status === 'active').length})
                      </button>
                      <button
                        onClick={() => setGuestFilter("inactive")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          guestFilter === "inactive" 
                            ? "bg-gray-100 text-gray-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Inactive ({allGuests.filter(g => g.status === 'inactive').length})
                      </button>
                    </div>
                  </div>

                  {/* Guest Content */}
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setShowAddGuest(true);
                            fetchAllGuests();
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                        >
                          + New Guest
                        </button>
                      </div>
                    </div>
                    
                    {allGuests.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No guests yet</h3>
                        <p className="text-gray-500 mb-4">Add your first guest to get started.</p>
                        <button
                          onClick={() => {
                            setShowAddGuest(true);
                            fetchAllGuests();
                          }}
                          className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                        >
                          Add First Guest
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Debug info - remove later */}
                        <div className="mb-4 p-2 bg-gray-100 text-xs">
                          Debug: Found {allGuests.length} guests in database
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Document</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {allGuests
                                .filter(g => guestFilter === "all" || g.status === guestFilter)
                                .map((guest, index) => (
                                <tr key={guest._id || index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <span className="text-green-600 font-medium">{guest.name?.charAt(0).toUpperCase() || 'G'}</span>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{guest.name || 'Unknown Guest'}</div>
                                        <div className="text-sm text-gray-500">ID: {guest.guestId || guest._id?.slice(-6) || 'N/A'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{guest.email || 'N/A'}</div>
                                    <div className="text-sm text-gray-500">{guest.phone || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{guest.idType || 'N/A'}</div>
                                    <div className="text-sm text-gray-500">{guest.idNumber || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      guest.status === 'active' ? 'bg-green-100 text-green-800' :
                                      guest.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {guest.status || 'unknown'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => {
                                          setSelectedGuest(guest);
                                          setShowGuestDetails(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedGuest(guest);
                                          setShowEditGuest(true);
                                        }}
                                        className="text-green-600 hover:text-green-900"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {allGuests.length > 10 && (
                          <div className="px-6 py-4 border-t border-gray-200">
                            <span className="text-sm text-gray-500">
                              Showing all {allGuests.length} guests
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : activeView === "billing" ? (
                /* Billing Management Only View */
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">💰 Billing & Payments</h2>
                      <p className="text-sm text-gray-500">Manage all billing and payments</p>
                    </div>
                    <button
                      onClick={() => setActiveView("dashboard")}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>

                  {/* Billing Filters */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setBillingFilter("all")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          billingFilter === "all" 
                            ? "bg-purple-100 text-purple-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        All ({allBills.length})
                      </button>
                      <button
                        onClick={() => setBillingFilter("pending")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          billingFilter === "pending" 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Pending ({allBills.filter(b => b.status === 'pending').length})
                      </button>
                      <button
                        onClick={() => setBillingFilter("paid")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          billingFilter === "paid" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Paid ({allBills.filter(b => b.status === 'paid').length})
                      </button>
                      <button
                        onClick={() => setBillingFilter("overdue")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          billingFilter === "overdue" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Overdue ({allBills.filter(b => b.status === 'overdue').length})
                      </button>
                    </div>
                  </div>

                  {/* Billing Content */}
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setShowAddBill(true);
                            fetchAllBills();
                          }}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                        >
                          + New Bill
                        </button>
                      </div>
                    </div>
                    
                    {allBills.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 4.077a1 1 0 01-1.123.606l-2.257-4.077a1 1 0 01-.502-1.21L7.228 3.684A1 1 0 018.172 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No bills yet</h3>
                        <p className="text-gray-500 mb-4">Create your first bill to get started.</p>
                        <button
                          onClick={() => {
                            setShowAddBill(true);
                            fetchAllBills();
                          }}
                          className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                        >
                          Create First Bill
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Debug info */}
                        <div className="mb-4 p-2 bg-gray-100 text-xs">
                          Debug: Found {allBills.length} bills in database
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {allBills
                                .filter(b => billingFilter === "all" || b.status === billingFilter)
                                .map((bill, index) => (
                                <tr key={bill._id || index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">#{bill._id?.slice(-6) || 'N/A'}</div>
                                    <div className="text-sm text-gray-500">Booking: {bill.bookingId?.slice(-6) || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{bill.guestName || 'Unknown Guest'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">${bill.amount || 0}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(bill.dueDate).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                                      bill.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                      bill.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {bill.status || 'unknown'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => {
                                          setSelectedBill(bill);
                                          setShowBillDetails(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedBill(bill);
                                          setShowEditBill(true);
                                        }}
                                        className="text-green-600 hover:text-green-900"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Dashboard View - Analytics and Hotels */
                <>
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

              {/* Financial Summary */}
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">💰 Financial Summary</h3>
                  <p className="text-sm text-gray-500">Complete financial overview</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-900 mt-1">
                            ${analyticsData.financialSummary.totalRevenue.toLocaleString()}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Paid Amount</p>
                          <p className="text-2xl font-bold text-blue-900 mt-1">
                            ${analyticsData.financialSummary.paidAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-700">Pending Amount</p>
                          <p className="text-2xl font-bold text-yellow-900 mt-1">
                            ${analyticsData.financialSummary.pendingAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-700">Cancelled Bookings</p>
                          <p className="text-2xl font-bold text-purple-900 mt-1">
                            {analyticsData.financialSummary.cancelledBookings}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Payment Status Breakdown</h4>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div className="flex h-4 rounded-full overflow-hidden">
                            <div 
                              className="bg-green-500" 
                              style={{ width: `${analyticsData.financialSummary.totalRevenue > 0 ? (analyticsData.financialSummary.paidAmount / analyticsData.financialSummary.totalRevenue) * 100 : 0}%` }}
                            ></div>
                            <div 
                              className="bg-yellow-500" 
                              style={{ width: `${analyticsData.financialSummary.totalRevenue > 0 ? (analyticsData.financialSummary.pendingAmount / analyticsData.financialSummary.totalRevenue) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-600">
                      <span className="flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                        Paid: {analyticsData.financialSummary.totalRevenue > 0 ? Math.round((analyticsData.financialSummary.paidAmount / analyticsData.financialSummary.totalRevenue) * 100) : 0}%
                      </span>
                      <span className="flex items-center">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                        Pending: {analyticsData.financialSummary.totalRevenue > 0 ? Math.round((analyticsData.financialSummary.pendingAmount / analyticsData.financialSummary.totalRevenue) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>

    {/* Add Bill Modal */}
    {showAddBill && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Create New Bill</h3>
            <button
              onClick={() => setShowAddBill(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleCreateBill} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking ID *</label>
                <input
                  type="text"
                  value={billForm.bookingId}
                  onChange={(e) => setBillForm({...billForm, bookingId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                <input
                  type="text"
                  value={billForm.guestName}
                  onChange={(e) => setBillForm({...billForm, guestName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={billForm.amount}
                  onChange={(e) => setBillForm({...billForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={billForm.dueDate}
                  onChange={(e) => setBillForm({...billForm, dueDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={billForm.status}
                  onChange={(e) => setBillForm({...billForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddBill(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
              >
                Create Bill
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  );
};
