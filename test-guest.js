const testData = {
  name: "Test Guest",
  phone: "1234567890",
  email: "test@example.com"
};

fetch('http://localhost:5000/api/guests', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NDVhZjY5ZjM5ZmU2M2E5ZmFmMmM2ZiIsImlhdCI6MTc3MTgyMDU0NCwiZXhwIjoxNzcyNDI1MzQ0fQ.mmDYA7UPf10dUNFZZTaOEl7K1to0ONycyPOQKd25lci'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
