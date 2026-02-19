import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { roomAPI, branchAPI } from "../services/api.js";

export default function RoomManagement() {
  const { hotelId, branchId } = useParams();
  const [rooms, setRooms] = useState([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "", status: "", floor: "" });
  const navigate = useNavigate();

  // Handle both route patterns: /rooms/:hotelId/:branchId and /hotel-rooms/:hotelId
  const actualBranchId = branchId || null; // branchId will be undefined for /hotel-rooms route
  const isHotelWideView = !branchId; // true for /hotel-rooms route

  const [roomForm, setRoomForm] = useState({
    roomNumber: "",
    category: "standard",
    type: "single",
    floor: 1,
    basePrice: 1000,
    weekendPrice: 1200,
    holidayPrice: 1500,
    capacity: 2,
    bedCount: 1,
    description: "",
    amenities: []
  });

  useEffect(() => {
    fetchRooms();
  }, [hotelId, actualBranchId, isHotelWideView, filter]);

  const fetchRooms = async () => {
    try {
      let data;
      
      if (isHotelWideView) {
        // Hotel-wide view: fetch all branches first, then all rooms
        const branchesData = await branchAPI.getBranches(hotelId);
        let allRooms = [];
        
        for (const branch of branchesData.data) {
          try {
            const roomsData = await roomAPI.getRooms(hotelId, branch._id);
            allRooms = [...allRooms, ...roomsData.data];
          } catch (error) {
            console.error(`Error fetching rooms for branch ${branch._id}:`, error);
          }
        }
        
        data = { data: allRooms };
      } else {
        // Branch-specific view: fetch rooms for specific branch
        data = await roomAPI.getRooms(hotelId, actualBranchId, filter);
      }
      
      setRooms(data.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    try {
      const data = await roomAPI.createRoom(hotelId, branchId, roomForm);
      
      if (data) {
        alert("Room created successfully!");
        setShowAddRoom(false);
        setRoomForm({
          roomNumber: "",
          category: "standard",
          type: "single",
          floor: 1,
          basePrice: 1000,
          weekendPrice: 1200,
          holidayPrice: 1500,
          capacity: 2,
          bedCount: 1,
          description: "",
          amenities: []
        });
        fetchRooms();
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleUpdateRoomStatus = async (roomId, status) => {
    try {
      const data = await roomAPI.updateRoomStatus(hotelId, branchId, roomId, status);
      if (data) {
        alert(`Room status updated to ${status}`);
        fetchRooms();
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        await roomAPI.deleteRoom(hotelId, branchId, roomId);
        alert("Room deleted successfully!");
        fetchRooms();
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
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
              <h1 className="text-xl font-semibold text-gray-900">Room Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/branches/${hotelId}`)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to Branches
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters and Actions */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Rooms</h2>
              <button
                onClick={() => setShowAddRoom(!showAddRoom)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Add New Room
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filter.category}
                  onChange={(e) => setFilter({...filter, category: e.target.value})}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({...filter, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="out_of_order">Out of Order</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <input
                  type="number"
                  value={filter.floor}
                  onChange={(e) => setFilter({...filter, floor: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Filter by floor"
                />
              </div>
            </div>

          {/* Add Room Form */}
          {showAddRoom && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-md font-semibold mb-4">Add New Room</h3>
              <form onSubmit={handleCreateRoom} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm({...roomForm, roomNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor *
                  </label>
                  <input
                    type="number"
                    required
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({...roomForm, floor: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price *
                  </label>
                  <input
                    type="number"
                    required
                    value={roomForm.basePrice}
                    onChange={(e) => setRoomForm({...roomForm, basePrice: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekend Price
                  </label>
                  <input
                    type="number"
                    value={roomForm.weekendPrice}
                    onChange={(e) => setRoomForm({...roomForm, weekendPrice: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Price
                  </label>
                  <input
                    type="number"
                    value={roomForm.holidayPrice}
                    onChange={(e) => setRoomForm({...roomForm, holidayPrice: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bed Count *
                  </label>
                  <input
                    type="number"
                    required
                    value={roomForm.bedCount}
                    onChange={(e) => setRoomForm({...roomForm, bedCount: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={roomForm.description}
                    onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Create Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRoom(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Rooms List */}
          {rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No rooms found.</p>
              <button
                onClick={() => setShowAddRoom(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Add Your First Room
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Floor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Price
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
                  {rooms.map((room) => (
                    <tr key={room._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {room.roomNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.floor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{room.basePrice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          room.status === 'available' ? 'bg-green-100 text-green-800' :
                          room.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                          room.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                          room.status === 'cleaning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleUpdateRoomStatus(room._id, room.status === 'available' ? 'maintenance' : 'available')}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          {room.status === 'available' ? 'Mark Maintenance' : 'Mark Available'}
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}
