// Simple test to check if billing API endpoints are working
console.log('🧪 Testing Billing API endpoints...');

// Test 1: Check if server is responding
fetch('http://localhost:5000/api/health')
  .then(res => res.json())
  .then(data => {
    console.log('✅ Health check:', data);
    
    // Test 2: Try to access billing endpoints (should fail with auth error)
    return fetch('http://localhost:5000/api/billing/invoices', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  })
  .then(res => {
    console.log('📋 Billing API Status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('📋 Billing API Response:', data);
    
    if (data.success === false && data.message.includes('token')) {
      console.log('✅ Billing API is working - requires authentication (expected)');
    } else {
      console.log('❌ Unexpected response');
    }
  })
  .catch(error => {
    console.error('❌ Error testing billing API:', error.message);
  });
