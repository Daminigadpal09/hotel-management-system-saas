const API_BASE_URL = "http://localhost:5000/api";

// Get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  
  // Debug logging
  console.log("DEBUG: Frontend token check:", {
    hasToken: !!token,
    tokenValue: token ? token.substring(0, 50) + "..." : "null"
  });

  if (!token) {
    return {
      "Content-Type": "application/json"
    };
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  
  console.log("DEBUG: Token value:", token ? token.substring(0, 50) + "..." : "null");
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    ...options
  });

  console.log("DEBUG: API Request:", {
    method: options.method || "GET",
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    status: response.status,
    statusText: response.statusText
  });
  
  // Debug logging
  console.log("DEBUG: API Request:", {
    method: options.method || "GET",
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
    status: response.status,
    statusText: response.statusText
  });

  if (!response.ok) {
    // Try to get error message from response body
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const errorData = await response.clone().json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
      console.error("DEBUG: API Error Response:", errorData);
    } catch (e) {
      // Response is not JSON
      console.error("DEBUG: API Error Response (non-JSON):", await response.text());
    }
    
    if (response.status === 401) {
      // Token expired, clear storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return null;
    }
    throw new Error(`API Error: ${errorMessage}`);
  }
  
  return response.json();
};

// Auth API calls
export const authAPI = {
  login: (credentials) => apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  }),
  
  register: (userData) => apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData)
  })
};

// Hotel API calls
export const hotelAPI = {
  getHotels: () => apiRequest("/hotels"),
  
  getHotelById: (id) => apiRequest(`/hotels/${id}`),
  
  createHotel: (hotelData) => apiRequest("/hotels", {
    method: "POST",
    body: JSON.stringify(hotelData)
  }),
  
  updateHotel: (id, hotelData) => apiRequest(`/hotels/${id}`, {
    method: "PUT",
    body: JSON.stringify(hotelData)
  }),
  
  deleteHotel: (id) => apiRequest(`/hotels/${id}`, {
    method: "DELETE"
  })
};

// Branch API calls
export const branchAPI = {
  getBranches: (hotelId) => apiRequest(`/hotels/${hotelId}/branches`),
  
  createBranch: (hotelId, branchData) => apiRequest(`/hotels/${hotelId}/branches`, {
    method: "POST",
    body: JSON.stringify(branchData)
  }),
  
  updateBranch: (hotelId, branchId, branchData) => apiRequest(`/hotels/${hotelId}/branches/${branchId}`, {
    method: "PUT",
    body: JSON.stringify(branchData)
  }),
  
  deleteBranch: (hotelId, branchId) => apiRequest(`/hotels/${hotelId}/branches/${branchId}`, {
    method: "DELETE"
  })
};

// Room API calls
export const roomAPI = {
  getRooms: (hotelId, branchId, filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms${queryString ? `?${queryString}` : ''}`);
  },
  
  getRoomById: (hotelId, branchId, roomId) => 
    apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms/${roomId}`),
  
  createRoom: (hotelId, branchId, roomData) => apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms`, {
    method: "POST",
    body: JSON.stringify(roomData)
  }),
  
  updateRoom: (hotelId, branchId, roomId, roomData) => apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms/${roomId}`, {
    method: "PUT",
    body: JSON.stringify(roomData)
  }),
  
  updateRoomStatus: (hotelId, branchId, roomId, status) => apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms/${roomId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  }),
  
  deleteRoom: (hotelId, branchId, roomId) => apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms/${roomId}`, {
    method: "DELETE"
  })
};

// Maintenance API calls
export const maintenanceAPI = {
  getCleaningSchedule: (hotelId, branchId) => 
    apiRequest(`/hotels/${hotelId}/branches/${branchId}/cleaning`),
  
  updateCleaningSchedule: (hotelId, branchId, roomId, scheduleData) => 
    apiRequest(`/hotels/${hotelId}/branches/${branchId}/cleaning/schedule`, {
      method: "PUT",
      body: JSON.stringify(scheduleData)
    }),
  
  markRoomCleaned: (hotelId, branchId, roomId, cleaningData) => 
    apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms/${roomId}/cleaned`, {
      method: "PUT",
      body: JSON.stringify(cleaningData)
    }),
  
  getMaintenanceIssues: (hotelId, branchId) => 
    apiRequest(`/hotels/${hotelId}/branches/${branchId}/maintenance`),
  
  reportMaintenanceIssue: (hotelId, branchId, roomId, issueData) => 
    apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms/${roomId}/maintenance`, {
      method: "POST",
      body: JSON.stringify(issueData)
    }),
  
  resolveMaintenanceIssue: (hotelId, branchId, roomId, resolutionData) => 
    apiRequest(`/hotels/${hotelId}/branches/${branchId}/rooms/${roomId}/maintenance/resolve`, {
      method: "PUT",
      body: JSON.stringify(resolutionData)
    })
};
