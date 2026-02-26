import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { roomAPI, branchAPI, hotelAPI } from "../services/api.js";

export default function RoomManagementEnhanced() {
  const { hotelId, branchId } = useParams();
  console.log("URL params - hotelId:", hotelId, "branchId:", branchId);
  
  const actualBranchId = branchId || null; // branchId will be undefined for /hotel-rooms route
  const isHotelWideView = !branchId; // true for /hotel-rooms route
  
  console.log("actualBranchId:", actualBranchId, "isHotelWideView:", isHotelWideView);
  
  const [rooms, setRooms] = useState([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filter, setFilter] = useState({ 
    category: "", 
    status: "", 
    floor: "", 
    type: "", 
    minPrice: "", 
    maxPrice: "",
    selectedRoom: "" // Add selected room filter
  });
  const [branchPricing, setBranchPricing] = useState({
    basePrice: 1000,
    weekendPrice: 1200,
    holidayPrice: 1500
  });
  
  const [branchInventory, setBranchInventory] = useState({
    standardRooms: 0,
    deluxeRooms: 0,
    suiteRooms: 0,
    executiveRooms: 0,
    residentialRooms: 0
  });
  
  const [maintenanceIssues, setMaintenanceIssues] = useState({});
  const navigate = useNavigate();

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
    amenities: [
      { name: "WiFi", included: true },
      { name: "Air Conditioning", included: true },
      { name: "TV", included: true }
    ],
    
    // Enhanced inventory tracking
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
    fetchRooms();
    fetchBranchData();
    fetchHotels();
    fetchBranchesForHotel(hotelId);
  }, [hotelId, actualBranchId, isHotelWideView, filter]);

  const fetchHotels = async () => {
    try {
      const hotelsData = await hotelAPI.getHotels();
      setHotels(hotelsData.data || []);
    } catch (error) {
      console.error("Error fetching hotels:", error);
    }
  };

  const fetchBranchData = async () => {
    if (actualBranchId && hotelId) {
      try {
        const branchesData = await branchAPI.getBranches(hotelId);
        const branch = branchesData.data?.find(b => b._id === actualBranchId);
        
        if (branch) {
          // Initialize branch-specific data
          setBranchPricing({
            basePrice: branch.basePrice || 1000,
            weekendPrice: branch.weekendPrice || 1200,
            holidayPrice: branch.holidayPrice || 1500
          });
          
          setBranchInventory({
            standardRooms: branch.rooms?.filter(r => r.category === 'standard').length || 0,
            deluxeRooms: branch.rooms?.filter(r => r.category === 'deluxe').length || 0,
            suiteRooms: branch.rooms?.filter(r => r.category === 'suite').length || 0,
            executiveRooms: branch.rooms?.filter(r => r.category === 'executive').length || 0,
            residentialRooms: branch.rooms?.filter(r => r.category === 'presidential').length || 0
          });
        }
      } catch (error) {
        console.error("Error fetching branch data:", error);
      }
    }
  };

  const fetchBranchesForHotel = async (selectedHotelId) => {
    if (!selectedHotelId) {
      setBranches([]);
      return;
    }
    
    try {
      const branchesData = await branchAPI.getBranches(selectedHotelId);
      setBranches(branchesData.data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
      setBranches([]);
    }
  };

  const fetchRooms = async () => {
    if (!hotelId) {
      console.log("No hotel selected, fetching all rooms from database");
      // Fetch all rooms from database when no hotel selected
      try {
        const allRoomsData = await roomAPI.getAllRooms();
        setRooms(allRoomsData.data || []);
        console.log('All rooms from database:', allRoomsData.data);
      } catch (error) {
        console.error("Error fetching all rooms from database:", error);
        setRooms([]);
      }
      setLoading(false);
      return;
    }
    
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
        if (!actualBranchId) {
          console.log("No branch selected, skipping room fetch");
          setRooms([]);
          setLoading(false); // Set loading to false here
          return;
        }
        data = await roomAPI.getRooms(hotelId, actualBranchId, filter);
      }
      
      setRooms(data.data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      // Validate hotel and branch are selected
      if (!hotelId) {
        alert("Please select a hotel first");
        return;
      }
      
      if (!actualBranchId) {
        alert("Please select a branch first");
        return;
      }
      
      const roomData = {
        ...roomForm,
        inventory: roomForm.inventory
      };
      
      console.log("Creating room with data:", roomData);
      console.log("Hotel ID:", hotelId, "Branch ID:", actualBranchId);
      
      const data = await roomAPI.createRoom(hotelId, actualBranchId, roomData);
      console.log("Room creation response:", data);
      
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
        
        // Update branch data after room creation
        await fetchBranchData();
        fetchRooms();
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleUpdateRoomStatus = async (roomId, status) => {
    if (!actualBranchId) {
      alert("Please select a branch first to manage rooms");
      return;
    }
    
    try {
      const data = await roomAPI.updateRoomStatus(hotelId, actualBranchId, roomId, status);
      if (data) {
        alert(`Room status updated to ${status}`);
        fetchRooms();
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!actualBranchId) {
      alert("Please select a branch first to manage rooms");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        await roomAPI.deleteRoom(hotelId, actualBranchId, roomId);
        alert("Room deleted successfully!");
        fetchRooms();
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  };

  // Filter rooms based on selected room
  const filteredRooms = filter.selectedRoom 
    ? rooms.filter(room => room._id === filter.selectedRoom)
    : rooms;

  // Maintenance issue management
  const handleReportMaintenance = async (roomId) => {
    const issueDescription = prompt("Describe the maintenance issue:");
    if (!issueDescription) return;
    
    try {
      const data = await roomAPI.reportMaintenanceIssue(hotelId, actualBranchId, roomId, {
        issue: issueDescription,
        priority: 'medium',
        reportedBy: JSON.parse(localStorage.getItem("user")).id,
        status: 'open'
      });
      
      if (data) {
        alert("Maintenance issue reported successfully!");
        setMaintenanceIssues(prev => ({
          ...prev,
          [roomId]: {
            ...prev[roomId],
            maintenanceIssues: {
              ...prev[roomId]?.maintenanceIssues?.filter(issue => issue.id !== data.id),
              [data.id]: {
                id: data.id,
                issue: issueDescription,
                priority: 'medium',
                reportedBy: JSON.parse(localStorage.getItem("user")).id,
                status: 'open'
              }
            }
          }
        }));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleResolveMaintenance = async (roomId, issueId) => {
    if (!window.confirm("Mark this issue as resolved?")) return;
    
    try {
      const resolution = prompt("Enter resolution details:");
      if (!resolution) return;
      
      const data = await roomAPI.resolveMaintenanceIssue(hotelId, actualBranchId, roomId, issueId, {
        resolution,
        resolvedBy: JSON.parse(localStorage.getItem("user")).id,
        status: 'resolved',
        resolvedAt: new Date()
      });
      
      if (data) {
        alert("Maintenance issue resolved successfully!");
        setMaintenanceIssues(prev => ({
          ...prev,
          [roomId]: {
            ...prev[roomId],
            maintenanceIssues: {
              ...prev[roomId]?.maintenanceIssues?.filter(issue => issue.id !== issueId),
              [issueId]: {
                id: issueId,
                issue: prev[roomId]?.maintenanceIssues?.find(issue => issue.id === issueId)?.issue,
                priority: prev[roomId]?.maintenanceIssues?.find(issue => issue.id === issueId)?.priority,
                reportedBy: prev[roomId]?.maintenanceIssues?.find(issue => issue.id === issueId)?.reportedBy,
                status: 'resolved',
                resolvedAt: new Date(),
                resolution: resolution
              }
            }
          }
        }));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      case 'cleaning':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_order':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateRoomInventory = (roomId, item, quantity) => {
    setRooms(prevRooms => 
      prevRooms.map(room => 
        room._id === roomId 
          ? { ...room, inventory: { ...room.inventory, [item]: (room.inventory[item] || 0) + quantity } }
          : room
      )
    );
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
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Room Management</h1>
              <select
                value={hotelId || ''}
                onChange={(e) => {
                  const selectedHotelId = e.target.value;
                  navigate(`/hotel-rooms/${selectedHotelId}`);
                  fetchBranchesForHotel(selectedHotelId);
                }}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Hotel</option>
                {hotels.map((hotel) => (
                  <option key={hotel._id} value={hotel._id}>
                    {hotel.name}
                  </option>
                ))}
              </select>
              <select
                value={actualBranchId || ''}
                onChange={(e) => {
                  const selectedBranchId = e.target.value;
                  if (selectedBranchId) {
                    navigate(`/rooms/${hotelId}/${selectedBranchId}`);
                  } else {
                    navigate(`/hotel-rooms/${hotelId}`);
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/branch-manager-dashboard')}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 font-medium"
              >
                ← Back to Dashboard
              </button>
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
          {/* Branch Overview */}
          {actualBranchId && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Branch: {branchPricing.basePrice ? `₹${branchPricing.basePrice}` : 'Not Set'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Room Categories</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Standard Rooms</span>
                      <span className="text-xs text-gray-500">({branchInventory.standardRooms || 0})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Deluxe Rooms</span>
                      <span className="text-xs text-gray-500">({branchInventory.deluxeRooms || 0})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Suite Rooms</span>
                      <span className="text-xs text-gray-500">({branchInventory.suiteRooms || 0})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Executive Rooms</span>
                      <span className="text-xs text-gray-500">({branchInventory.executiveRooms || 0})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Presidential Rooms</span>
                      <span className="text-xs text-gray-500">({branchInventory.residentialRooms || 0})</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Pricing</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Base Price</span>
                      <span className="text-xs text-gray-500">₹{branchPricing.basePrice || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Weekend Price</span>
                      <span className="text-xs text-gray-500">₹{branchPricing.weekendPrice || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Holiday Price</span>
                      <span className="text-xs text-gray-500">₹{branchPricing.holidayPrice || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Actions */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Rooms</h2>
              <button
                onClick={() => setShowAddRoom(!showAddRoom)}
                disabled={!hotelId || !actualBranchId}
                className={`px-4 py-2 rounded ${!hotelId || !actualBranchId ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                Add New Room
              </button>
            </div>

            {/* Enhanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Room</label>
                <select
                  value={filter.selectedRoom}
                  onChange={(e) => setFilter({...filter, selectedRoom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Rooms</option>
                  {rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.roomNumber} - {room.type} - {room.status}
                    </option>
                  ))}
                </select>
              </div>
              
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={filter.minPrice}
                    onChange={(e) => setFilter({...filter, minPrice: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filter.maxPrice}
                    onChange={(e) => setFilter({...filter, maxPrice: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Max"
                  />
                </div>
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
                      Amenities
                    </label>
                    <input
                      type="text"
                      value={roomForm.amenities.map(a => a.name).join(', ')}
                      onChange={(e) => setRoomForm({
                        ...roomForm, 
                        amenities: e.target.value.split(', ').map(a => ({ name: a.trim(), included: true }))
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="TV, WiFi, AC, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inventory Management
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(roomForm.inventory).map(([item, count]) => (
                        <div key={item}>
                          <label className="block text-xs text-gray-600 mb-1">{item.replace(/([A-Z])/g, ' $1').replace(/^./, (match) => 
                            match.toUpperCase()
                          )}</label>
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(e) => {
                              const newInventory = {...roomForm.inventory, [item]: parseInt(e.target.value) || 0};
                              setRoomForm({...roomForm, inventory: newInventory});
                            }}
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
            {/* Debug Info */}
            <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
              <p>Total rooms loaded: {rooms.length}</p>
              <p>Filtered rooms: {filteredRooms.length}</p>
              <p>Selected room: {filter.selectedRoom ? `Room ID: ${filter.selectedRoom}` : 'All rooms'}</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                        {filter.selectedRoom ? 'No room found with the selected filter.' : 'No rooms found. Add your first room to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => (
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
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(room.status)}`}>
                            {room.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="text-xs text-gray-500">
                            {Object.entries(room.inventory || {}).map(([item, count]) => (
                              <span key={item} className="mr-2">
                                {count} {item.replace(/([A-Z])/g, ' $1').replace(/^./, (match) => 
                                  match.toUpperCase()
                                )}
                              </span>
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
                    )))}
                  
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      
      {/* Bottom Navigation */}
      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/branch-manager-dashboard')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
            >
              ← Back to Branch Manager Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
