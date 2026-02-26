const testBranchesAPI = async () => {
  try {
    console.log('Testing /api/branches endpoint...');
    
    // Test without auth first to see if route exists
    const response = await fetch('http://localhost:5000/api/branches', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.text();
    console.log('Response data:', data);
    
    if (response.status === 401) {
      console.log('✅ Route exists but requires authentication (401 Unauthorized)');
    } else if (response.status === 404) {
      console.log('❌ Route not found (404 Not Found)');
    } else {
      console.log('✅ Route accessible');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testBranchesAPI();
