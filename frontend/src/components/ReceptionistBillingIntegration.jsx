// Integration Guide for Receptionist Dashboard Billing Enhancement
// Copy and paste this code into your ReceptionistDashboard.jsx file

// 1. ADD these state variables after existing state declarations:
const [allInvoices, setAllInvoices] = useState([]);
const [billingRecords, setBillingRecords] = useState([]);

// 2. ADD these calculations after user declaration:
// Calculate billing statistics
const totalBilling = allInvoices.reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);
const totalPayments = allInvoices.filter(r => r.status === 'paid').reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);
const pendingBilling = allInvoices.filter(r => r.status === 'pending' || r.status === 'sent').reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);
const paidBilling = allInvoices.filter(r => r.status === 'paid').reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);

// 3. ADD this function to fetch all invoices:
const fetchAllInvoices = async () => {
  if (!selectedHotel || !selectedBranch) return;
  
  try {
    setBillingLoading(true);
    const response = await billingAPI.getInvoices();
    if (response.success) {
      // Filter invoices by branch
      const allInvoices = response.data || [];
      const branchInvoices = allInvoices.filter(invoice => 
        invoice.branchId === selectedBranch._id || 
        (invoice.branchId && invoice.branchId._id === selectedBranch._id)
      );
      setAllInvoices(branchInvoices);
      setBillingRecords(branchInvoices);
    }
  } catch (error) {
    console.error("Error fetching invoices:", error);
  } finally {
    setBillingLoading(false);
  }
};

// 4. REPLACE the existing billing section content with this:
// Find the line: ) : showBilling ? (
// Replace everything inside that section with:

<div className="bg-white rounded-lg shadow">
  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
    <h3 className="text-lg font-medium text-gray-900">Billing & Payments</h3>
    <button
      onClick={() => setShowBilling(false)}
      className="text-sm text-gray-500 hover:text-gray-700"
    >
      ← Back to Dashboard
    </button>
  </div>
  
  {/* Financial Summary Cards */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Total Billing</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${totalBilling.toFixed(2)}</p>
        </div>
        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
    </div>
    
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Total Payments</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${totalPayments.toFixed(2)}</p>
        </div>
        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>
    </div>
    
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Pending Amount</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">${pendingBilling.toFixed(2)}</p>
        </div>
        <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
    
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Paid Amount</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${paidBilling.toFixed(2)}</p>
        </div>
        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
  </div>

  {/* Tab Navigation */}
  <div className="border-b border-gray-200">
    <nav className="flex -mb-px">
      <button
        onClick={() => setBillingTab('invoices')}
        className={`py-4 px-6 border-b-2 font-medium text-sm ${
          billingTab === 'invoices'
            ? 'border-teal-500 text-teal-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        All Invoices
      </button>
      <button
        onClick={() => setBillingTab('payments')}
        className={`py-4 px-6 border-b-2 font-medium text-sm ${
          billingTab === 'payments'
            ? 'border-teal-500 text-teal-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Payment Records
      </button>
    </nav>
  </div>
  
  {/* All Invoices Section */}
  {billingTab === 'invoices' && (
    <div className="p-6">
      {billingLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      ) : allInvoices.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500">No invoices available for this branch.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allInvoices.map(record => (
                <tr key={record._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record._id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.guestName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.roomNumber || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(record.totalAmount || record.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      record.status === 'paid' ? 'bg-green-100 text-green-800' :
                      record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      record.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {(record.status === 'pending' || record.status === 'sent') && (
                      <button
                        onClick={() => handleMarkAsPaid(record._id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Mark as Paid
                      </button>
                    )}
                    <button className="text-gray-600 hover:text-gray-900">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}

  {/* Payment Records Section - Shows all invoices as payment records */}
  {billingTab === 'payments' && (
    <div className="p-6">
      {billingLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment records...</p>
        </div>
      ) : allInvoices.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payment records found</h3>
          <p className="text-gray-500">No payment records available for this branch.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allInvoices.map(record => (
                <tr key={record._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record._id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record._id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(record.totalAmount || record.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.paymentMethod || 'billing'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.transactionId || record.invoiceNumber || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.createdAt || record.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      record.status === 'paid' ? 'bg-green-100 text-green-800' :
                      record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      record.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
</div>

// 5. ADD this function for marking as paid:
const handleMarkAsPaid = async (recordId) => {
  try {
    await billingAPI.updateInvoice(recordId, { status: 'paid' });
    alert("Invoice marked as paid!");
    fetchAllInvoices();
  } catch (error) {
    console.error("Error marking as paid:", error);
    alert("Error marking as paid: " + error.message);
  }
};

// 6. UPDATE useEffect to call fetchAllInvoices:
useEffect(() => {
  fetchAllInvoices();
}, [selectedHotel, selectedBranch]);

// 7. UPDATE the existing useEffect that calls fetchBillingAndPayments to use fetchAllInvoices instead
