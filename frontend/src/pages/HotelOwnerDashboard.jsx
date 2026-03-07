import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  hotelAPI,
  branchAPI,
  roomAPI,
  bookingAPI,
  billingAPI,
  paymentAPI,
} from "../services/api.js";

export default function HotelOwnerDashboard() {
  const [hotels, setHotels] = useState([]);
  const [hotelsWithRooms, setHotelsWithRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // View toggle state
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard', 'bookings', 'guests', 'billing', 'hotels'

  // Billing & Payment State
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [billingRecords, setBillingRecords] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
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
    dueDate: '',
    status: 'pending'
  });

  // Booking Management State
  const [bookingFilter, setBookingFilter] = useState("all");
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    totalAmount: 0,
  });
  const [allRooms, setAllRooms] = useState([]);
  const [allGuests, setAllGuests] = useState([]);

  // Guest Management State
  const [guestFilter, setGuestFilter] = useState("all");
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({
    name: "",
    email: "",
    phone: "",
    idType: "",
    idNumber: "",
    address: "",
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
    status: "pending",
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
    branchOccupancy: [],
    financialSummary: {
      totalBookings: 0,
      totalRevenue: 0,
      paidAmount: 0,
      pendingAmount: 0,
      cancelledBookings: 0,
    },
    loading: true,
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
              const roomsPromises = branches.map((branch) =>
                roomAPI
                  .getRooms(hotel._id, branch._id)
                  .catch(() => ({ data: [] })),
              );
              const roomsResponses = await Promise.all(roomsPromises);
              allRooms = roomsResponses.flatMap(
                (response) => response.data || [],
              );
            }

            const totalRooms = allRooms.length;
            const availableRooms = allRooms.filter(
              (r) => r.status === "available",
            ).length;
            return {
              ...hotel,
              totalRooms,
              availableRooms,
              branches: branches.length,
            };
          } catch {
            return { ...hotel, totalRooms: 0, availableRooms: 0, branches: 0 };
          }
        }),
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
      setAnalyticsData((prev) => ({ ...prev, loading: true }));

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const hotelId = hotels[0]?._id || user.hotel_id;

      // Fetch all branches for all hotels
      let allBranches = [];
      for (const hotel of hotels) {
        try {
          const branchData = await branchAPI.getBranches(hotel._id);
          allBranches = [
            ...allBranches,
            ...(branchData.data || []).map((b) => ({
              ...b,
              hotelName: hotel.name,
            })),
          ];
        } catch (e) {
          console.error("Error fetching branches for hotel", hotel._id, e);
        }
      }

      // Calculate occupancy rate across all branches (per-branch + overall)
      let totalRooms = 0;
      let occupiedRooms = 0;
      const branchOccupancy = [];

      for (const branch of allBranches) {
        try {
          const roomsData = await roomAPI.getRooms(hotelId, branch._id);
          const branchRooms = roomsData.data || [];
          const occupied = branchRooms.filter(
            (r) => r.status === "occupied" || r.status === "booked",
          ).length;
          const available = branchRooms.filter(
            (r) => r.status === "available",
          ).length;
          totalRooms += branchRooms.length;
          occupiedRooms += occupied;
          branchOccupancy.push({
            branchId: branch._id,
            branchName: branch.name,
            hotelName: branch.hotelName,
            totalRooms: branchRooms.length,
            occupiedRooms: occupied,
            availableRooms: available,
            maintenanceRooms: branchRooms.length - occupied - available,
            occupancyRate:
              branchRooms.length > 0
                ? Math.round((occupied / branchRooms.length) * 100)
                : 0,
          });
        } catch (e) {
          console.error("Error fetching rooms for branch", branch._id, e);
          branchOccupancy.push({
            branchId: branch._id,
            branchName: branch.name,
            hotelName: branch.hotelName,
            totalRooms: 0,
            occupiedRooms: 0,
            availableRooms: 0,
            maintenanceRooms: 0,
            occupancyRate: 0,
          });
        }
      }

      const occupancyRate =
        totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      // Fetch billing reports for revenue
      let totalRevenue = 0;
      let paidAmount = 0;
      let pendingAmount = 0;

      try {
        const billingData = await billingAPI.getBillingReports({
          type: "revenue",
        });
        if (billingData.data) {
          totalRevenue = billingData.data.reduce(
            (sum, item) => sum + (item.totalRevenue || 0),
            0,
          );
        }
      } catch (e) {
        console.error("Error fetching billing reports", e);
      }

      // Fetch payments for paid/pending amounts
      try {
        const paymentsData = await billingAPI.getPayments();
        if (paymentsData.data) {
          paidAmount = paymentsData.data.reduce(
            (sum, p) => sum + (p.status === "completed" ? p.amount : 0),
            0,
          );
          pendingAmount = paymentsData.data.reduce(
            (sum, p) => sum + (p.status === "pending" ? p.amount : 0),
            0,
          );
        }
      } catch (e) {
        console.error("Error fetching payments", e);
      }

      // Calculate monthly revenue (last 6 months)
      const monthlyRevenue = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

        // Filter bookings by month
        const monthBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.createdAt || b.checkIn);
          return (
            bookingDate.getMonth() === month.getMonth() &&
            bookingDate.getFullYear() === month.getFullYear()
          );
        });

        const monthRevenue = monthBookings.reduce(
          (sum, b) => sum + (b.totalAmount || 0),
          0,
        );
        monthlyRevenue.push({
          month: monthKey,
          label: month.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          revenue: monthRevenue,
          bookings: monthBookings.length,
        });
      }

      // Calculate booking trends (last 6 months)
      const bookingTrends = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.createdAt || b.checkIn);
          return (
            bookingDate.getMonth() === month.getMonth() &&
            bookingDate.getFullYear() === month.getFullYear()
          );
        });

        bookingTrends.push({
          month: month.toLocaleDateString("en-US", { month: "short" }),
          bookings: monthBookings.length,
          checkedIn: monthBookings.filter((b) => b.status === "CHECKED_IN")
            .length,
          checkedOut: monthBookings.filter((b) => b.status === "CHECKED_OUT")
            .length,
          cancelled: monthBookings.filter((b) => b.status === "CANCELLED")
            .length,
        });
      }

      // Calculate branch-wise revenue
      const branchWiseRevenue = [];
      for (const branch of allBranches.slice(0, 5)) {
        try {
          const revenueData = await billingAPI.getBranchRevenue(branch._id, {
            period: "monthly",
          });
          branchWiseRevenue.push({
            branchId: branch._id,
            branchName: branch.name,
            hotelName: branch.hotelName,
            revenue: revenueData.data?.totalRevenue || 0,
          });
        } catch {
          branchWiseRevenue.push({
            branchId: branch._id,
            branchName: branch.name,
            hotelName: branch.hotelName,
            revenue: 0,
          });
        }
      }

      // Calculate financial summary
      const financialSummary = {
        totalBookings: bookings.length,
        totalRevenue:
          totalRevenue ||
          bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        paidAmount,
        pendingAmount,
        cancelledBookings: bookings.filter((b) => b.status === "CANCELLED")
          .length,
      };

      setAnalyticsData({
        occupancyRate,
        totalRevenue: financialSummary.totalRevenue,
        monthlyRevenue,
        bookingTrends,
        branchWiseRevenue,
        branchOccupancy,
        financialSummary,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setAnalyticsData((prev) => ({ ...prev, loading: false }));
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
          rooms = [
            ...rooms,
            ...(roomsData.data || []).map((r) => ({
              ...r,
              branchName: br.name,
            })),
          ];
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

    if (
      !bookingForm.guestName ||
      !bookingForm.roomId ||
      !bookingForm.checkIn ||
      !bookingForm.checkOut
    ) {
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
      const selectedRoom = allRooms.find((r) => r._id === bookingForm.roomId);
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
        status: "BOOKED",
      };

      await bookingAPI.createBooking(hotelId, bookingData);
      alert("Booking created successfully!");
      setShowAddBooking(false);
      setBookingForm({
        guestName: "",
        roomId: "",
        checkIn: "",
        checkOut: "",
        totalAmount: 0,
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
    if (!window.confirm("Are you sure you want to cancel this booking?"))
      return;

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

    if (
      !guestForm.name ||
      !guestForm.email ||
      !guestForm.phone ||
      !guestForm.idType ||
      !guestForm.idNumber
    ) {
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
        status: "active",
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
        address: "",
      });
      fetchAllGuests();
    } catch (error) {
      alert("Error adding guest: " + error.message);
    }
  };

  const fetchAllBills = async () => {
    try {
      const { billingAPI } = await import("../services/api.js");
      const data = await billingAPI.getInvoices({ limit: 1000 });
      console.log("Fetched bills:", data.data || data);
      setAllBills(data.data || data);
    } catch (error) {
      console.error("Error fetching bills:", error);
      setAllBills([]);
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();

    if (
      !billForm.bookingId ||
      !billForm.guestName ||
      !billForm.amount ||
      !billForm.dueDate
    ) {
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
        status: billForm.status,
      };

      await billingAPI.createBill(billData);
      alert("Bill created successfully!");
      setShowAddBill(false);
      setBillForm({
        bookingId: "",
        guestName: "",
        amount: "",
        dueDate: "",
        status: "pending",
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

  // Billing Functions
  const fetchBillingAndPayments = async (hotelId, branchId) => {
    try {
      const billingResponse = await billingAPI.getBillingByBranch(branchId);
      setBillingRecords(billingResponse.data || []);
      const paymentResponse = await paymentAPI.getPaymentsByBranch(branchId);
      setPaymentRecords(paymentResponse.data || []);
    } catch (error) {
      console.error("Error fetching billing and payments:", error);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      const paymentData = {
        ...paymentForm,
        hotelId: selectedHotel?._id || hotels[0]?._id,
        branchId: selectedBranch?._id,
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
      if (selectedBranch?._id) {
        fetchBillingAndPayments(selectedHotel?._id || hotels[0]?._id, selectedBranch._id);
      }
    } catch (error) {
      alert("Error recording payment: " + error.message);
    }
  };

  const handleCreateBilling = async (e) => {
    e.preventDefault();
    try {
      const billingData = {
        ...billingForm,
        hotelId: selectedHotel?._id || hotels[0]?._id,
        branchId: selectedBranch?._id,
        amount: parseFloat(billingForm.amount),
        status: billingForm.status || 'pending',
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
        dueDate: '',
        status: 'pending'
      });
      if (selectedBranch?._id) {
        fetchBillingAndPayments(selectedHotel?._id || hotels[0]?._id, selectedBranch._id);
      }
    } catch (error) {
      alert("Error creating billing record: " + error.message);
    }
  };

  const handleMarkAsPaid = async (recordId) => {
    try {
      await billingAPI.updateInvoice(recordId, { status: 'paid' });
      alert("Billing record marked as paid!");
      if (selectedBranch?._id) {
        fetchBillingAndPayments(selectedHotel?._id || hotels[0]?._id, selectedBranch._id);
      }
    } catch (error) {
      alert("Error updating billing record: " + error.message);
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Vertical Sidebar Navigation */}
      <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Hotel Owner
              </h1>
              <p className="text-xs text-slate-400">Dashboard</p>
            </div>
          </div>
          
          {/* User Info Card */}
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Main Menu
            </h3>
            <Link
              to="/owner-dashboard"
              className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 bg-amber-500/10 text-amber-400 border-l-2 border-amber-500"
            >
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                </svg>
              </div>
              Dashboard
              <svg className="w-4 h-4 ml-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Management
            </h3>
            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView(
                  activeView === "hotels" ? "dashboard" : "hotels",
                );
              }}
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 mb-1 ${
                activeView === "hotels"
                  ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeView === "hotels" ? 'bg-indigo-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}>
                <svg className={`w-5 h-5 ${activeView === "hotels" ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              My Hotels
            </Link>

            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView(
                  activeView === "bookings" ? "dashboard" : "bookings",
                );
              }}
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 mb-1 ${
                activeView === "bookings"
                  ? "bg-blue-500/10 text-blue-400 border-l-2 border-blue-500"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeView === "bookings" ? 'bg-blue-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}>
                <svg className={`w-5 h-5 ${activeView === "bookings" ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Bookings
              <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300">{bookings.length}</span>
            </Link>

            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView(
                  activeView === "guests" ? "dashboard" : "guests",
                );
              }}
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 mb-1 ${
                activeView === "guests"
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeView === "guests" ? 'bg-emerald-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}>
                <svg className={`w-5 h-5 ${activeView === "guests" ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Guests
            </Link>

            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView(
                  activeView === "billing" ? "dashboard" : "billing",
                );
              }}
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 mb-1 ${
                activeView === "billing"
                  ? "bg-violet-500/10 text-violet-400 border-l-2 border-violet-500"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeView === "billing" ? 'bg-violet-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}>
                <svg className={`w-5 h-5 ${activeView === "billing" ? 'text-violet-400' : 'text-slate-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              Billing
            </Link>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Quick Actions
            </h3>
            <button
              onClick={() => {
                setShowAddBooking(true);
                fetchAllRooms();
                fetchAllGuests();
              }}
              className="w-full group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-amber-400 hover:bg-amber-500/10 mb-1"
            >
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              New Booking
            </button>

            <button
              onClick={() => {
                setShowAddGuest(true);
                fetchAllGuests();
              }}
              className="w-full group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-emerald-400 hover:bg-emerald-500/10 mb-1"
            >
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              Add Guest
            </button>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-700/50">
            <Link
              to="/"
              className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-slate-300 hover:bg-slate-700/50 hover:text-white mb-1"
            >
              <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-slate-600/50">
                <svg className="w-5 h-5 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                </svg>
              </div>
              Back to Home
            </Link>
            <button
              onClick={handleLogout}
              className="w-full group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-red-400 hover:bg-red-500/10"
            >
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              Logout
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            System Online
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-slate-800">
                    Hotel Management Dashboard
                  </h2>
                  <p className="text-xs text-slate-500">
                    Welcome back! Here's what's happening with your hotels.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden md:flex items-center">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-64 pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all"
                    />
                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Date Display */}
                <div className="hidden lg:flex items-center px-4 py-2 bg-slate-50 rounded-lg">
                  <svg className="w-4 h-4 text-slate-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-slate-600 font-medium">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {user.role}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-white">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <>
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-100">
              <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                  {activeView === "hotels" ? (
                    /* Hotels Management View */
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">
                            My Hotels
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            Manage your hotel properties
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveView("dashboard")}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                        >
                          Back to Dashboard
                        </button>
                      </div>
                      <div className="p-6">
                        {loading ? (
                          <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                          </div>
                        ) : hotels.length === 0 ? (
                          <div className="text-center py-12">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                              No hotels found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Get started by creating a new hotel
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {hotels.map((hotel) => (
                              <div
                                key={hotel._id}
                                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                              >
                                <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                                  <svg
                                    className="h-16 w-16 text-white opacity-75"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                  </svg>
                                </div>
                                <div className="p-4">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {hotel.name || "Unnamed Hotel"}
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {hotel.address || "No address"}
                                  </p>
                                  <div className="mt-3 flex items-center text-xs text-gray-500">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                      Active
                                    </span>
                                    <span className="ml-2">
                                      ID: {hotel._id?.slice(-6)}
                                    </span>
                                  </div>
                                  <div className="mt-4 flex gap-2">
                                    <Link
                                      to={`/view-hotel/${hotel._id}`}
                                      className="flex-1 px-3 py-2 text-center text-sm font-medium text-brand-600 bg-brand-50 rounded-md hover:bg-brand-100"
                                    >
                                      View Details
                                    </Link>
                                    <Link
                                      to={`/branches/${hotel._id}`}
                                      className="flex-1 px-3 py-2 text-center text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100"
                                    >
                                      Branches
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : activeView === "bookings" ? (
                    /* Booking Management Only View */
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">
                            Booking Management
                          </h2>
                          <p className="text-sm text-gray-500">
                            Manage all hotel bookings
                          </p>
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
                            Booked (
                            {
                              bookings.filter((b) => b.status === "BOOKED")
                                .length
                            }
                            )
                          </button>
                          <button
                            onClick={() => setBookingFilter("CHECKED_IN")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              bookingFilter === "CHECKED_IN"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Checked In (
                            {
                              bookings.filter((b) => b.status === "CHECKED_IN")
                                .length
                            }
                            )
                          </button>
                          <button
                            onClick={() => setBookingFilter("CHECKED_OUT")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              bookingFilter === "CHECKED_OUT"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Checked Out (
                            {
                              bookings.filter((b) => b.status === "CHECKED_OUT")
                                .length
                            }
                            )
                          </button>
                          <button
                            onClick={() => setBookingFilter("CANCELLED")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              bookingFilter === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Cancelled (
                            {
                              bookings.filter((b) => b.status === "CANCELLED")
                                .length
                            }
                            )
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
                              className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 text-sm font-medium"
                            >
                              + New Booking
                            </button>
                          </div>
                        </div>

                        {bookings.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                              <svg
                                className="w-8 h-8 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No bookings yet
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Create your first booking to get started.
                            </p>
                            <button
                              onClick={() => {
                                setShowAddBooking(true);
                                fetchAllRooms();
                                fetchAllGuests();
                              }}
                              className="px-6 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 font-medium"
                            >
                              Create First Booking
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Guest
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Room
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Check-in
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Check-out
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {bookings
                                  .filter(
                                    (b) =>
                                      bookingFilter === "all" ||
                                      b.status === bookingFilter,
                                  )
                                  .slice(0, 10)
                                  .map((booking) => (
                                    <tr
                                      key={booking._id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                            <span className="text-indigo-600 font-medium">
                                              {booking.guestName
                                                ?.charAt(0)
                                                .toUpperCase()}
                                            </span>
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                              {booking.guestName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {booking.guestEmail}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                          Room{" "}
                                          {booking.roomId?.roomNumber ||
                                            booking.roomId}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {booking.roomId?.category || "N/A"}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(
                                          booking.checkIn,
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(
                                          booking.checkOut,
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${booking.totalAmount || 0}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            booking.status === "BOOKED"
                                              ? "bg-blue-100 text-blue-800"
                                              : booking.status === "CHECKED_IN"
                                                ? "bg-green-100 text-green-800"
                                                : booking.status ===
                                                    "CHECKED_OUT"
                                                  ? "bg-gray-100 text-gray-800"
                                                  : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {booking.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                          {booking.status === "BOOKED" && (
                                            <button
                                              onClick={() =>
                                                handleCheckIn(booking._id)
                                              }
                                              className="text-green-600 hover:text-green-900"
                                            >
                                              Check In
                                            </button>
                                          )}
                                          {booking.status === "CHECKED_IN" && (
                                            <button
                                              onClick={() =>
                                                handleCheckOut(booking._id)
                                              }
                                              className="text-blue-600 hover:text-blue-900"
                                            >
                                              Check Out
                                            </button>
                                          )}
                                          {(booking.status === "BOOKED" ||
                                            booking.status ===
                                              "CHECKED_IN") && (
                                            <button
                                              onClick={() =>
                                                handleCancelBooking(booking._id)
                                              }
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
                          <h2 className="text-xl font-semibold text-gray-900">
                            Guest Management
                          </h2>
                          <p className="text-sm text-gray-500">
                            Manage all hotel guests
                          </p>
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
                            Active (
                            {
                              allGuests.filter((g) => g.status === "active")
                                .length
                            }
                            )
                          </button>
                          <button
                            onClick={() => setGuestFilter("inactive")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              guestFilter === "inactive"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Inactive (
                            {
                              allGuests.filter((g) => g.status === "inactive")
                                .length
                            }
                            )
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
                              <svg
                                className="w-8 h-8 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No guests yet
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Add your first guest to get started.
                            </p>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Guest
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      ID Document
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {allGuests
                                    .filter(
                                      (g) =>
                                        guestFilter === "all" ||
                                        g.status === guestFilter,
                                    )
                                    .map((guest, index) => (
                                      <tr
                                        key={guest._id || index}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                              <span className="text-green-600 font-medium">
                                                {guest.name
                                                  ?.charAt(0)
                                                  .toUpperCase() || "G"}
                                              </span>
                                            </div>
                                            <div className="ml-4">
                                              <div className="text-sm font-medium text-gray-900">
                                                {guest.name || "Unknown Guest"}
                                              </div>
                                              <div className="text-sm text-gray-500">
                                                ID:{" "}
                                                {guest.guestId ||
                                                  guest._id?.slice(-6) ||
                                                  "N/A"}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {guest.email || "N/A"}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {guest.phone || "N/A"}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {guest.idType || "N/A"}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {guest.idNumber || "N/A"}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span
                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                              guest.status === "active"
                                                ? "bg-green-100 text-green-800"
                                                : guest.status === "inactive"
                                                  ? "bg-gray-100 text-gray-800"
                                                  : "bg-blue-100 text-blue-800"
                                            }`}
                                          >
                                            {guest.status || "unknown"}
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
                          <h2 className="text-xl font-semibold text-gray-900">
                            Billing & Payments
                          </h2>
                          <p className="text-sm text-gray-500">
                            Manage all billing and payments
                          </p>
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
                            Pending (
                            {
                              allBills.filter((b) => b.status === "pending")
                                .length
                            }
                            )
                          </button>
                          <button
                            onClick={() => setBillingFilter("paid")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              billingFilter === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Paid (
                            {allBills.filter((b) => b.status === "paid").length}
                            )
                          </button>
                          <button
                            onClick={() => setBillingFilter("overdue")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              billingFilter === "overdue"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Overdue (
                            {
                              allBills.filter((b) => b.status === "overdue")
                                .length
                            }
                            )
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
                              <svg
                                className="w-8 h-8 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 4.077a1 1 0 01-1.123.606l-2.257-4.077a1 1 0 01-.502-1.21L7.228 3.684A1 1 0 018.172 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No bills yet
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Create your first bill to get started.
                            </p>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Bill ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Guest
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Due Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {allBills
                                    .filter(
                                      (b) =>
                                        billingFilter === "all" ||
                                        b.status === billingFilter,
                                    )
                                    .map((bill, index) => (
                                      <tr
                                        key={bill._id || index}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">
                                            #{bill._id?.slice(-6) || "N/A"}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            Booking:{" "}
                                            {typeof bill.bookingId === 'string' 
                                              ? bill.bookingId?.slice(-6) 
                                              : bill.bookingId?._id?.slice(-6) || bill.bookingId || "N/A"}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">
                                            {bill.guestName || "Unknown Guest"}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm font-bold text-gray-900">
                                            ${bill.amount || 0}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {new Date(
                                            bill.dueDate,
                                          ).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span
                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                              bill.status === "paid"
                                                ? "bg-green-100 text-green-800"
                                                : bill.status === "pending"
                                                  ? "bg-orange-100 text-orange-800"
                                                  : bill.status === "overdue"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-gray-100 text-gray-800"
                                            }`}
                                          >
                                            {bill.status || "unknown"}
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
                    <div>
                      {/* ── PAGE HEADER ─────────────────────────────────── */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-slate-800">
                              Analytics Dashboard
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                              Real-time overview of your entire hotel portfolio
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={fetchAnalyticsData}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 self-start sm:self-auto"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Refresh Data
                        </button>
                      </div>

                      {analyticsData.loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                          <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-slate-500 text-sm font-medium">
                            Loading analytics data…
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* ── ROW 1 · KPI CARDS ───────────────────────── */}
                          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
                            {/* Total Guests */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Total Guests
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">
                                    {allGuests.length}
                                  </p>
                                </div>
                                <div className="w-11 h-11 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </div>
                              </div>
                              <p className="text-xs text-cyan-600 mt-2 font-medium">
                                Registered guests
                              </p>
                            </div>
                            {/* Total Revenue */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Total Revenue
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">
                                    ${analyticsData.financialSummary.totalRevenue.toLocaleString()}
                                  </p>
                                </div>
                                <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              </div>
                              <p className="text-xs text-emerald-600 mt-2 font-medium">
                                All time earnings
                              </p>
                            </div>
                            {/* Occupancy Rate */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Occupancy
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">
                                    {analyticsData.occupancyRate}%
                                  </p>
                                </div>
                                <div className="w-11 h-11 bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                </div>
                              </div>
                              <p className="text-xs text-violet-600 mt-2 font-medium">
                                All branches
                              </p>
                            </div>
                            {/* Total Bookings */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Bookings
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">
                                    {bookings.length}
                                  </p>
                                </div>
                                <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              </div>
                              <p className="text-xs text-blue-600 mt-2 font-medium">
                                Total bookings
                              </p>
                            </div>
                            {/* Checked In */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Checked In
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">
                                    {
                                      bookings.filter(
                                        (b) => b.status === "CHECKED_IN",
                                      ).length
                                    }
                                  </p>
                                </div>
                                <div className="w-11 h-11 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              </div>
                              <p className="text-xs text-teal-600 mt-2 font-medium">
                                Active guests
                              </p>
                            </div>
                            {/* Available Rooms */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Available
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">
                                    {hotelsWithRooms.reduce(
                                      (s, h) => s + h.availableRooms,
                                      0,
                                    )}
                                  </p>
                                </div>
                                <div className="w-11 h-11 bg-gradient-to-br from-rose-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/25">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                                  </svg>
                                </div>
                              </div>
                              <p className="text-xs text-rose-600 mt-2 font-medium">
                                Rooms ready
                              </p>
                            </div>
                            {/* Cancelled */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Cancelled
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800 mt-2 group-hover:scale-110 transition-transform">
                                    {
                                      analyticsData.financialSummary
                                        .cancelledBookings
                                    }
                                  </p>
                                </div>
                                <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              </div>
                              <p className="text-xs text-orange-600 mt-2 font-medium">
                                Cancelled bookings
                              </p>
                            </div>
                          </div>

                          {/* ── ROW 2 · OCCUPANCY + FINANCIAL SUMMARY ───── */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Occupancy Rate – All Branches */}
                            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                      Occupancy Rate
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Live status across all branches
                                    </p>
                                  </div>
                                </div>
                                {/* Overall gauge */}
                                <div className="relative w-20 h-20 flex-shrink-0">
                                  <svg
                                    viewBox="0 0 36 36"
                                    className="w-20 h-20 -rotate-90"
                                  >
                                    <circle
                                      cx="18"
                                      cy="18"
                                      r="15.9"
                                      fill="none"
                                      stroke="#f1f5f9"
                                      strokeWidth="4"
                                    />
                                    <circle
                                      cx="18"
                                      cy="18"
                                      r="15.9"
                                      fill="none"
                                      stroke={
                                        analyticsData.occupancyRate >= 70
                                          ? "#10b981"
                                          : analyticsData.occupancyRate >= 40
                                            ? "#f59e0b"
                                            : "#ef4444"
                                      }
                                      strokeWidth="4"
                                      strokeDasharray={`${analyticsData.occupancyRate} ${100 - analyticsData.occupancyRate}`}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-bold text-slate-800">
                                      {analyticsData.occupancyRate}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Per-branch bars */}
                              {analyticsData.branchOccupancy.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                  No branch data available
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {analyticsData.branchOccupancy.map(
                                    (branch) => (
                                      <div key={branch.branchId}>
                                        <div className="flex justify-between items-center mb-1">
                                          <div>
                                            <span className="text-sm font-medium text-gray-700">
                                              {branch.branchName}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-1">
                                              ({branch.hotelName})
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">
                                              {branch.occupiedRooms}/
                                              {branch.totalRooms} rooms
                                            </span>
                                            <span
                                              className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                                branch.occupancyRate >= 70
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : branch.occupancyRate >= 40
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-red-100 text-red-700"
                                              }`}
                                            >
                                              {branch.occupancyRate}%
                                            </span>
                                          </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                                          <div
                                            className={`h-2.5 rounded-full transition-all ${
                                              branch.occupancyRate >= 70
                                                ? "bg-emerald-500"
                                                : branch.occupancyRate >= 40
                                                  ? "bg-amber-400"
                                                  : "bg-red-400"
                                            }`}
                                            style={{
                                              width: `${branch.occupancyRate}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                          <span>
                                            🟢 {branch.availableRooms} available
                                          </span>
                                          <span>
                                            🔴 {branch.occupiedRooms} occupied
                                          </span>
                                          {branch.maintenanceRooms > 0 && (
                                            <span>
                                              🟡 {branch.maintenanceRooms}{" "}
                                              maintenance
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-white rounded-xl shadow p-6">
                              <div className="mb-5">
                                <h3 className="text-base font-semibold text-gray-900">
                                  Financial Summary
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Revenue breakdown overview
                                </p>
                              </div>

                              {/* Revenue cards */}
                              <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <p className="text-xs text-emerald-600 font-semibold">
                                      Total Revenue
                                    </p>
                                  </div>
                                  <p className="text-2xl font-bold text-emerald-800">
                                    ${analyticsData.financialSummary.totalRevenue.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <p className="text-xs text-blue-600 font-semibold">
                                      Paid
                                    </p>
                                  </div>
                                  <p className="text-2xl font-bold text-blue-800">
                                    ${analyticsData.financialSummary.paidAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <p className="text-xs text-amber-600 font-semibold">
                                      Pending
                                    </p>
                                  </div>
                                  <p className="text-2xl font-bold text-amber-800">
                                    ${analyticsData.financialSummary.pendingAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <p className="text-xs text-violet-600 font-semibold">
                                      Total Bookings
                                    </p>
                                  </div>
                                  <p className="text-2xl font-bold text-violet-800">
                                    {analyticsData.financialSummary.totalBookings}
                                  </p>
                                </div>
                              </div>

                              {/* Stacked revenue bar */}
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-3">
                                  Payment Status Breakdown
                                </p>
                                {analyticsData.financialSummary.totalRevenue >
                                0 ? (
                                  <>
                                    <div className="flex h-4 rounded-xl overflow-hidden bg-slate-100 shadow-inner">
                                      <div
                                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
                                        style={{
                                          width: `${(analyticsData.financialSummary.paidAmount / analyticsData.financialSummary.totalRevenue) * 100}%`,
                                        }}
                                      >
                                        {Math.round(
                                          (analyticsData.financialSummary
                                            .paidAmount /
                                            analyticsData.financialSummary
                                              .totalRevenue) *
                                            100,
                                        ) > 10
                                          ? `${Math.round((analyticsData.financialSummary.paidAmount / analyticsData.financialSummary.totalRevenue) * 100)}%`
                                          : ""}
                                      </div>
                                      <div
                                        className="bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
                                        style={{
                                          width: `${(analyticsData.financialSummary.pendingAmount / analyticsData.financialSummary.totalRevenue) * 100}%`,
                                        }}
                                      >
                                        {Math.round(
                                          (analyticsData.financialSummary
                                            .pendingAmount /
                                            analyticsData.financialSummary
                                              .totalRevenue) *
                                            100,
                                        ) > 10
                                          ? `${Math.round((analyticsData.financialSummary.pendingAmount / analyticsData.financialSummary.totalRevenue) * 100)}%`
                                          : ""}
                                      </div>
                                    </div>
                                    <div className="flex gap-4 mt-3 text-xs font-medium">
                                      <span className="flex items-center gap-2 text-emerald-600">
                                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm"></span>
                                        Paid
                                      </span>
                                      <span className="flex items-center gap-2 text-amber-600">
                                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 shadow-sm"></span>
                                        Pending
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-xl">
                                    No revenue data available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </main>

            {/* Add Bill Modal */}
            {showAddBill && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Create New Bill
                    </h3>
                    <button
                      onClick={() => setShowAddBill(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleCreateBill}>
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Booking ID
                          </label>
                          <input
                            type="text"
                            value={billForm.bookingId}
                            onChange={(e) =>
                              setBillForm({
                                ...billForm,
                                bookingId: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guest Name
                          </label>
                          <input
                            type="text"
                            value={billForm.guestName}
                            onChange={(e) =>
                              setBillForm({
                                ...billForm,
                                guestName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={billForm.amount}
                            onChange={(e) =>
                              setBillForm({
                                ...billForm,
                                amount: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={billForm.dueDate}
                            onChange={(e) =>
                              setBillForm({
                                ...billForm,
                                dueDate: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={billForm.status}
                          onChange={(e) =>
                            setBillForm({ ...billForm, status: e.target.value })
                          }
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

            {/* Add Booking Modal */}
            {showAddBooking && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Create New Booking
                    </h3>
                    <button
                      onClick={() => setShowAddBooking(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleCreateBooking}>
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guest Name
                          </label>
                          <input
                            type="text"
                            value={bookingForm.guestName}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                guestName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter guest name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Room
                          </label>
                          <select
                            value={bookingForm.roomId}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                roomId: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          >
                            <option value="">Select a room</option>
                            {allRooms.map((room) => (
                              <option key={room._id} value={room._id}>
                                Room {room.roomNumber} -{" "}
                                {room.category || "Standard"} (${room.basePrice}
                                /night) [{room.branchName}]
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-in Date
                          </label>
                          <input
                            type="date"
                            value={bookingForm.checkIn}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                checkIn: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-out Date
                          </label>
                          <input
                            type="date"
                            value={bookingForm.checkOut}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                checkOut: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>
                      </div>
                      {bookingForm.checkIn &&
                        bookingForm.checkOut &&
                        bookingForm.roomId && (
                          <div className="mt-4 p-3 bg-indigo-50 rounded-md">
                            <p className="text-sm text-indigo-700">
                              Nights:{" "}
                              {Math.max(
                                0,
                                Math.ceil(
                                  (new Date(bookingForm.checkOut) -
                                    new Date(bookingForm.checkIn)) /
                                    (1000 * 60 * 60 * 24),
                                ),
                              )}{" "}
                              | Room Rate: $
                              {allRooms.find(
                                (r) => r._id === bookingForm.roomId,
                              )?.basePrice || 0}
                              /night
                            </p>
                          </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-3 px-6 pb-4">
                      <button
                        type="button"
                        onClick={() => setShowAddBooking(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                      >
                        Create Booking
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add Guest Modal */}
            {showAddGuest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Add New Guest
                    </h3>
                    <button
                      onClick={() => setShowAddGuest(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleCreateGuest}>
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={guestForm.name}
                            onChange={(e) =>
                              setGuestForm({
                                ...guestForm,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={guestForm.email}
                            onChange={(e) =>
                              setGuestForm({
                                ...guestForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={guestForm.phone}
                            onChange={(e) =>
                              setGuestForm({
                                ...guestForm,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ID Type
                          </label>
                          <select
                            value={guestForm.idType}
                            onChange={(e) =>
                              setGuestForm({
                                ...guestForm,
                                idType: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="">Select ID type</option>
                            <option value="passport">Passport</option>
                            <option value="driving_license">
                              Driving License
                            </option>
                            <option value="national_id">National ID</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ID Number
                          </label>
                          <input
                            type="text"
                            value={guestForm.idNumber}
                            onChange={(e) =>
                              setGuestForm({
                                ...guestForm,
                                idNumber: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={guestForm.address}
                            onChange={(e) =>
                              setGuestForm({
                                ...guestForm,
                                address: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 px-6 pb-4">
                      <button
                        type="button"
                        onClick={() => setShowAddGuest(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                      >
                        Add Guest
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Booking Details Modal */}
            {showBookingDetails && selectedBooking && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Booking Details
                    </h3>
                    <button
                      onClick={() => setShowBookingDetails(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="px-6 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Guest Name</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedBooking.guestName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span
                          className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                            selectedBooking.status === "BOOKED"
                              ? "bg-blue-100 text-blue-800"
                              : selectedBooking.status === "CHECKED_IN"
                                ? "bg-green-100 text-green-800"
                                : selectedBooking.status === "CHECKED_OUT"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedBooking.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Room</p>
                        <p className="text-sm font-medium text-gray-900">
                          Room{" "}
                          {selectedBooking.roomId?.roomNumber ||
                            selectedBooking.roomId}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Amount</p>
                        <p className="text-sm font-medium text-gray-900">
                          ${selectedBooking.totalAmount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Check-in</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(
                            selectedBooking.checkIn,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Check-out</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(
                            selectedBooking.checkOut,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t flex justify-end">
                    <button
                      onClick={() => setShowBookingDetails(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Details Modal */}
            {showGuestDetails && selectedGuest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Guest Details
                    </h3>
                    <button
                      onClick={() => setShowGuestDetails(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center mb-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-green-600 text-2xl font-bold">
                          {selectedGuest.name?.charAt(0).toUpperCase() || "G"}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {selectedGuest.name}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedGuest.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {selectedGuest.status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedGuest.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedGuest.phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ID Type</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedGuest.idType || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ID Number</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedGuest.idNumber || "N/A"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedGuest.address || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowGuestDetails(false);
                        setShowEditGuest(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowGuestDetails(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Edit Modal */}
            {showEditGuest && selectedGuest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Edit Guest
                    </h3>
                    <button
                      onClick={() => setShowEditGuest(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          defaultValue={selectedGuest.name}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue={selectedGuest.email}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          defaultValue={selectedGuest.phone}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          defaultValue={selectedGuest.address}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t flex justify-end space-x-2">
                    <button
                      onClick={() => setShowEditGuest(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        alert("Guest update coming soon!");
                        setShowEditGuest(false);
                        fetchAllGuests();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bill Details Modal */}
            {showBillDetails && selectedBill && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Bill Details
                    </h3>
                    <button
                      onClick={() => setShowBillDetails(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="px-6 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Bill ID</p>
                        <p className="text-sm font-medium text-gray-900">
                          #{selectedBill._id?.slice(-6) || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span
                          className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                            selectedBill.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : selectedBill.status === "pending"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedBill.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Guest Name</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedBill.guestName || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-sm font-bold text-gray-900">
                          ${selectedBill.amount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Booking ID</p>
                        <p className="text-sm font-medium text-gray-900">
                          #{typeof selectedBill.bookingId === 'string' 
                            ? selectedBill.bookingId?.slice(-6) 
                            : selectedBill.bookingId?._id?.slice(-6) || selectedBill.bookingId || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedBill.dueDate
                            ? new Date(
                                selectedBill.dueDate,
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowBillDetails(false);
                        setShowEditBill(true);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowBillDetails(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bill Edit Modal */}
            {showEditBill && selectedBill && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Edit Bill
                    </h3>
                    <button
                      onClick={() => setShowEditBill(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Guest Name
                        </label>
                        <input
                          type="text"
                          defaultValue={selectedBill.guestName}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          defaultValue={selectedBill.amount}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          defaultValue={selectedBill.dueDate?.slice(0, 10)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          defaultValue={selectedBill.status}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t flex justify-end space-x-2">
                    <button
                      onClick={() => setShowEditBill(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        alert("Bill update coming soon!");
                        setShowEditBill(false);
                        fetchAllBills();
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
}
