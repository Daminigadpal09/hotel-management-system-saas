const testBranchRoomsAPI = async () => {
  try {
    // Login to get token
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
      console.log('Got token successfully');
      
      // First, get branches to find a valid branch ID
      console.log('Getting branches...');
      const branchesResponse = await fetch('http://localhost:5000/api/branches/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (branchesResponse.status === 200) {
        const branchesData = await branchesResponse.json();
        console.log('Branches data:', branchesData);
        
        if (branchesData.data && branchesData.data.length > 0) {
          const firstBranch = branchesData.data[0];
          console.log('Testing with branch:', firstBranch);
          
          // Test the branch rooms endpoint
          console.log(`Testing /api/branches/${firstBranch._id}/rooms...`);
          const roomsResponse = await fetch(`http://localhost:5000/api/branches/${firstBranch._id}/rooms`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Branch rooms response status:', roomsResponse.status);
          
          if (roomsResponse.status === 200) {
            const roomsData = await roomsResponse.json();
            console.log('✅ Branch rooms API works!');
            console.log('Rooms data:', roomsData);
            console.log('Number of rooms:', roomsData.data?.length || 0);
          } else {
            const errorData = await roomsResponse.text();
            console.log('❌ Branch rooms API failed:', errorData);
          }
        } else {
          console.log('No branches found');
        }
      } else {
        const branchError = await branchesResponse.text();
        console.log('❌ Branches API failed:', branchError);
      }
    } else {
      const loginError = await loginResponse.text();
      console.log('❌ Login failed:', loginError);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
};

testBranchRoomsAPI();
