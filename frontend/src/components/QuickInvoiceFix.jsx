// QUICK FIX - Replace your billing section with this
// In ReceptionistDashboard.jsx, find the billing section and replace it entirely

// 1. Add this state at the top with other states:
const [allInvoices, setAllInvoices] = useState([]);
const [billingLoading, setBillingLoading] = useState(false);

// 2. Add this function:
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
      console.log("Found invoices:", branchInvoices.length);
    }
  } catch (error) {
    console.error("Error fetching invoices:", error);
  } finally {
    setBillingLoading(false);
  }
};

// 3. Add this useEffect:
useEffect(() => {
  if (showBilling && selectedHotel && selectedBranch) {
    fetchAllInvoices();
  }
}, [showBilling, selectedHotel, selectedBranch]);

// 4. REPLACE the entire billing section with this:
// Find: ) : showBilling ? (
// Replace everything until the next ) : with:

) : showBilling ? (
  <div className="bg-white rounded-lg shadow">
    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <h3 className="text-lg font-medium text-gray-900">All Invoices from Database ({allInvoices.length})</h3>
      <button
        onClick={() => setShowBilling(false)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to Dashboard
      </button>
    </div>
    
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
          <button 
            onClick={fetchAllInvoices}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh Invoices
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-900">All Invoices ({allInvoices.length})</h4>
            <button 
              onClick={fetchAllInvoices}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </div>
          
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{record._id.substring(0, 8)}...</span>
                    </td>
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
        </div>
      )}
    </div>
  </div>
)
