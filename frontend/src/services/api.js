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
  
  console.log("DEBUG: API Request to:", endpoint, "Token exists:", !!token);
  
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
  
  const result = await response.json();
  console.log("DEBUG: API Response:", result);
  return result;
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
  
  getHotelRooms: (hotelId, branchId) => roomAPI.getRooms(hotelId, branchId),
  
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

// Booking API calls
export const bookingAPI = {
  getBookings: () => apiRequest('/bookings'),
  
  createBooking: (bookingData) => apiRequest('/bookings', {
    method: "POST",
    body: JSON.stringify(bookingData)
  }),
  
  getBookingById: (bookingId) => apiRequest(`/bookings/${bookingId}`),
  
  updateBooking: (bookingId, bookingData) => apiRequest(`/bookings/${bookingId}`, {
    method: "PUT",
    body: JSON.stringify(bookingData)
  }),
  
  deleteBooking: (bookingId) => apiRequest(`/bookings/${bookingId}`, {
    method: "DELETE"
  }),
  
  checkIn: (bookingId) => apiRequest(`/bookings/${bookingId}/checkin`, {
    method: "PATCH"
  }),
  
  checkOut: (bookingId) => apiRequest(`/bookings/${bookingId}/checkout`, {
    method: "PATCH"
  }),
  
  cancelBooking: (bookingId) => apiRequest(`/bookings/${bookingId}/cancel`, {
    method: "PATCH"
  }),
  
  getBookingHistory: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/bookings/history${params ? '?' + params : ''}`);
  },
  
  getBookingsByHotel: (hotelId) => apiRequest(`/bookings?hotelId=${hotelId}`),
  
  getBookingsByBranch: (hotelId, branchId) => apiRequest(`/bookings?hotelId=${hotelId}&branchId=${branchId}`)
};

// User Management API calls
export const userAPI = {
  getUsers: (hotelId) => apiRequest(`/hotels/${hotelId}/users`),
  
  getAllUsers: () => {
    console.log("getAllUsers API called");
    return apiRequest(`/hotels/users/all`);
  },
  
  createUser: (hotelId, userData) => apiRequest(`/hotels/${hotelId}/users`, {
    method: "POST",
    body: JSON.stringify(userData)
  }),
  
  updateUser: (hotelId, userId, userData) => apiRequest(`/hotels/${hotelId}/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData)
  }),
  
  deleteUser: (hotelId, userId) => apiRequest(`/hotels/${hotelId}/users/${userId}`, {
    method: "DELETE"
  })
};

// Guest Management APIs
export const guestAPI = {
  createGuest: (guestData) => apiRequest('/guests', {
    method: 'POST',
    body: JSON.stringify(guestData)
  }),
  
  getGuests: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/guests${queryString ? '?' + queryString : ''}`);
  },
  
  getGuestById: (id) => apiRequest(`/guests/${id}`),
  
  updateGuest: (id, guestData) => apiRequest(`/guests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(guestData)
  }),
  
  deleteGuest: (id) => apiRequest(`/guests/${id}`, {
    method: 'DELETE'
  }),
  
  addVisit: (id, visitData) => apiRequest(`/guests/${id}/visits`, {
    method: 'POST',
    body: JSON.stringify(visitData)
  }),
  
  blacklistGuest: (id, reason) => apiRequest(`/guests/${id}/blacklist`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  
  removeFromBlacklist: (id) => apiRequest(`/guests/${id}/blacklist`, {
    method: 'DELETE'
  }),
  
  uploadDocument: (id, formData) => {
    const token = localStorage.getItem("token");
    return fetch(`${API_BASE_URL}/guests/${id}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
  },
  
  getStatistics: () => apiRequest('/guests/statistics')
};

// Billing & Payments API
export const billingAPI = {
  // Invoice APIs
  getInvoices: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/billing/invoices${queryString ? '?' + queryString : ''}`);
  },
  
  createInvoice: (invoiceData) => apiRequest('/billing/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceData)
  }),
  
  updateInvoice: (id, invoiceData) => apiRequest(`/billing/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(invoiceData)
  }),
  
  deleteInvoice: (id) => apiRequest(`/billing/invoices/${id}`, {
    method: 'DELETE'
  }),
  
  generateInvoicePDF: (id) => apiRequest(`/billing/invoices/${id}/pdf`),
  
  // Payment APIs
  getPayments: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/billing/payments${queryString ? '?' + queryString : ''}`);
  },
  
  createPayment: (paymentData) => apiRequest('/billing/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData)
  }),
  
  updatePayment: (id, paymentData) => apiRequest(`/billing/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(paymentData)
  }),
  
  // Reports APIs
  getBillingReports: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/billing/reports${queryString ? '?' + queryString : ''}`);
  },
  
  getBranchRevenue: (branchId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/billing/revenue/branch/${branchId}${queryString ? '?' + queryString : ''}`);
  },
  
  calculateTaxes: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/billing/taxes${queryString ? '?' + queryString : ''}`);
  }
};
