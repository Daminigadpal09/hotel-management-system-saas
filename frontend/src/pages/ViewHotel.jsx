import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { hotelAPI, branchAPI, roomAPI } from "../services/api.js";

export default function ViewHotel() {
  const { hotelId } = useParams();
  const [hotel, setHotel] = useState(null);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHotelDetails();
  }, [hotelId]);

  const fetchHotelDetails = async () => {
    try {
      // Fetch hotel details
      const hotelData = await hotelAPI.getHotelById(hotelId);
      setHotel(hotelData.data);

      // Fetch branches
      const branchesData = await branchAPI.getBranches(hotelId);
      setBranches(branchesData.data);

      // Fetch rooms for all branches
      let allRooms = [];
      for (const branch of branchesData.data) {
        try {
          const roomsData = await roomAPI.getRooms(hotelId, branch._id);
          allRooms = [...allRooms, ...roomsData.data.map(room => ({
            ...room,
            branchName: branch.name,
            branchId: branch._id
          }))];
        } catch (error) {
          console.error(`Error fetching rooms for branch ${branch._id}:`, error);
        }
      }
      setRooms(allRooms);
    } catch (error) {
      console.error("Error fetching hotel details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoomStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "occupied":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "cleaning":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading hotel details...</div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Hotel not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Hotel Details</h1>
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
          {/* Hotel Information */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{hotel.name}</h2>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(hotel.status)}`}>
                {hotel.status}
              </span>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Email:</span> {hotel.email}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Phone:</span> {hotel.phone}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">GST Number:</span> {hotel.gstNumber || 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
                  <p className="text-sm text-gray-900">{hotel.address}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">Created:</span> {new Date(hotel.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {hotel.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-sm text-gray-900">{hotel.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Branches</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{branches.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Rooms</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{rooms.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Available Rooms</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {rooms.filter(room => room.status === 'available').length}
              </p>
            </div>
          </div>

          {/* Branches */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
            </div>
            <div className="px-6 py-4">
              {branches.length === 0 ? (
                <p className="text-gray-500">No branches found.</p>
              ) : (
                <div className="space-y-4">
                  {branches.map((branch) => (
                    <div key={branch._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-md font-medium text-gray-900">{branch.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{branch.address}</p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Phone:</span> {branch.phone || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Email:</span> {branch.email || 'N/A'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/branches/${hotelId}`)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Manage Branch
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rooms */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Rooms</h2>
            </div>
            <div className="px-6 py-4">
              {rooms.length === 0 ? (
                <p className="text-gray-500">No rooms found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Room Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Floor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
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
                            {room.branchName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {room.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {room.floor}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoomStatusColor(room.status)}`}>
                              {room.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${room.pricePerNight || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => navigate(`/rooms/${hotelId}/${room.branchId}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Manage Room
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
        </div>
      </main>
    </div>
  );
}
