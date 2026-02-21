import { useState, useEffect } from "react";
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { roomAPI, branchAPI, hotelAPI } from "../services/api.js";

export default function RoomManagement() {
  const { hotelId, branchId } = useParams();
  const [rooms, setRooms] = useState([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "", status: "", floor: "" });
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [availableHotels, setAvailableHotels] = useState([]);
  const navigate = useNavigate();

  // Get user data to determine hotel
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [userHotelId, setUserHotelId] = useState(hotelId || user.hotel_id || user.id);

  // Handle both route patterns: /rooms/:hotelId/:branchId and /hotel-rooms/:hotelId
  const actualBranchId = branchId || null; // branchId will be undefined for /room-management route
  const isHotelWideView = !branchId; // true for /room-management route

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
    amenities: [],
    inventory: {
      towels: 0,
      soap: 0,
      shampoo: 0,
      waterBottles: 0,
      bedsheets: 0,
      pillows: 0,
      blankets: 0,
      cleaningSupplies: 0,
      lightbulbs: 0,
      remoteControl: 0,
      safe: 0,
      minibarItems: 0,
      kettle: 0,
      iron: 0,
      hairdryer: 0,
      coffee: 0,
      tea: 0,
      cups: 0,
      glasses: 0,
      slippers: 0,
      robes: 0,
      toiletries: 0
    }
  });

  useEffect(() => {
    fetchAvailableHotels();
  }, []);

  useEffect(() => {
    if (userHotelId && availableHotels.find(h => h._id === userHotelId)) {
      fetchBranches();
    }
  }, [userHotelId, availableHotels]);

  useEffect(() => {
    if (userHotelId && availableHotels.find(h => h._id === userHotelId)) {
      fetchRooms();
    }
  }, [userHotelId, actualBranchId, selectedBranch, isHotelWideView, filter, availableHotels]);

  const fetchAvailableHotels = async () => {
    try {
      const hotelsData = await hotelAPI.getHotels();
      setAvailableHotels(hotelsData.data || []);
      
      // If current hotelId is invalid, set to first available hotel
      if (!userHotelId || !hotelsData.data?.find(h => h._id === userHotelId)) {
        if (hotelsData.data?.length > 0) {
          setUserHotelId(hotelsData.data[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching hotels:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const branchesData = await branchAPI.getBranches(userHotelId);
      setBranches(branchesData.data || []);
      if (!actualBranchId && branchesData.data?.length > 0) {
        setSelectedBranch(branchesData.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchRooms = async () => {
    try {
      let data;
      
      if (isHotelWideView) {
        // Hotel-wide view: fetch all branches first, then all rooms
        const branchesData = await branchAPI.getBranches(userHotelId);
        let allRooms = [];
        
        for (const branch of branchesData.data) {
          try {
            const roomsData = await roomAPI.getRooms(userHotelId, branch._id);
            allRooms = [...allRooms, ...roomsData.data];
          } catch (error) {
            console.error(`Error fetching rooms for branch ${branch._id}:`, error);
          }
        }
        
        data = { data: allRooms };
      } else {
        // Branch-specific view: fetch rooms for specific branch
        const branchToUse = actualBranchId || selectedBranch;
        if (!branchToUse) {
          data = { data: [] };
        } else {
          data = await roomAPI.getRooms(userHotelId, branchToUse, filter);
        }
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
      // For general room management, we need to select a branch first
      if (!actualBranchId) {
        alert("Please select a branch first to create rooms");
        navigate(`/branches/${userHotelId}`);
        return;
      }
      
      const data = await roomAPI.createRoom(userHotelId, actualBranchId || selectedBranch, roomForm);
      
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
      if (!actualBranchId) {
        alert("Please select a branch first to manage rooms");
        navigate(`/branches/${userHotelId}`);
        return;
      }
      
      const data = await roomAPI.updateRoomStatus(userHotelId, actualBranchId || selectedBranch, roomId, status);
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
        if (!actualBranchId) {
          alert("Please select a branch first to manage rooms");
          navigate(`/branches/${userHotelId}`);
          return;
        }
        
        await roomAPI.deleteRoom(userHotelId, actualBranchId || selectedBranch, roomId);
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
                onClick={() => navigate(`/branches/${userHotelId}`)}
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

            {/* Hotel Selector */}
            {!hotelId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Hotel</label>
                <select
                  value={userHotelId || ""}
                  onChange={(e) => setUserHotelId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a hotel...</option>
                  {availableHotels.map((hotel) => (
                    <option key={hotel._id} value={hotel._id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Branch Selector */}
            {(!actualBranchId && userHotelId) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
                <select
                  value={selectedBranch || ""}
                  onChange={(e) => setSelectedBranch(e.target.value)}
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
            )}

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inventory Items
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(roomForm.inventory).map(([item, count]) => (
                      <div key={item}>
                        <label className="block text-xs text-gray-600 mb-1">{item.replace(/([A-Z])/g, ' $1').replace(/^./, (match) => match.toUpperCase() + item.substring(1).toLowerCase())}</label>
                        <input
                          type="number"
                          min="0"
                          value={count}
                          onChange={(e) => setRoomForm({...roomForm, inventory: {...roomForm.inventory, [item]: parseInt(e.target.value) || 0}})}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
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
                      Inventory
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs text-gray-500">
                          {Object.entries(room.inventory || {}).map(([item, count]) => (
                            <React.Fragment key={item}>
                              <span className="mr-2">
                                {count} {item.replace(/([A-Z])/g, ' $1').replace(/^./, (match) => match.toUpperCase() + item.substring(1).toLowerCase())}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
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
