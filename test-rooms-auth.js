const testRoomsWithAuth = async () => {
  try {
    console.log('Testing /api/rooms/all-rooms with authentication...');
    
    // Test with a mock token (this will fail but show us the endpoint exists)
    const response = await fetch('http://localhost:5000/api/rooms/all-rooms', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_token_for_testing'
      }
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.text();
    console.log('Response data:', data);
    
    if (response.status === 401) {
      console.log('✅ Route exists and requires authentication (401 Unauthorized)');
    } else if (response.status === 404) {
      console.log('❌ Route not found (404 Not Found)');
    } else if (response.status === 500) {
      console.log('⚠️ Server error (500 Internal Server Error) - route exists but has issues');
    } else {
      console.log('✅ Route accessible');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testRoomsWithAuth();
