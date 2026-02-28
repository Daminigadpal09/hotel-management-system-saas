import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  hotelAPI,
  branchAPI,
  roomAPI,
  bookingAPI,
  billingAPI,
} from "../services/api.js";

export default function HotelOwnerDashboard() {
  const [hotels, setHotels] = useState([]);
  const [hotelsWithRooms, setHotelsWithRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // View toggle state
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' or 'bookings'

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

  // Room Status State
  const [roomSearch, setRoomSearch] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState("all");

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

  // Branch Management State
  const [allBranches, setAllBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchFilter, setBranchFilter] = useState("all");
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showEditBranch, setShowEditBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    hotel_id: "",
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
    email: "",
    description: "",
    gstNumber: "",
    checkInTime: "12:00",
    checkOutTime: "11:00",
    status: "active",
  });

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
        guestId: billForm.bookingId, // Use bookingId as guestId for now
        amount: parseFloat(billForm.amount),
        dueDate: billForm.dueDate,
        status: billForm.status || "pending",
        description: billForm.description || "",
        hotelId: selectedHotel?._id,
        branchId: selectedBranch?._id,
        createdAt: new Date().toISOString(),
        items: [], // Add empty items array to prevent reduce error
        taxes: [], // Add empty taxes array
        discounts: [], // Add empty discounts array
      };

      await billingAPI.createInvoice(billData);
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

  // ── Branch Management Functions ──────────────────────────────────────────

  const resetBranchForm = (firstHotelId = "") => {
    setBranchForm({
      hotel_id: firstHotelId,
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      phone: "",
      email: "",
      description: "",
      gstNumber: "",
      checkInTime: "12:00",
      checkOutTime: "11:00",
      status: "active",
    });
  };

  const fetchAllBranches = async () => {
    setBranchLoading(true);
    try {
      const currentHotels =
        hotels.length > 0 ? hotels : (await hotelAPI.getHotels()).data || [];
      let branches = [];
      for (const hotel of currentHotels) {
        try {
          const data = await branchAPI.getBranches(hotel._id);
          const enriched = (data.data || []).map((b) => ({
            ...b,
            hotelName: hotel.name,
            hotel_id: hotel._id,
          }));
          branches = [...branches, ...enriched];
        } catch (e) {
          console.error("Error fetching branches for hotel", hotel._id, e);
        }
      }
      setAllBranches(branches);
    } catch (error) {
      console.error("Error fetching all branches:", error);
    } finally {
      setBranchLoading(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      const { hotel_id, ...rest } = branchForm;
      await branchAPI.createBranch(hotel_id, rest);
      setShowAddBranch(false);
      resetBranchForm(hotels[0]?._id || "");
      fetchAllBranches();
    } catch (error) {
      alert("Error creating branch: " + error.message);
    }
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    try {
      const { hotel_id, ...rest } = branchForm;
      await branchAPI.updateBranch(
        String(hotel_id),
        String(selectedBranch._id),
        rest,
      );
      setShowEditBranch(false);
      setSelectedBranch(null);
      fetchAllBranches();
    } catch (error) {
      alert("Error updating branch: " + error.message);
    }
  };

  const handleDeleteBranch = async (branch) => {
    if (
      !window.confirm(`Delete branch "${branch.name}"? This cannot be undone.`)
    )
      return;
    try {
      await branchAPI.deleteBranch(String(branch.hotel_id), String(branch._id));
      fetchAllBranches();
    } catch (error) {
      alert("Error deleting branch: " + error.message);
    }
  };

  const openEditBranch = (branch) => {
    setSelectedBranch(branch);
    setBranchForm({
      hotel_id: branch.hotel_id,
      name: branch.name || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      pincode: branch.pincode || "",
      country: branch.country || "India",
      phone: branch.phone || "",
      email: branch.email || "",
      description: branch.description || "",
      gstNumber: branch.gstNumber || "",
      checkInTime: branch.checkInTime || "12:00",
      checkOutTime: branch.checkOutTime || "11:00",
      status: branch.status || "active",
    });
    setShowEditBranch(true);
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
    } else if (activeView === "hotels") {
      fetchHotels();
    } else if (activeView === "branches") {
      fetchAllBranches();
    } else if (activeView === "bookings") {
      fetchAllRooms();
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
              <h1 className="text-xl font-semibold text-gray-900">
                Hotel Owner Dashboard
              </h1>
              <p className="text-sm text-gray-500">{user.name}</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Main
              </h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView("dashboard");
                }}
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 bg-indigo-50 text-indigo-700 w-full text-left"
              >
                <svg
                  className="mr-3 h-5 w-5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7"
                  />
                </svg>
                Dashboard
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Hotel Management
              </h3>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(
                    activeView === "hotels" ? "dashboard" : "hotels",
                  );
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "hotels"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                My Hotels
              </Link>

              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(
                    activeView === "branches" ? "dashboard" : "branches",
                  );
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "branches"
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
                Branch Management
              </Link>

              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(
                    activeView === "bookings" ? "dashboard" : "bookings",
                  );
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "bookings"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
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
                Booking Management
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(
                    activeView === "guests" ? "dashboard" : "guests",
                  );
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "guests"
                    ? "bg-green-50 text-green-700"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
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
                Guest Management
              </Link>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(
                    activeView === "billing" ? "dashboard" : "billing",
                  );
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === "billing"
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
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
                Billing & Payments
              </Link>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                System
              </h3>
              <Link
                to="/"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <svg
                  className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7"
                  />
                </svg>
                Back to Home
              </Link>
              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:text-red-900 hover:bg-red-50"
              >
                <svg
                  className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
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
                <h2 className="text-xl font-semibold text-gray-900">
                  Hotel Management Dashboard
                </h2>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <div className="flex items-center space-x-3 pl-4 border-l">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <>
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                  {activeView === "bookings" ? (
                    <>
                    {/* Booking Management Only View */}
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
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
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

                    {/* Room Status Section */}
                    <div className="bg-white rounded-lg shadow mt-8">
                      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            Room Status ({allRooms.length})
                          </h3>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            Live
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative">
                            <svg
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                            <input
                              type="text"
                              placeholder="Search room, category..."
                              value={roomSearch}
                              onChange={(e) => setRoomSearch(e.target.value)}
                              className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-48"
                            />
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {[
                              "all",
                              "available",
                              "occupied",
                              "cleaning",
                              "maintenance",
                              "out_of_order",
                            ].map((s) => (
                              <button
                                key={s}
                                onClick={() => setRoomStatusFilter(s)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                  roomStatusFilter === s
                                    ? s === "all"
                                      ? "bg-gray-800 text-white"
                                      : s === "available"
                                        ? "bg-green-600 text-white"
                                        : s === "occupied"
                                          ? "bg-blue-600 text-white"
                                          : s === "cleaning"
                                            ? "bg-yellow-500 text-white"
                                            : s === "maintenance"
                                              ? "bg-red-600 text-white"
                                              : "bg-gray-500 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {s === "all"
                                  ? `All (${allRooms.length})`
                                  : `${s.replace("_", " ")} (${allRooms.filter((r) => r.status === s).length})`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Status summary strips */}
                      <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2">
                        {[
                          {
                            label: "Available",
                            status: "available",
                            dot: "bg-green-500",
                            chip: "bg-green-50 text-green-700 border-green-200",
                          },
                          {
                            label: "Occupied",
                            status: "occupied",
                            dot: "bg-blue-500",
                            chip: "bg-blue-50 text-blue-700 border-blue-200",
                          },
                          {
                            label: "Cleaning",
                            status: "cleaning",
                            dot: "bg-yellow-500",
                            chip: "bg-yellow-50 text-yellow-700 border-yellow-200",
                          },
                          {
                            label: "Maintenance",
                            status: "maintenance",
                            dot: "bg-red-500",
                            chip: "bg-red-50 text-red-700 border-red-200",
                          },
                          {
                            label: "Out of Order",
                            status: "out_of_order",
                            dot: "bg-gray-400",
                            chip: "bg-gray-100 text-gray-600 border-gray-200",
                          },
                        ].map(({ label, status, dot, chip }) => (
                          <span
                            key={status}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${chip}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${dot}`} />
                            {label}: {allRooms.filter((r) => r.status === status).length}
                          </span>
                        ))}
                      </div>

                      {allRooms.length === 0 ? (
                        <div className="text-center py-12 text-sm text-gray-400">
                          <svg
                            className="w-12 h-12 mx-auto mb-3 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7"
                            />
                          </svg>
                          No rooms found.
                        </div>
                      ) : (
                        (() => {
                          const statusConfig = {
                            available: {
                              label: "Available",
                              bg: "bg-green-50",
                              text: "text-green-700",
                              border: "border-green-200",
                              dot: "bg-green-500",
                            },
                            occupied: {
                              label: "Occupied",
                              bg: "bg-blue-50",
                              text: "text-blue-700",
                              border: "border-blue-200",
                              dot: "bg-blue-500",
                            },
                            cleaning: {
                              label: "Cleaning",
                              bg: "bg-yellow-50",
                              text: "text-yellow-700",
                              border: "border-yellow-200",
                              dot: "bg-yellow-500",
                            },
                            maintenance: {
                              label: "Maintenance",
                              bg: "bg-red-50",
                              text: "text-red-700",
                              border: "border-red-200",
                              dot: "bg-red-500",
                            },
                            out_of_order: {
                              label: "Out of Order",
                              bg: "bg-gray-100",
                              text: "text-gray-600",
                              border: "border-gray-200",
                              dot: "bg-gray-400",
                            },
                          };

                          const filteredRooms = allRooms.filter((r) => {
                            const matchStatus =
                              roomStatusFilter === "all" ||
                              r.status === roomStatusFilter;
                            const q = roomSearch.toLowerCase();
                            const matchSearch =
                              !q ||
                              String(r.roomNumber).toLowerCase().includes(q) ||
                              r.category?.toLowerCase().includes(q) ||
                              r.type?.toLowerCase().includes(q);
                            return matchStatus && matchSearch;
                          });

                          return filteredRooms.length === 0 ? (
                            <p className="text-center py-10 text-sm text-gray-400">
                              No rooms match your search or filter.
                            </p>
                          ) : (
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                              {filteredRooms.map((room) => {
                                const sc =
                                  statusConfig[room.status] || statusConfig.available;
                                return (
                                  <div
                                    key={room._id}
                                    className={`border rounded-xl p-4 flex flex-col gap-2 ${sc.border} hover:shadow-md transition-shadow`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xl font-bold text-gray-800">
                                        #{room.roomNumber}
                                      </span>
                                      <span
                                        className={`w-2.5 h-2.5 rounded-full ${sc.dot}`}
                                        title={sc.label}
                                      />
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700 capitalize">
                                        {room.category}
                                      </p>
                                      <p className="text-xs text-gray-400 capitalize">
                                        {room.type} · Floor {room.floor}
                                      </p>
                                    </div>
                                    <div className="mt-auto pt-1">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                                        />
                                        {sc.label}
                                      </span>
                                      <p className="text-xs text-gray-400 mt-1.5 font-medium">
                                        ${room.basePrice?.toLocaleString()}/night
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}

                      <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                        Showing{" "}
                        {
                          allRooms.filter((r) => {
                            const matchStatus =
                              roomStatusFilter === "all" ||
                              r.status === roomStatusFilter;
                            const q = roomSearch.toLowerCase();
                            return (
                              matchStatus &&
                              (!q ||
                                String(r.roomNumber).toLowerCase().includes(q) ||
                                r.category?.toLowerCase().includes(q) ||
                                r.type?.toLowerCase().includes(q))
                            );
                          }).length
                        }{" "}
                        of {allRooms.length} rooms
                      </div>
                    </div>
                    </>
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
                                            {bill.bookingId?.slice(-6) || "N/A"}
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
                  ) : activeView === "hotels" ? (
                    /* ── MY HOTELS VIEW ─────────────────────────────────── */
                    <div>
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            My Hotels
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            All hotels registered in your portfolio
                          </p>
                        </div>
                        <button
                          onClick={fetchHotels}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors self-start sm:self-auto"
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
                          Refresh
                        </button>
                      </div>

                      {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-gray-500 text-sm">
                            Loading hotels…
                          </p>
                        </div>
                      ) : hotelsWithRooms.length === 0 ? (
                        <div className="bg-white rounded-xl shadow p-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            No hotels found
                          </h3>
                          <p className="text-sm text-gray-500">
                            No hotels are registered in the database yet.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {hotelsWithRooms.map((hotel) => (
                            <div
                              key={hotel._id}
                              className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6 flex flex-col"
                            >
                              {/* Card Header: name + status badge */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold text-gray-900 truncate">
                                    {hotel.name}
                                  </h3>
                                  {hotel.email && (
                                    <p className="text-sm text-gray-500 truncate">
                                      {hotel.email}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`ml-2 flex-shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                    hotel.status === "active"
                                      ? "bg-green-100 text-green-700"
                                      : hotel.status === "suspended"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {hotel.status}
                                </span>
                              </div>

                              {/* Contact & Address */}
                              {hotel.phone && (
                                <p className="text-sm text-gray-500 mb-1">
                                  📞 {hotel.phone}
                                </p>
                              )}
                              {hotel.address && (
                                <p className="text-sm text-gray-600 mb-4 truncate">
                                  📍 {hotel.address}
                                </p>
                              )}

                              {/* Stats row */}
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-blue-50 rounded-lg p-2 text-center">
                                  <p className="text-xl font-bold text-blue-700">
                                    {hotel.branches}
                                  </p>
                                  <p className="text-xs text-blue-500 font-medium">
                                    Branches
                                  </p>
                                </div>
                                <div className="bg-indigo-50 rounded-lg p-2 text-center">
                                  <p className="text-xl font-bold text-indigo-700">
                                    {hotel.totalRooms}
                                  </p>
                                  <p className="text-xs text-indigo-500 font-medium">
                                    Rooms
                                  </p>
                                </div>
                                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                  <p className="text-xl font-bold text-emerald-700">
                                    {hotel.availableRooms}
                                  </p>
                                  <p className="text-xs text-emerald-500 font-medium">
                                    Available
                                  </p>
                                </div>
                              </div>

                              {/* GST number if present */}
                              {hotel.gstNumber && (
                                <p className="text-xs text-gray-400 mb-3">
                                  GST: {hotel.gstNumber}
                                </p>
                              )}

                              {/* Footer */}
                              <div className="mt-auto border-t pt-3 flex items-center justify-between">
                                <span className="capitalize bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">
                                  {hotel.subscription_plan || "free"} plan
                                </span>
                                <span className="text-xs text-gray-400">
                                  Since{" "}
                                  {new Date(hotel.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : activeView === "branches" ? (
                    /* ── BRANCH MANAGEMENT VIEW ─────────────────────────── */
                    <div>
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Branch Management
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            Manage branches across all your hotels
                          </p>
                        </div>
                        <div className="flex gap-2 self-start sm:self-auto">
                          <button
                            onClick={fetchAllBranches}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
                            Refresh
                          </button>
                          <button
                            onClick={() => {
                              resetBranchForm(hotels[0]?._id || "");
                              setShowAddBranch(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
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
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Add Branch
                          </button>
                        </div>
                      </div>

                      {/* Hotel Filter Tabs */}
                      <div className="flex flex-wrap gap-2 mb-5">
                        <button
                          onClick={() => setBranchFilter("all")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            branchFilter === "all"
                              ? "bg-teal-100 text-teal-700"
                              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          All ({allBranches.length})
                        </button>
                        {hotels.map((hotel) => (
                          <button
                            key={hotel._id}
                            onClick={() => setBranchFilter(String(hotel._id))}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              branchFilter === String(hotel._id)
                                ? "bg-teal-100 text-teal-700"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {hotel.name} (
                            {
                              allBranches.filter(
                                (b) => String(b.hotel_id) === String(hotel._id),
                              ).length
                            }
                            )
                          </button>
                        ))}
                      </div>

                      {/* Branch Table */}
                      {branchLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-gray-500 text-sm">
                            Loading branches…
                          </p>
                        </div>
                      ) : (
                        (() => {
                          const filtered =
                            branchFilter === "all"
                              ? allBranches
                              : allBranches.filter(
                                  (b) => String(b.hotel_id) === branchFilter,
                                );
                          return filtered.length === 0 ? (
                            <div className="bg-white rounded-xl shadow p-12 text-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                                  />
                                </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                No branches found
                              </h3>
                              <p className="text-sm text-gray-500 mb-4">
                                {branchFilter === "all"
                                  ? "No branches have been created yet."
                                  : "No branches for this hotel yet."}
                              </p>
                              <button
                                onClick={() => {
                                  resetBranchForm(
                                    branchFilter !== "all"
                                      ? branchFilter
                                      : hotels[0]?._id || "",
                                  );
                                  setShowAddBranch(true);
                                }}
                                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
                              >
                                Add First Branch
                              </button>
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl shadow overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Branch Name
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hotel
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Location
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Check-In / Out
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
                                    {filtered.map((branch) => (
                                      <tr
                                        key={branch._id}
                                        className="hover:bg-gray-50 transition-colors"
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm font-semibold text-gray-900">
                                            {branch.name}
                                          </div>
                                          {branch.gstNumber && (
                                            <div className="text-xs text-gray-400 mt-0.5">
                                              GST: {branch.gstNumber}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className="text-sm text-gray-700">
                                            {branch.hotelName}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="text-sm text-gray-900">
                                            {branch.city}, {branch.state}
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {branch.pincode}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {branch.phone}
                                          </div>
                                          {branch.email && (
                                            <div className="text-xs text-gray-400">
                                              {branch.email}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                          {branch.checkInTime || "12:00"} /{" "}
                                          {branch.checkOutTime || "11:00"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span
                                            className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                              branch.status === "active"
                                                ? "bg-green-100 text-green-800"
                                                : branch.status ===
                                                    "maintenance"
                                                  ? "bg-yellow-100 text-yellow-800"
                                                  : "bg-red-100 text-red-800"
                                            }`}
                                          >
                                            {branch.status}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={() =>
                                                openEditBranch(branch)
                                              }
                                              className="text-teal-600 hover:text-teal-900 font-medium"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteBranch(branch)
                                              }
                                              className="text-red-600 hover:text-red-900 font-medium"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* ── Add Branch Modal ────────────────────────────── */}
                      {showAddBranch && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b flex justify-between items-center">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Add New Branch
                              </h3>
                              <button
                                onClick={() => setShowAddBranch(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                              >
                                ×
                              </button>
                            </div>
                            <form onSubmit={handleCreateBranch}>
                              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Hotel selector */}
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hotel{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    required
                                    value={branchForm.hotel_id}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        hotel_id: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  >
                                    <option value="">Select a hotel</option>
                                    {hotels.map((h) => (
                                      <option key={h._id} value={h._id}>
                                        {h.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Branch Name{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.name}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        name: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="e.g. Downtown Branch"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="tel"
                                    required
                                    value={branchForm.phone}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        phone: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="+91-9876543210"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.address}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        address: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Street address"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.city}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        city: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.state}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        state: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pincode{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.pincode}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        pincode: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={branchForm.email}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        email: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Check-In Time
                                  </label>
                                  <input
                                    type="time"
                                    value={branchForm.checkInTime}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        checkInTime: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Check-Out Time
                                  </label>
                                  <input
                                    type="time"
                                    value={branchForm.checkOutTime}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        checkOutTime: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    GST Number
                                  </label>
                                  <input
                                    type="text"
                                    value={branchForm.gstNumber}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        gstNumber: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={branchForm.status}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        status: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">
                                      Maintenance
                                    </option>
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={branchForm.description}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        description: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Optional description..."
                                  />
                                </div>
                              </div>
                              <div className="px-6 py-4 border-t flex justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => setShowAddBranch(false)}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                                >
                                  Create Branch
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* ── Edit Branch Modal ───────────────────────────── */}
                      {showEditBranch && selectedBranch && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b flex justify-between items-center">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Edit Branch — {selectedBranch.name}
                              </h3>
                              <button
                                onClick={() => {
                                  setShowEditBranch(false);
                                  setSelectedBranch(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                              >
                                ×
                              </button>
                            </div>
                            <form onSubmit={handleUpdateBranch}>
                              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Branch Name{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.name}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        name: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="tel"
                                    required
                                    value={branchForm.phone}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        phone: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.address}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        address: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.city}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        city: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.state}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        state: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pincode{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={branchForm.pincode}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        pincode: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={branchForm.email}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        email: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Check-In Time
                                  </label>
                                  <input
                                    type="time"
                                    value={branchForm.checkInTime}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        checkInTime: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Check-Out Time
                                  </label>
                                  <input
                                    type="time"
                                    value={branchForm.checkOutTime}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        checkOutTime: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    GST Number
                                  </label>
                                  <input
                                    type="text"
                                    value={branchForm.gstNumber}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        gstNumber: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={branchForm.status}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        status: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">
                                      Maintenance
                                    </option>
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={branchForm.description}
                                    onChange={(e) =>
                                      setBranchForm({
                                        ...branchForm,
                                        description: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Optional description..."
                                  />
                                </div>
                              </div>
                              <div className="px-6 py-4 border-t flex justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowEditBranch(false);
                                    setSelectedBranch(null);
                                  }}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* ── PAGE HEADER ─────────────────────────────────── */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Analytics Dashboard
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            Real-time overview of your entire hotel portfolio
                          </p>
                        </div>
                        <button
                          onClick={fetchAnalyticsData}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors self-start sm:self-auto"
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
                          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-gray-500 text-sm">
                            Loading analytics data…
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* ── ROW 1 · KPI CARDS ───────────────────────── */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                            {/* Total Revenue */}
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow">
                              <p className="text-xs font-medium text-indigo-100 uppercase tracking-wide">
                                Total Revenue
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                $
                                {analyticsData.financialSummary.totalRevenue.toLocaleString()}
                              </p>
                              <p className="text-xs text-indigo-200 mt-1">
                                All time
                              </p>
                            </div>
                            {/* Occupancy Rate */}
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow">
                              <p className="text-xs font-medium text-emerald-100 uppercase tracking-wide">
                                Occupancy
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {analyticsData.occupancyRate}%
                              </p>
                              <p className="text-xs text-emerald-200 mt-1">
                                All branches
                              </p>
                            </div>
                            {/* Total Bookings */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow">
                              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">
                                Bookings
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {bookings.length}
                              </p>
                              <p className="text-xs text-blue-200 mt-1">
                                Total
                              </p>
                            </div>
                            {/* Checked In */}
                            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white shadow">
                              <p className="text-xs font-medium text-teal-100 uppercase tracking-wide">
                                Checked In
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {
                                  bookings.filter(
                                    (b) => b.status === "CHECKED_IN",
                                  ).length
                                }
                              </p>
                              <p className="text-xs text-teal-200 mt-1">
                                Active guests
                              </p>
                            </div>
                            {/* Available Rooms */}
                            <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-4 text-white shadow">
                              <p className="text-xs font-medium text-violet-100 uppercase tracking-wide">
                                Available
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {hotelsWithRooms.reduce(
                                  (s, h) => s + h.availableRooms,
                                  0,
                                )}
                              </p>
                              <p className="text-xs text-violet-200 mt-1">
                                Rooms
                              </p>
                            </div>
                            {/* Cancelled */}
                            <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-4 text-white shadow">
                              <p className="text-xs font-medium text-rose-100 uppercase tracking-wide">
                                Cancelled
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {
                                  analyticsData.financialSummary
                                    .cancelledBookings
                                }
                              </p>
                              <p className="text-xs text-rose-200 mt-1">
                                Bookings
                              </p>
                            </div>
                          </div>

                          {/* ── ROW 2 · OCCUPANCY + FINANCIAL SUMMARY ───── */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Occupancy Rate – All Branches */}
                            <div className="bg-white rounded-xl shadow p-6">
                              <div className="flex items-center justify-between mb-5">
                                <div>
                                  <h3 className="text-base font-semibold text-gray-900">
                                    Occupancy Rate
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Live status across all branches
                                  </p>
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
                                      stroke="#e5e7eb"
                                      strokeWidth="3.5"
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
                                      strokeWidth="3.5"
                                      strokeDasharray={`${analyticsData.occupancyRate} ${100 - analyticsData.occupancyRate}`}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-bold text-gray-900">
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
                              <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                  <p className="text-xs text-green-600 font-medium">
                                    Total Revenue
                                  </p>
                                  <p className="text-xl font-bold text-green-800 mt-0.5">
                                    $
                                    {analyticsData.financialSummary.totalRevenue.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                  <p className="text-xs text-blue-600 font-medium">
                                    Paid
                                  </p>
                                  <p className="text-xl font-bold text-blue-800 mt-0.5">
                                    $
                                    {analyticsData.financialSummary.paidAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                  <p className="text-xs text-amber-600 font-medium">
                                    Pending
                                  </p>
                                  <p className="text-xl font-bold text-amber-800 mt-0.5">
                                    $
                                    {analyticsData.financialSummary.pendingAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                                  <p className="text-xs text-purple-600 font-medium">
                                    Total Bookings
                                  </p>
                                  <p className="text-xl font-bold text-purple-800 mt-0.5">
                                    {
                                      analyticsData.financialSummary
                                        .totalBookings
                                    }
                                  </p>
                                </div>
                              </div>

                              {/* Stacked revenue bar */}
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-2">
                                  Payment Status Breakdown
                                </p>
                                {analyticsData.financialSummary.totalRevenue >
                                0 ? (
                                  <>
                                    <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
                                      <div
                                        className="bg-green-500 flex items-center justify-center text-white text-xs font-medium transition-all"
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
                                        className="bg-amber-400 flex items-center justify-center text-white text-xs font-medium transition-all"
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
                                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                                        Paid
                                      </span>
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                                        Pending
                                      </span>
                                    </div>
                                  </>
                                ) : null}
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
                          #{selectedBill.bookingId?.slice(-6) || "N/A"}
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
