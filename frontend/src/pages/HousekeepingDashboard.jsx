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
  const [taskForm, setTaskForm] = useState({
    roomId: '',
    taskType: 'cleaning',
    priority: 'normal',
    notes: ''
  });
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchData = async () => {
    try {
      const hotelId = user.hotel_id?._id || user.hotel_id || user.hotelId;
      const branchId = user.branch_id?._id || user.branch_id || user.branchId;
      
      if (hotelId) {
        const hotelsResponse = await hotelAPI.getHotels();
        const allHotels = hotelsResponse.data || [];
        const userHotel = allHotels.find(h => h._id === hotelId);
        if (userHotel) {
          setSelectedHotel(userHotel);
        }
        setHotels(allHotels);
        
        const branchesResponse = await hotelAPI.getBranches(hotelId);
        const hotelBranches = branchesResponse.data || [];
        setBranches(hotelBranches);
        
        // Fetch all rooms for the hotel initially
        try {
          const allRoomsResponse = await hotelAPI.getHotelRoomsAll(hotelId);
          console.log("All rooms for hotel:", allRoomsResponse.data);
          setRooms(allRoomsResponse.data || []);
        } catch (error) {
          console.log("Error fetching all rooms, trying branch-specific:", error);
          // Fallback to branch-specific rooms
          if (branchId) {
            const branch = hotelBranches.find(b => b._id === branchId);
            if (branch) {
              setSelectedBranch(branch);
            }
            
            const roomsResponse = await roomAPI.getRooms(hotelId, branchId);
            setRooms(roomsResponse.data || []);
          } else if (hotelBranches.length > 0) {
            setSelectedBranch(hotelBranches[0]);
            const roomsResponse = await roomAPI.getRooms(hotelId, hotelBranches[0]._id);
            setRooms(roomsResponse.data || []);
          }
        }
        
        // Fetch maintenance requests for all branches or specific branch
        if (branchId) {
          const maintenanceResponse = await maintenanceAPI.getMaintenanceByBranch(branchId);
          setMaintenanceRequests(maintenanceResponse.data || []);
        } else {
          // Fetch maintenance for all branches
          const allMaintenance = [];
          for (const branch of hotelBranches) {
            try {
              const branchMaintenance = await maintenanceAPI.getMaintenanceByBranch(branch._id);
              allMaintenance.push(...(branchMaintenance.data || []));
            } catch (error) {
              console.log("Error fetching maintenance for branch:", branch._id, error);
            }
          }
          setMaintenanceRequests(allMaintenance);
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
          const roomsResponse = await roomAPI.getRooms(hotelId, hotelBranches[0]._id);
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
    try {
      await maintenanceAPI.createMaintenance({
        ...taskForm,
        branchId: selectedBranch._id,
        hotelId: selectedHotel._id,
        assignedTo: user._id,
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

  // Room statistics
  const cleaningRooms = rooms.filter(r => r.status === 'cleaning');
  const cleanedRooms = rooms.filter(r => r.status === 'available');
  const occupiedRooms = rooms.filter(r => r.status === 'occupied');
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance' || r.status === 'out_of_order');

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Rooms</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{rooms.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v7a3 3 0 003 3h3a3 3 0 003-3v-7m-6 0v7a3 3 0 003 3h3a3 3 0 003-3v-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Needs Cleaning</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{cleaningRooms.length}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ready / Clean</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{cleanedRooms.length}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Maintenance</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{maintenanceRooms.length}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'cleaning' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Room Cleaning Status</h3>
              </div>
              
              <div className="p-6">
                {rooms.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No rooms found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {rooms.map(room => (
                      <div key={room._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">Room {room.roomNumber}</h4>
                            <p className="text-sm text-gray-500">{room.category}</p>
                          </div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            room.status === 'available' ? 'bg-green-100 text-green-800' :
                            room.status === 'occupied' ? 'bg-red-100 text-red-800' :
                            room.status === 'cleaning' ? 'bg-orange-100 text-orange-800' :
                            room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            room.status === 'out_of_order' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {room.status === 'available' ? 'Ready' :
                             room.status === 'occupied' ? 'Occupied' :
                             room.status === 'cleaning' ? 'Cleaning' :
                             room.status === 'maintenance' ? 'Maintenance' :
                             room.status === 'out_of_order' ? 'Out of Order' : room.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <p>Floor: {room.floor}</p>
                          <p>Type: {room.type}</p>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="space-y-2">
                          {room.status === 'occupied' && (
                            <button
                              onClick={() => handleRoomStatusUpdate(room._id, 'cleaning')}
                              className="w-full px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                            >
                              Start Cleaning
                            </button>
                          )}
                          {room.status === 'cleaning' && (
                            <button
                              onClick={() => handleRoomStatusUpdate(room._id, 'available')}
                              className="w-full px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              Mark Clean
                            </button>
                          )}
                          {room.status === 'available' && (
                            <button
                              onClick={() => handleRoomStatusUpdate(room._id, 'occupied')}
                              className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                            >
                              Check In
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setTaskForm({...taskForm, roomId: room._id});
                              setShowTaskModal(true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                          >
                            Assign Task
                          </button>
                        </div>
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                  <select
                    value={taskForm.roomId}
                    onChange={(e) => setTaskForm({...taskForm, roomId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Room</option>
                    {rooms.map(room => (
                      <option key={room._id} value={room._id}>
                        Room {room.roomNumber} - {room.category}
                      </option>
                    ))}
                  </select>
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
                  onClick={() => setShowTaskModal(false)}
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
    </div>
  );
}
