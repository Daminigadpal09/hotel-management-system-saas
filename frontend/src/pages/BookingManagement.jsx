import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { bookingAPI, roomAPI, branchAPI, userAPI } from "../services/api.js";

export default function BookingManagement() {
  const { hotelId, branchId } = useParams();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(branchId || "");
  const [selectedHotel, setSelectedHotel] = useState(hotelId || "");
  const navigate = useNavigate();

  const actualBranchId = branchId || selectedBranch;
  const actualHotelId = hotelId || selectedHotel;
  const isHotelWideView = !branchId && !selectedBranch;

  // Form state for new booking
  const [bookingForm, setBookingForm] = useState({
    guestId: "",
    guestName: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    totalAmount: 0
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    if (actualHotelId) {
      fetchBookings();
      fetchBranches();
      fetchGuests();
      if (actualBranchId) {
        fetchRooms();
      }
    } else {
      setLoading(false);
    }
  }, [actualHotelId, actualBranchId]);

  const fetchHotels = async () => {
    try {
      // Import hotelAPI here to avoid circular dependency
      const { hotelAPI } = await import("../services/api.js");
      const data = await hotelAPI.getHotels();
      setHotels(data.data || data);
    } catch (error) {
      console.error("Error fetching hotels:", error);
    }
  };

  const fetchBookings = async () => {
    try {
      let data;
      if (actualBranchId) {
        data = await bookingAPI.getBookingsByBranch(actualHotelId, actualBranchId);
      } else {
        data = await bookingAPI.getBookingsByHotel(actualHotelId);
      }
      setBookings(data.data || data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await roomAPI.getRooms(actualHotelId, actualBranchId);
      setRooms(data.data || data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await branchAPI.getBranches(actualHotelId);
      setBranches(data.data || data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchGuests = async () => {
    try {
      const data = await userAPI.guestAPI.getGuests({ limit: 100 }); // Get more guests for selection
      setGuests(data.data || data);
    } catch (error) {
      console.error("Error fetching guests:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "BOOKED":
        return "bg-blue-100 text-blue-800";
      case "CHECKED_IN":
        return "bg-green-100 text-green-800";
      case "CHECKED_OUT":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === "all") return true;
    return booking.status === filter;
  });

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!actualBranchId) {
      alert("Please select a branch first");
      return;
    }

    try {
      const bookingData = {
        ...bookingForm,
        hotelId: actualHotelId,
        branchId: actualBranchId,
        checkIn: new Date(bookingForm.checkIn),
        checkOut: new Date(bookingForm.checkOut)
      };

      await bookingAPI.createBooking(bookingData);
      setShowAddBooking(false);
      setBookingForm({
        guestName: "",
        roomId: "",
        checkIn: "",
        checkOut: "",
        totalAmount: 0
      });
      fetchBookings();
      alert("Booking created successfully!");
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Error creating booking: " + error.message);
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      await bookingAPI.checkIn(bookingId);
      fetchBookings();
      alert("Check-in successful!");
    } catch (error) {
      console.error("Error checking in:", error);
      alert("Error checking in: " + error.message);
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      await bookingAPI.checkOut(bookingId);
      fetchBookings();
      alert("Check-out successful!");
    } catch (error) {
      console.error("Error checking out:", error);
      alert("Error checking out: " + error.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await bookingAPI.cancelBooking(bookingId);
        fetchBookings();
        alert("Booking cancelled successfully!");
      } catch (error) {
        console.error("Error cancelling booking:", error);
        alert("Error cancelling booking: " + error.message);
      }
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this cancelled booking?')) {
      try {
        await bookingAPI.deleteBooking(bookingId);
        fetchBookings();
        alert("Booking deleted successfully!");
      } catch (error) {
        console.error("Error deleting booking:", error);
        alert("Error deleting booking: " + error.message);
      }
    }
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    try {
      await bookingAPI.updateBooking(editingBooking._id, bookingForm);
      setEditingBooking(null);
      setBookingForm({
        guestName: "",
        roomId: "",
        checkIn: "",
        checkOut: "",
        totalAmount: 0
      });
      fetchBookings();
      alert("Booking updated successfully!");
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Error updating booking: " + error.message);
    }
  };

  const startEditBooking = (booking) => {
    setEditingBooking(booking);
    setBookingForm({
      guestName: booking.guestName,
      roomId: booking.roomId?._id || booking.roomId,
      checkIn: new Date(booking.checkIn).toISOString().split('T')[0],
      checkOut: new Date(booking.checkOut).toISOString().split('T')[0],
      totalAmount: booking.totalAmount
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Booking Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/owner-dashboard" className="text-sm text-gray-600 hover:text-gray-800">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Hotel and Branch Selection (for sidebar access) */}
          {!hotelId && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Select Hotel:</label>
                  <select
                    value={selectedHotel}
                    onChange={(e) => {
                      setSelectedHotel(e.target.value);
                      setSelectedBranch(""); // Reset branch when hotel changes
                    }}
                    className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a hotel</option>
                    {hotels.map((hotel) => (
                      <option key={hotel._id} value={hotel._id}>
                        {hotel.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedHotel && (
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Select Branch:</label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">All Branches</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} ({branch.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Branch Selection (for hotel-wide view) */}
          {isHotelWideView && hotelId && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Select Branch:</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{bookings.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Booked</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {bookings.filter(b => b.status === "BOOKED").length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Checked In</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {bookings.filter(b => b.status === "CHECKED_IN").length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Checked Out</h3>
              <p className="text-2xl font-bold text-gray-600 mt-2">
                {bookings.filter(b => b.status === "CHECKED_OUT").length}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Bookings</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddBooking(!showAddBooking)}
                  disabled={!actualHotelId || !actualBranchId}
                  className={`px-4 py-2 rounded ${
                    !actualHotelId || !actualBranchId 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {showAddBooking ? "Cancel" : "Create Booking"}
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {showHistory ? "Hide History" : "Show History"}
                </button>
              </div>
            </div>
          </div>

          {/* Add/Edit Booking Form */}
          {(showAddBooking || editingBooking) && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingBooking ? "Edit Booking" : "Create New Booking"}
              </h3>
              <form onSubmit={editingBooking ? handleUpdateBooking : handleCreateBooking} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest</label>
                  <select
                    required
                    value={bookingForm.guestId}
                    onChange={(e) => {
                      const selectedGuest = guests.find(g => g._id === e.target.value);
                      setBookingForm({
                        ...bookingForm, 
                        guestId: e.target.value,
                        guestName: selectedGuest ? selectedGuest.name : ""
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Guest</option>
                    {guests.map(guest => (
                      <option key={guest._id} value={guest._id}>
                        {guest.name} ({guest.phone})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={bookingForm.guestName}
                    onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})}
                    placeholder="Or enter guest name manually"
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <select
                    required
                    value={bookingForm.roomId}
                    onChange={(e) => setBookingForm({...bookingForm, roomId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a room</option>
                    {rooms.filter(room => room.status === 'available').map((room) => (
                      <option key={room._id} value={room._id}>
                        {room.roomNumber} - {room.category} (${room.basePrice}/night)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.checkIn}
                    onChange={(e) => setBookingForm({...bookingForm, checkIn: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.checkOut}
                    onChange={(e) => setBookingForm({...bookingForm, checkOut: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <input
                    type="number"
                    required
                    value={bookingForm.totalAmount}
                    onChange={(e) => setBookingForm({...bookingForm, totalAmount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    {editingBooking ? "Update Booking" : "Create Booking"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBooking(false);
                      setEditingBooking(null);
                      setBookingForm({
                        guestName: "",
                        roomId: "",
                        checkIn: "",
                        checkOut: "",
                        totalAmount: 0
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter Section */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded ${
                  filter === "all" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("BOOKED")}
                className={`px-4 py-2 rounded ${
                  filter === "BOOKED" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Booked
              </button>
              <button
                onClick={() => setFilter("CHECKED_IN")}
                className={`px-4 py-2 rounded ${
                  filter === "CHECKED_IN" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Checked In
              </button>
              <button
                onClick={() => setFilter("CHECKED_OUT")}
                className={`px-4 py-2 rounded ${
                  filter === "CHECKED_OUT" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Checked Out
              </button>
              <button
                onClick={() => setFilter("CANCELLED")}
                className={`px-4 py-2 rounded ${
                  filter === "CANCELLED" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancelled
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          {filteredBookings.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-center py-8">
                <p className="text-gray-500">No bookings found.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.roomId ? (booking.roomId.roomNumber || booking.roomId) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(booking.checkIn).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(booking.checkOut).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${booking.totalAmount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {booking.status === "BOOKED" && (
                          <button
                            onClick={() => handleCheckIn(booking._id)}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            Check In
                          </button>
                        )}
                        {booking.status === "CHECKED_IN" && (
                          <button
                            onClick={() => handleCheckOut(booking._id)}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                          >
                            Check Out
                          </button>
                        )}
                        {(booking.status === "BOOKED" || booking.status === "CHECKED_IN") && (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="text-red-600 hover:text-red-900 mr-2"
                          >
                            Cancel
                          </button>
                        )}
                        {booking.status === "BOOKED" && (
                          <button
                            onClick={() => startEditBooking(booking)}
                            className="text-indigo-600 hover:text-indigo-900 mr-2"
                          >
                            Edit
                          </button>
                        )}
                        {booking.status === "CANCELLED" && (
                          <button
                            onClick={() => handleDeleteBooking(booking._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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
      </main>
    </div>
  );
}
