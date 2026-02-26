const testRealAPI = async () => {
  try {
    // Try with existing user to get a real token
    console.log('Testing login with existing user...');
    
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'superadmin@hotel-saas.com',
        password: 'superadmin123'
      })
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      const token = loginData.token;
      console.log('Got token:', token);
      
      // Now test the rooms API with real token
      console.log('Testing /api/all-rooms with real token...');
      
      const roomsResponse = await fetch('http://localhost:5000/api/all-rooms', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Rooms API response status:', roomsResponse.status);
      
      if (roomsResponse.status === 200) {
        const roomsData = await roomsResponse.json();
        console.log('✅ Real rooms API works!');
        console.log('Real rooms data:', roomsData);
        console.log('Number of rooms:', roomsData.data?.length || 0);
      } else {
        const errorData = await roomsResponse.text();
        console.log('❌ Real rooms API failed:', errorData);
      }
    } else {
      const loginError = await loginResponse.text();
      console.log('❌ Login failed:', loginError);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
};

testRealAPI();
