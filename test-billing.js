const testData = {
  guestId: "699c15706887d0b588f14185", // Use existing guest ID
  branchId: "699810892daf7854a6542fba", // Use user ID as branch
  items: [
    {
      description: "Room Booking",
      quantity: 1,
      unitPrice: 1000,
      total: 1000,
      taxRate: 18,
      taxAmount: 180
    }
  ],
  dueDate: "2026-03-01",
  notes: "Test invoice creation"
};

fetch('http://localhost:5000/api/billing/invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5OTgxMDg5MmRhZjc4NTRhNjU0MmZiYSIsInJvbGUiOiJvd25lciIsImlhdCI6MTc3MTgyMDU0NCwiZXhwIjoxNzcyNDI1MzQ0fQ.mmDYA7UPf10dUNFZZTaOEl7K1to0ONycyPOQKd25lci'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
