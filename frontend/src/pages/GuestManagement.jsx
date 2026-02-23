import { useState, useEffect } from "react";
import { guestAPI } from "../services/api.js";

export default function GuestManagement() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showGuestDetails, setShowGuestDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBlacklisted, setFilterBlacklisted] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState(null);

  // Form state
  const [guestForm, setGuestForm] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      postalCode: ""
    },
    preferences: {
      roomType: "",
      floorPreference: "",
      smokingPreference: "any",
      specialRequests: ""
    },
    emergencyContact: {
      name: "",
      relationship: "",
      phone: ""
    }
  });

  // Document upload state
  const [documentForm, setDocumentForm] = useState({
    documentType: "passport",
    documentNumber: "",
    issuedDate: "",
    expiryDate: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchGuests();
    fetchStatistics();
  }, [currentPage, searchTerm, filterBlacklisted]);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(filterBlacklisted !== "all" && { isBlacklisted: filterBlacklisted })
      };
      
      const data = await guestAPI.getGuests(params);
      setGuests(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching guests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const data = await guestAPI.getStatistics();
      setStatistics(data.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    try {
      await guestAPI.createGuest(guestForm);
      alert("Guest created successfully!");
      setShowAddGuest(false);
      setGuestForm({
        name: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        nationality: "",
        address: {
          street: "",
          city: "",
          state: "",
          country: "",
          postalCode: ""
        },
        preferences: {
          roomType: "",
          floorPreference: "",
          smokingPreference: "any",
          specialRequests: ""
        },
        emergencyContact: {
          name: "",
          relationship: "",
          phone: ""
        }
      });
      fetchGuests();
      fetchStatistics();
    } catch (error) {
      alert("Error creating guest: " + error.message);
    }
  };

  const handleBlacklistGuest = async (guestId, reason) => {
    if (!reason) {
      alert("Please provide a reason for blacklisting");
      return;
    }
    
    try {
      await guestAPI.blacklistGuest(guestId, reason);
      alert("Guest blacklisted successfully");
      fetchGuests();
      fetchStatistics();
    } catch (error) {
      alert("Error blacklisting guest: " + error.message);
    }
  };

  const handleRemoveFromBlacklist = async (guestId) => {
    if (!confirm("Are you sure you want to remove this guest from the blacklist?")) {
      return;
    }
    
    try {
      await guestAPI.removeFromBlacklist(guestId);
      alert("Guest removed from blacklist successfully");
      fetchGuests();
      fetchStatistics();
    } catch (error) {
      alert("Error removing from blacklist: " + error.message);
    }
  };

  const handleDeleteGuest = async (guestId) => {
    if (!confirm("Are you sure you want to delete this guest?")) {
      return;
    }
    
    try {
      await guestAPI.deleteGuest(guestId);
      alert("Guest deleted successfully");
      fetchGuests();
      fetchStatistics();
    } catch (error) {
      alert("Error deleting guest: " + error.message);
    }
  };

  const handleViewDetails = async (guestId) => {
    try {
      const data = await guestAPI.getGuestById(guestId);
      setShowGuestDetails(data.data);
    } catch (error) {
      alert("Error fetching guest details: " + error.message);
    }
  };

  const handleUploadDocument = async (guestId) => {
    if (!selectedFile) {
      alert("Please select a file to upload");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('documentType', documentForm.documentType);
      formData.append('documentNumber', documentForm.documentNumber);
      formData.append('issuedDate', documentForm.issuedDate);
      formData.append('expiryDate', documentForm.expiryDate);

      const response = await guestAPI.uploadDocument(guestId, formData);
      alert("Document uploaded successfully!");
      setSelectedFile(null);
      setDocumentForm({
        documentType: "passport",
        documentNumber: "",
        issuedDate: "",
        expiryDate: ""
      });
      
      // Refresh guest details if open
      if (showGuestDetails) {
        handleViewDetails(guestId);
      }
    } catch (error) {
      alert("Error uploading document: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
            </div>
            <button
              onClick={() => setShowAddGuest(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              + Add Guest
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Guests</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{statistics.totalGuests}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Blacklisted</h3>
              <p className="text-2xl font-bold text-red-600 mt-2">{statistics.blacklistedGuests}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Active Today</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">{statistics.activeGuests}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Top Guests</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">{statistics.topGuests?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search guests by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={filterBlacklisted}
              onChange={(e) => setFilterBlacklisted(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Guests</option>
              <option value="false">Not Blacklisted</option>
              <option value="true">Blacklisted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guest List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading guests...</p>
            </div>
          ) : guests.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No guests found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first guest.</p>
              <button
                onClick={() => setShowAddGuest(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
              >
                Add First Guest
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {guests.map((guest) => (
                    <tr key={guest._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-medium">
                                {guest.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{guest.name}</div>
                            <div className="text-sm text-gray-500">{guest.nationality}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{guest.email}</div>
                        <div className="text-sm text-gray-500">{guest.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{guest.totalVisits || 0} visits</div>
                        {guest.lastVisit && (
                          <div className="text-sm text-gray-500">
                            Last: {new Date(guest.lastVisit.checkInDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {guest.isBlacklisted ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Blacklisted
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(guest._id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                          {guest.isBlacklisted ? (
                            <button
                              onClick={() => handleRemoveFromBlacklist(guest._id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Unblacklist
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = prompt("Enter reason for blacklisting:");
                                if (reason) handleBlacklistGuest(guest._id, reason);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Blacklist
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteGuest(guest._id)}
                            className="text-red-600 hover:text-red-900"
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
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-2 border border-gray-300 rounded-md ${
                  currentPage === i + 1 ? 'bg-indigo-600 text-white' : ''
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add New Guest</h3>
              <button
                onClick={() => setShowAddGuest(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateGuest} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      required
                      value={guestForm.name}
                      onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={guestForm.email}
                      onChange={(e) => setGuestForm({...guestForm, email: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={guestForm.phone}
                      onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={guestForm.dateOfBirth}
                      onChange={(e) => setGuestForm({...guestForm, dateOfBirth: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={guestForm.gender}
                      onChange={(e) => setGuestForm({...guestForm, gender: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nationality</label>
                    <input
                      type="text"
                      value={guestForm.nationality}
                      onChange={(e) => setGuestForm({...guestForm, nationality: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Street</label>
                    <input
                      type="text"
                      value={guestForm.address.street}
                      onChange={(e) => setGuestForm({...guestForm, address: {...guestForm.address, street: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={guestForm.address.city}
                      onChange={(e) => setGuestForm({...guestForm, address: {...guestForm.address, city: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input
                      type="text"
                      value={guestForm.address.state}
                      onChange={(e) => setGuestForm({...guestForm, address: {...guestForm.address, state: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <input
                      type="text"
                      value={guestForm.address.country}
                      onChange={(e) => setGuestForm({...guestForm, address: {...guestForm.address, country: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                    <input
                      type="text"
                      value={guestForm.address.postalCode}
                      onChange={(e) => setGuestForm({...guestForm, address: {...guestForm.address, postalCode: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={guestForm.emergencyContact.name}
                      onChange={(e) => setGuestForm({...guestForm, emergencyContact: {...guestForm.emergencyContact, name: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Relationship</label>
                    <input
                      type="text"
                      value={guestForm.emergencyContact.relationship}
                      onChange={(e) => setGuestForm({...guestForm, emergencyContact: {...guestForm.emergencyContact, relationship: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={guestForm.emergencyContact.phone}
                      onChange={(e) => setGuestForm({...guestForm, emergencyContact: {...guestForm.emergencyContact, phone: e.target.value}})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddGuest(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Details Modal */}
      {showGuestDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Guest Details</h3>
              <button
                onClick={() => setShowGuestDetails(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Guest Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
                  <div className="space-y-3">
                    <div><strong>Name:</strong> {showGuestDetails.name}</div>
                    <div><strong>Email:</strong> {showGuestDetails.email}</div>
                    <div><strong>Phone:</strong> {showGuestDetails.phone}</div>
                    <div><strong>Date of Birth:</strong> {showGuestDetails.dateOfBirth ? new Date(showGuestDetails.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Gender:</strong> {showGuestDetails.gender || 'N/A'}</div>
                    <div><strong>Nationality:</strong> {showGuestDetails.nationality || 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Address</h4>
                  <div className="space-y-3">
                    <div><strong>Street:</strong> {showGuestDetails.address?.street || 'N/A'}</div>
                    <div><strong>City:</strong> {showGuestDetails.address?.city || 'N/A'}</div>
                    <div><strong>State:</strong> {showGuestDetails.address?.state || 'N/A'}</div>
                    <div><strong>Country:</strong> {showGuestDetails.address?.country || 'N/A'}</div>
                    <div><strong>Postal Code:</strong> {showGuestDetails.address?.postalCode || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* ID Documents */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">ID Documents</h4>
                {showGuestDetails.idDocuments && showGuestDetails.idDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showGuestDetails.idDocuments.map((doc, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="space-y-2">
                          <div><strong>Type:</strong> {doc.documentType}</div>
                          <div><strong>Number:</strong> {doc.documentNumber}</div>
                          <div><strong>Issued:</strong> {doc.issuedDate ? new Date(doc.issuedDate).toLocaleDateString() : 'N/A'}</div>
                          <div><strong>Expires:</strong> {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'N/A'}</div>
                          <div><strong>Uploaded:</strong> {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                          {doc.documentImage && (
                            <div>
                              <strong>Document:</strong>
                              <img 
                                src={`http://localhost:5000${doc.documentImage}`} 
                                alt="ID Document" 
                                className="mt-2 h-20 w-20 object-cover rounded cursor-pointer"
                                onClick={() => window.open(`http://localhost:5000${doc.documentImage}`, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No ID documents uploaded</p>
                )}
                
                {/* Upload New Document */}
                <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">Upload New Document</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Document Type</label>
                      <select
                        value={documentForm.documentType}
                        onChange={(e) => setDocumentForm({...documentForm, documentType: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="passport">Passport</option>
                        <option value="national_id">National ID</option>
                        <option value="driving_license">Driving License</option>
                        <option value="aadhaar">Aadhaar</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Document Number</label>
                      <input
                        type="text"
                        value={documentForm.documentNumber}
                        onChange={(e) => setDocumentForm({...documentForm, documentNumber: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Issued Date</label>
                      <input
                        type="date"
                        value={documentForm.issuedDate}
                        onChange={(e) => setDocumentForm({...documentForm, issuedDate: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                      <input
                        type="date"
                        value={documentForm.expiryDate}
                        onChange={(e) => setDocumentForm({...documentForm, expiryDate: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Document File</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleUploadDocument(showGuestDetails._id)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Upload Document
                  </button>
                </div>
              </div>

              {/* Visit History */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Visit History</h4>
                {showGuestDetails.visitHistory && showGuestDetails.visitHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {showGuestDetails.visitHistory.map((visit, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(visit.checkInDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {visit.checkOutDate ? new Date(visit.checkOutDate).toLocaleDateString() : 'Active'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {visit.branchId?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {visit.roomNumber || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              ${visit.totalAmount || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                                visit.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {visit.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No visit history available</p>
                )}
              </div>

              {/* Blacklist Information */}
              {showGuestDetails.isBlacklisted && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Blacklist Information</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="space-y-2">
                      <div><strong>Status:</strong> <span className="text-red-800">Blacklisted</span></div>
                      <div><strong>Reason:</strong> {showGuestDetails.blacklistReason}</div>
                      <div><strong>Blacklisted On:</strong> {showGuestDetails.blacklistedAt ? new Date(showGuestDetails.blacklistedAt).toLocaleDateString() : 'N/A'}</div>
                      <div><strong>Blacklisted By:</strong> {showGuestDetails.blacklistedBy?.name || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowGuestDetails(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
