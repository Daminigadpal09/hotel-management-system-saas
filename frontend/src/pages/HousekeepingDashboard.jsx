import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hotelAPI, branchAPI, roomAPI, maintenanceAPI } from "../services/api.js";

export default function HousekeepingDashboard() {
  const [hotels, setHotels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cleaning'); // cleaning, tasks, maintenance
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showRoomStatusModal, setShowRoomStatusModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomFilterForTask, setRoomFilterForTask] = useState('all'); // For filtering rooms in task modal
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    category: '',
    type: '',
    floor: '',
    price: '',
    status: 'available'
  });
  const [taskForm, setTaskForm] = useState({
    roomId: '',
    taskType: 'cleaning',
    priority: 'normal',
    notes: ''
  });
  const navigate = useNavigate();
   
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  console.log("=== COMPONENT MOUNTED ===");
  console.log("localStorage user string:", localStorage.getItem("user"));
  console.log("Parsed user object:", user);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log("=== HOUSEKEEPING - FETCHING ROOMS ===");
      
      let hotelsData = [];
      let branchesData = [];
      let roomsData = [];
      
      try {
        // Get all hotels first
        console.log("Fetching all hotels...");
        const hotelsResponse = await hotelAPI.getHotels();
        console.log("Hotels response:", hotelsResponse?.data);
        hotelsData = hotelsResponse?.data || [];
        
        // Get all branches - fetch from hotels first (more reliable for housekeeping)
        console.log("Fetching branches from hotels...");
        
        if (hotelsData.length > 0) {
          try {
            // Get branches from each hotel
            const allBranchesPromises = hotelsData.map(hotel => 
              hotelAPI.getBranches(hotel._id).catch(e => ({ data: [] }))
            );
            const allBranchesResponses = await Promise.all(allBranchesPromises);
            branchesData = allBranchesResponses
              .map(r => r?.data || [])
              .flat();
            console.log("Branches from hotels:", branchesData.length);
          } catch (e) {
            console.log("Hotel branches API failed:", e);
          }
        }
        
        // Fallback: try /branches/all endpoint
        if (branchesData.length === 0) {
          try {
            const allBranchesResponse = await hotelAPI.getAllBranches();
            console.log("All branches response:", allBranchesResponse?.data);
            branchesData = allBranchesResponse?.data || allBranchesResponse || [];
          } catch (e) {
            console.log("All branches API also failed:", e);
          }
        }
        
        // Set branches immediately - even if empty array
        console.log("Setting branches:", branchesData.length);
        setBranches(branchesData);
        
        // Fetch all maintenance tasks for housekeeping dashboard
        try {
          console.log("Fetching all maintenance tasks...");
          const maintenanceResponse = await maintenanceAPI.getAllMaintenance();
          console.log("Maintenance response:", maintenanceResponse);
          const tasksData = maintenanceResponse?.data || [];
          console.log("Setting maintenance requests:", tasksData.length);
          setMaintenanceRequests(tasksData);
        } catch (e) {
          console.log("Failed to fetch maintenance tasks:", e);
        }
        
        // Set hotels
        if (hotelsData.length > 0) {
          setHotels(hotelsData);
          
          // Get rooms for first hotel
          const firstHotelId = hotelsData[0]._id;
          console.log("Fetching rooms for hotel:", firstHotelId);
          
          const roomsResponse = await hotelAPI.getHotelRoomsAll(firstHotelId);
          console.log("Rooms response:", roomsResponse?.data);
          roomsData = roomsResponse?.data || [];
          
          if (roomsData.length > 0) {
            setRooms(roomsData);
            console.log("Rooms loaded:", roomsData.length);
          }
        } else if (branchesData.length > 0) {
          // If no hotels but we have branches, still try to get rooms
          // This handles edge case where hotels list is empty but branches exist
          console.log("No hotels found, but branches exist:", branchesData.length);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchData:", error);
      setLoading(false);
    }
  };

  // Separate function to fetch just branches - called when modal opens
  const fetchBranchesOnly = async () => {
    try {
      console.log("Fetching branches and tasks...");
      let branchesData = [];
      
      // First try: get hotels then fetch branches for each hotel
      // This is more reliable for housekeeping users
      try {
        const hotelsResponse = await hotelAPI.getHotels();
        const hotelsData = hotelsResponse?.data || [];
        console.log("Hotels for branches:", hotelsData.length);
        
        // Get branches from all hotels
        const allBranchesPromises = hotelsData.map(hotel => 
          hotelAPI.getBranches(hotel._id).catch(e => ({ data: [] }))
        );
        const allBranchesResponses = await Promise.all(allBranchesPromises);
        
        branchesData = allBranchesResponses
          .map(r => r?.data || [])
          .flat();
        console.log("Branches from hotels:", branchesData.length);
      } catch (e) {
        console.log("Hotel branches API failed:", e);
      }
      
      // Fallback: try /branches/all endpoint
      if (branchesData.length === 0) {
        try {
          const allBranchesResponse = await hotelAPI.getAllBranches();
          console.log("All branches response:", allBranchesResponse);
          branchesData = allBranchesResponse?.data || allBranchesResponse || [];
        } catch (e) {
          console.log("All branches API also failed:", e);
        }
      }
      
      console.log("Setting branches:", branchesData.length);
      setBranches(branchesData);
      
      // Also fetch all maintenance tasks
      try {
        console.log("Fetching all maintenance tasks...");
        const maintenanceResponse = await maintenanceAPI.getAllMaintenance();
        console.log("Maintenance response:", maintenanceResponse);
        const tasksData = maintenanceResponse?.data || [];
        console.log("Setting maintenance requests:", tasksData.length);
        setMaintenanceRequests(tasksData);
      } catch (e) {
        console.log("Failed to fetch maintenance tasks:", e);
      }
      
      return branchesData;
    } catch (error) {
      console.error("Error fetching branches:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.hotel_id, user.branch_id]);

  // Refresh rooms when task modal opens
  useEffect(() => {
    if (showTaskModal) {
      // Ensure branches are loaded when modal opens
      fetchBranchesOnly();
      setRoomFilterForTask('all');
    }
  }, [showTaskModal, user]);

  const handleHotelChange = async (hotelId) => {
    try {
      const hotel = hotels.find(h => h._id === hotelId);
      setSelectedHotel(hotel);
      
      const branchesResponse = await hotelAPI.getBranches(hotelId);
      const hotelBranches = branchesResponse.data || [];
      setBranches(hotelBranches);
      
      if (hotelBranches.length > 0) {
        setSelectedBranch(hotelBranches[0]);
        
        try {
          const allRoomsResponse = await hotelAPI.getHotelRoomsAll(hotelId);
          setRooms(allRoomsResponse.data || []);
        } catch (error) {
          console.log("Error fetching all rooms for hotel change:", error);
          // Fallback to first branch rooms
          const roomsResponse = await roomAPI.getAllRooms();
          setRooms(roomsResponse.data || []);
        }
        
        const maintenanceResponse = await maintenanceAPI.getMaintenanceByBranch(hotelBranches[0]._id);
        setMaintenanceRequests(maintenanceResponse.data || []);
      }
    } catch (error) {
      console.error("Error changing hotel:", error);
    }
  };

  const handleBranchChange = async (branchId) => {
    try {
      if (branchId === "all") {
        // Show all rooms for all branches
        setSelectedBranch(null);
        if (selectedHotel) {
          try {
            const allRoomsResponse = await hotelAPI.getHotelRoomsAll(selectedHotel._id);
            setRooms(allRoomsResponse.data || []);
          } catch (error) {
            console.log("Error fetching all rooms:", error);
            setRooms([]);
          }
          
          // Fetch maintenance for all branches
          const allMaintenance = [];
          for (const branch of branches) {
            try {
              const branchMaintenance = await maintenanceAPI.getMaintenanceByBranch(branch._id);
              allMaintenance.push(...(branchMaintenance.data || []));
            } catch (error) {
              console.log("Error fetching maintenance for branch:", branch._id, error);
            }
          }
          setMaintenanceRequests(allMaintenance);
        }
      } else {
        // Show rooms for specific branch
        const branch = branches.find(b => b._id === branchId);
        setSelectedBranch(branch);
        
        if (selectedHotel) {
          const roomsResponse = await roomAPI.getRooms(selectedHotel._id, branchId);
          setRooms(roomsResponse.data || []);
          
          const maintenanceResponse = await maintenanceAPI.getMaintenanceByBranch(branchId);
          setMaintenanceRequests(maintenanceResponse.data || []);
        }
      }
    } catch (error) {
      console.error("Error changing branch:", error);
    }
  };

  const handleRoomStatusUpdate = async (roomId, newStatus) => {
    try {
      // If no branch is selected (All Branches mode), we need to determine which branch the room belongs to
      const room = rooms.find(r => r._id === roomId);
      const targetBranchId = room?.branchId || selectedBranch?._id;
      
      if (!targetBranchId) {
        alert("Cannot update room status: Branch information not available");
        return;
      }
      
      await roomAPI.updateRoomStatus(selectedHotel._id, targetBranchId, roomId, newStatus);
      alert(`Room status updated to ${newStatus} successfully!`);
      fetchData();
    } catch (error) {
      alert("Error updating room status: " + error.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // Find the selected room to get its branch and hotel info
    const selectedRoom = rooms.find(r => r._id === taskForm.roomId);
    
    // Determine the correct branch and hotel IDs from the selected room
    const branchId = selectedBranch?._id || selectedRoom?.branchId || selectedRoom?.branch_id?._id || selectedRoom?.branch_id;
    const hotelId = selectedHotel?._id || selectedRoom?.hotelId || selectedRoom?.hotel_id?._id || selectedRoom?.hotel_id;
    
    if (!branchId || !hotelId) {
      alert("Please select a hotel and branch first, or select a room from the list.");
      return;
    }
    
    try {
      await maintenanceAPI.createMaintenance({
        ...taskForm,
        branchId: branchId,
        hotelId: hotelId,
        assignedTo: user._id || user.id,
        status: 'pending'
      });
      alert("Task created successfully!");
      setShowTaskModal(false);
      setTaskForm({
        roomId: '',
        taskType: 'cleaning',
        priority: 'normal',
        notes: ''
      });
      setRoomFilterForTask('all');
      fetchData();
    } catch (error) {
      alert("Error creating task: " + error.message);
    }
  };

  const handleTaskComplete = async (taskId) => {
    try {
      await maintenanceAPI.updateMaintenance(taskId, { status: 'completed' });
      alert("Task marked as completed!");
      fetchData();
    } catch (error) {
      alert("Error updating task: " + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      // Get the first available hotel and branch since user doesn't have them assigned
      const hotelsResponse = await hotelAPI.getHotels();
      const allHotels = hotelsResponse.data || [];
      
      if (allHotels.length === 0) {
        alert("No hotels found. Please create a hotel first.");
        return;
      }
      
      const hotel = allHotels[0]; // Use first hotel
      const branchesResponse = await hotelAPI.getBranches(hotel._id);
      const hotelBranches = branchesResponse.data || [];
      
      if (hotelBranches.length === 0) {
        alert("No branches found. Please create a branch first.");
        return;
      }
      
      const branch = hotelBranches[0]; // Use first branch
      
      // Create room with hotel and branch IDs
      const roomData = {
        ...roomForm,
        hotel_id: hotel._id,
        branch_id: branch._id,
        floor: parseInt(roomForm.floor),
        price: parseFloat(roomForm.price)
      };
      
      const response = await roomAPI.createRoom(hotel._id, branch._id, roomData);
      alert("Room created successfully!");
      
      // Reset form
      setRoomForm({
        roomNumber: '',
        category: '',
        type: '',
        floor: '',
        price: '',
        status: 'available'
      });
      
      // Refresh rooms list
      fetchData();
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Error creating room: " + error.message);
    }
  };

  // Filter rooms based on status filter
  const filteredRooms = statusFilter === 'all' 
    ? rooms 
    : rooms.filter(room => room.status === statusFilter);

  // Calculate room statistics
  const cleaningRooms = rooms.filter(room => room.status === 'cleaning');
  const cleanedRooms = rooms.filter(room => room.status === 'available');
  const occupiedRooms = rooms.filter(room => room.status === 'occupied');
  const maintenanceRooms = rooms.filter(room => room.status === 'maintenance' || room.status === 'out_of_order');

  // Pending tasks
  const pendingTasks = maintenanceRequests.filter(m => m.status === 'pending');
  const inProgressTasks = maintenanceRequests.filter(m => m.status === 'in_progress');
  const completedTasks = maintenanceRequests.filter(m => m.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-semibold text-teal-600">Housekeeping</h1>
          <p className="text-sm text-gray-500">{user.name}</p>
        </div>
        
        <nav className="p-4">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('cleaning')}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'cleaning' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
              </svg>
              Room Cleaning Status
            </button>
            
            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'tasks' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Task Assignment
            </button>
            
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'maintenance' ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Maintenance Tracking
            </button>
          </div>
          
          <div className="border-t pt-4">
            <button
              onClick={handleLogout}
              className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50"
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Housekeeping Dashboard - {selectedBranch?.name || 'All Branches'}
              </h2>
              
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
                  value={selectedBranch?._id || "all"}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Branches</option>
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
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* Status Summary Cards - Matching Receptionist Dashboard */}
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

          {/* Debug Information - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Information</h4>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>User ID: {user._id || user.id}</p>
                <p>User Role: {user.role}</p>
                <p>Hotel ID: {user.hotel_id || user.hotelId || 'null'}</p>
                <p>Branch ID: {user.branch_id || user.branchId || 'null'}</p>
                <p>Selected Hotel: {selectedHotel?._id}</p>
                <p>Selected Branch: {selectedBranch?._id}</p>
                <p>Total Rooms Loaded: {rooms.length}</p>
                <p>Total Branches: {branches.length}</p>
                <p>Total Hotels: {hotels.length}</p>
                <p>Status Filter: {statusFilter}</p>
                <p>Filtered Rooms: {filteredRooms.length}</p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'cleaning' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Room Cleaning Status</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      Showing {filteredRooms.length} of {rooms.length} rooms
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="all">All Rooms</option>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out_of_order">Out of Order</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {filteredRooms.length === 0 && rooms.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
                    <p className="text-gray-500 mb-4">No rooms available for this branch.</p>
                    
                    {/* Room Creation Form */}
                    <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Create New Room</h4>
                      <form onSubmit={handleCreateRoom} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                          <input
                            type="text"
                            value={roomForm.roomNumber}
                            onChange={(e) => setRoomForm({...roomForm, roomNumber: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g., 101"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <select
                            value={roomForm.category}
                            onChange={(e) => setRoomForm({...roomForm, category: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            required
                          >
                            <option value="">Select Category</option>
                            <option value="Standard">Standard</option>
                            <option value="Deluxe">Deluxe</option>
                            <option value="Suite">Suite</option>
                            <option value="Presidential">Presidential</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={roomForm.type}
                            onChange={(e) => setRoomForm({...roomForm, type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            required
                          >
                            <option value="">Select Type</option>
                            <option value="Single">Single</option>
                            <option value="Double">Double</option>
                            <option value="Twin">Twin</option>
                            <option value="Family">Family</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                          <input
                            type="number"
                            value={roomForm.floor}
                            onChange={(e) => setRoomForm({...roomForm, floor: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g., 1"
                            min="1"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price per Night</label>
                          <input
                            type="number"
                            value={roomForm.price}
                            onChange={(e) => setRoomForm({...roomForm, price: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g., 100"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={roomForm.status}
                            onChange={(e) => setRoomForm({...roomForm, status: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            required
                          >
                            <option value="available">Available</option>
                            <option value="occupied">Occupied</option>
                            <option value="cleaning">Cleaning</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="out_of_order">Out of Order</option>
                          </select>
                        </div>
                        
                        <button
                          type="submit"
                          className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
                        >
                          Create Room
                        </button>
                      </form>
                    </div>
                  </div>
                )}
                {filteredRooms.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRooms.map(room => (
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
                          <p>Capacity: {room.capacity || 2} guests</p>
                          <p>Beds: {room.bedCount || 1}</p>
                          {room.price && <p>Price: ${room.price}/night</p>}
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
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Task Assignment</h3>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
                >
                  + Create Task
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800">Pending</h4>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingTasks.length}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800">In Progress</h4>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressTasks.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800">Completed</h4>
                    <p className="text-2xl font-bold text-green-600 mt-1">{completedTasks.length}</p>
                  </div>
                </div>
                
                {maintenanceRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No tasks found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {maintenanceRequests.map(task => (
                          <tr key={task._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Room {task.roomId?.roomNumber || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                              {task.taskType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'urgent' ? 'bg-red-200 text-red-900' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs">
                              <div className="truncate">{task.notes || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {task.status === 'pending' && (
                                <button
                                  onClick={() => handleTaskComplete(task._id)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Start
                                </button>
                              )}
                              {task.status === 'in_progress' && (
                                <button
                                  onClick={() => handleTaskComplete(task._id)}
                                  className="text-teal-600 hover:text-teal-900"
                                >
                                  Complete
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
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Maintenance Tracking</h3>
              </div>
              
              <div className="p-6">
                {maintenanceRequests.filter(m => m.taskType === 'maintenance').length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No maintenance requests found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {maintenanceRequests
                      .filter(m => m.taskType === 'maintenance')
                      .map(task => (
                        <div key={task._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Room {task.roomId?.roomNumber || 'N/A'}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Priority: <span className="font-medium capitalize">{task.priority}</span>
                              </p>
                              {task.notes && (
                                <p className="text-sm text-gray-600 mt-2">{task.notes}</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          
                          <div className="mt-4 flex space-x-3">
                            {task.status === 'pending' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await maintenanceAPI.updateMaintenance(task._id, { status: 'in_progress' });
                                    fetchData();
                                  } catch (error) {
                                    alert("Error updating task");
                                  }
                                }}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                              >
                                Start Work
                              </button>
                            )}
                            {task.status === 'in_progress' && (
                              <button
                                onClick={() => handleTaskComplete(task._id)}
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                              >
                                Mark Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Create Task</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6">
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={fetchData}
                  className="text-xs text-teal-600 hover:text-teal-800 flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Rooms
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Room Filter for Task Modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Branch</label>
                  <select
                    value={roomFilterForTask}
                    onChange={(e) => setRoomFilterForTask(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">All Branches ({rooms.length} rooms)</option>
                    {branches.map(branch => {
                      const branchRoomCount = rooms.filter(r => 
                        r.branchId === branch._id || 
                        r.branch_id?._id === branch._id || 
                        r.branch_id === branch._id
                      ).length;
                      return (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} ({branchRoomCount} rooms)
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                  <select
                    value={taskForm.roomId}
                    onChange={(e) => setTaskForm({...taskForm, roomId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Room</option>
                    {rooms
                      .filter(room => roomFilterForTask === 'all' || 
                        room.branchId === roomFilterForTask || 
                        room.branch_id?._id === roomFilterForTask || 
                        room.branch_id === roomFilterForTask)
                      .map(room => (
                        <option key={room._id} value={room._id}>
                          Room {room.roomNumber} - {room.category} ({room.type}) - {room.branch_id?.name || room.branchId?.name || 'Branch'} {room.floor ? `- Floor ${room.floor}` : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Showing {rooms.filter(room => roomFilterForTask === 'all' || 
                      room.branchId === roomFilterForTask || 
                      room.branch_id?._id === roomFilterForTask || 
                      room.branch_id === roomFilterForTask).length} of {rooms.length} rooms
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
                  <select
                    value={taskForm.taskType}
                    onChange={(e) => setTaskForm({...taskForm, taskType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="cleaning">Cleaning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inspection">Inspection</option>
                    <option value="supply">Supply Restock</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm({...taskForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows="3"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setRoomFilterForTask('all');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                >
                  Create Task
                </button>
              </div>
            </form>
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
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
