// SIMPLE FIX FOR RECEPTIONIST DASHBOARD
// Replace the ENTIRE billing section in ReceptionistDashboard.jsx with this code

// 1. First, ADD these state variables at the top (after existing state):
const [allInvoices, setAllInvoices] = useState([]);
const [billingTab, setBillingTab] = useState('invoices');

// 2. ADD this function after existing functions:
const fetchAllInvoices = async () => {
  if (!selectedHotel || !selectedBranch) return;
  
  try {
    setBillingLoading(true);
    const response = await billingAPI.getInvoices();
    if (response.success) {
      const allInvoices = response.data || [];
      const branchInvoices = allInvoices.filter(invoice => 
        invoice.branchId === selectedBranch._id || 
        (invoice.branchId && invoice.branchId._id === selectedBranch._id)
      );
      setAllInvoices(branchInvoices);
    }
  } catch (error) {
    console.error("Error fetching invoices:", error);
  } finally {
    setBillingLoading(false);
  }
};

// 3. ADD this useEffect:
useEffect(() => {
  if (showBilling && selectedHotel && selectedBranch) {
    fetchAllInvoices();
  }
}, [showBilling, selectedHotel, selectedBranch]);

// 4. REPLACE the entire billing section (find: ) : showBilling ? ( and replace everything until the next ) : )

) : showBilling ? (
  <div className="bg-white rounded-lg shadow">
    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <h3 className="text-lg font-medium text-gray-900">All Invoices from Database</h3>
      <button
        onClick={() => setShowBilling(false)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to Dashboard
      </button>
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
          All Invoices ({allInvoices.length})
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
                          onClick={async () => {
                            try {
                              await billingAPI.updateInvoice(record._id, { status: 'paid' });
                              alert("Invoice marked as paid!");
                              fetchAllInvoices();
                            } catch (error) {
                              console.error("Error marking as paid:", error);
                              alert("Error marking as paid: " + error.message);
                            }
                          }}
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
    
    {/* Payment Records Section */}
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
)
