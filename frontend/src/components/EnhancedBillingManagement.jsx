import { useState, useEffect } from "react";
import { billingAPI } from "../services/api.js";

export default function EnhancedBillingManagement({ selectedHotel, selectedBranch }) {
  const [billingRecords, setBillingRecords] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingForm, setBillingForm] = useState({
    guestName: '',
    roomNumber: '',
    amount: '',
    type: 'room_charge',
    description: '',
    dueDate: '',
    status: 'pending'
  });

  // Calculate billing statistics
  const totalBilling = billingRecords.reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);
  const totalPayments = billingRecords.filter(r => r.status === 'paid').reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);
  const pendingBilling = billingRecords.filter(r => r.status === 'pending' || r.status === 'sent').reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);
  const paidBilling = billingRecords.filter(r => r.status === 'paid').reduce((sum, record) => sum + (record.totalAmount || record.amount || 0), 0);

  const fetchBillingRecords = async () => {
    if (!selectedHotel || !selectedBranch) return;
    
    try {
      setBillingLoading(true);
      // Get all invoices for the branch
      const response = await billingAPI.getInvoices();
      if (response.success) {
        // Filter invoices by branch and combine with billing records
        const allInvoices = response.data || [];
        const branchInvoices = allInvoices.filter(invoice => 
          invoice.branchId === selectedBranch._id || 
          (invoice.branchId && invoice.branchId._id === selectedBranch._id)
        );
        setBillingRecords(branchInvoices);
      }
    } catch (error) {
      console.error("Error fetching billing records:", error);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingRecords();
  }, [selectedHotel, selectedBranch]);

  const handleCreateBilling = async (e) => {
    e.preventDefault();
    try {
      if (!selectedHotel || !selectedBranch) {
        alert("Please select hotel and branch");
        return;
      }

      const billingData = {
        ...billingForm,
        hotelId: selectedHotel._id,
        branchId: selectedBranch._id,
        amount: parseFloat(billingForm.amount),
        status: billingForm.status || 'pending'
      };
      
      await billingAPI.createBilling(billingData);
      alert("Billing record created successfully!");
      setShowBillingModal(false);
      setBillingForm({
        guestName: '',
        roomNumber: '',
        amount: '',
        type: 'room_charge',
        description: '',
        dueDate: '',
        status: 'pending'
      });
      fetchBillingRecords();
    } catch (error) {
      console.error("Error creating billing record:", error);
      alert("Error creating billing record: " + error.message);
    }
  };

  const handleMarkAsPaid = async (recordId) => {
    try {
      await billingAPI.updateInvoice(recordId, { status: 'paid' });
      alert("Billing record marked as paid!");
      fetchBillingRecords();
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert("Error marking as paid: " + error.message);
    }
  };

  return (
    <div>
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

      {/* Billing Records Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Billing Records</h3>
          <button
            onClick={() => setShowBillingModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + Create Billing
          </button>
        </div>
        
        <div className="p-6">
          {billingLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading billing records...</p>
            </div>
          ) : billingRecords.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No billing records found</h3>
              <p className="text-gray-500">No billing records available for this branch.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                  {billingRecords.map(record => (
                    <tr key={record._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.guestName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.roomNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(record.totalAmount || record.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type}</td>
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
                          <>
                            <button
                              onClick={() => handleMarkAsPaid(record._id)}
                              className="text-green-600 hover:text-green-900 mr-3"
                            >
                              Mark as Paid
                            </button>
                          </>
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
      </div>

      {/* Payment Records Section */}
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment Records (All Invoices)</h3>
        </div>
        
        <div className="p-6">
          {billingLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading payment records...</p>
            </div>
          ) : billingRecords.length === 0 ? (
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
                  {billingRecords.map(record => (
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
      </div>

      {/* Create Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Create Billing Record</h3>
              <button
                onClick={() => setShowBillingModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateBilling} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                  <input
                    type="text"
                    value={billingForm.guestName}
                    onChange={(e) => setBillingForm({...billingForm, guestName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    value={billingForm.roomNumber}
                    onChange={(e) => setBillingForm({...billingForm, roomNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={billingForm.amount}
                    onChange={(e) => setBillingForm({...billingForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
                  <select
                    value={billingForm.type}
                    onChange={(e) => setBillingForm({...billingForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="room_charge">Room Charge</option>
                    <option value="service_fee">Service Fee</option>
                    <option value="amenity">Amenity</option>
                    <option value="penalty">Penalty</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={billingForm.description}
                    onChange={(e) => setBillingForm({...billingForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter billing description..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={billingForm.dueDate}
                    onChange={(e) => setBillingForm({...billingForm, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={billingForm.status}
                    onChange={(e) => setBillingForm({...billingForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBillingModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
