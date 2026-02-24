import { useState, useEffect } from "react";
import { billingAPI } from "../services/api.js";

export default function BillingManagement() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [branchRevenue, setBranchRevenue] = useState(null);
  const [taxReports, setTaxReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [branches, setBranches] = useState([]);
  const [guests, setGuests] = useState([]);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    bookingId: '',
    guestId: '',
    branchId: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0, taxRate: 18, taxAmount: 0 }],
    dueDate: '',
    notes: '',
    taxCalculations: { cgst: 0, sgst: 0, igst: 0, totalTax: 0 }
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: 0,
    paymentMethod: 'cash',
    paymentType: 'full',
    branchId: '',
    notes: ''
  });

  const [reportFilters, setReportFilters] = useState({
    type: 'revenue',
    period: 'monthly',
    branchId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
    fetchBranches();
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const data = await fetch('http://localhost:5000/api/guests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      }).then(res => res.json());
      
      if (data.success) {
        setGuests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching guests:", error);
      setGuests([]);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await billingAPI.getInvoices();
      setInvoices(data.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      const data = await billingAPI.getPayments();
      setPayments(data.data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      // Get user info to determine hotel
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const hotelId = user.hotelId || user.id;
      
      if (hotelId) {
        const data = await fetch(`http://localhost:5000/api/hotels/${hotelId}/branches`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`
          }
        }).then(res => res.json());
        
        if (data.success) {
          setBranches(data.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      // Fallback to empty array
      setBranches([]);
    }
  };

  const fetchBranchRevenue = async (branchId) => {
    try {
      const data = await billingAPI.getBranchRevenue(branchId);
      setBranchRevenue(data.data);
    } catch (error) {
      console.error("Error fetching branch revenue:", error);
    }
  };

  const fetchTaxReports = async () => {
    try {
      const data = await billingAPI.calculateTaxes(reportFilters);
      setTaxReports(data.data || []);
    } catch (error) {
      console.error("Error fetching tax reports:", error);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!invoiceForm.guestId) {
      alert("Please select a guest");
      return;
    }
    if (!invoiceForm.branchId) {
      alert("Please select a branch");
      return;
    }
    if (!invoiceForm.dueDate) {
      alert("Please set a due date");
      return;
    }
    
    // Validate items
    const validItems = invoiceForm.items.filter(item => 
      item.description && item.quantity > 0 && item.unitPrice > 0
    );
    
    if (validItems.length === 0) {
      alert("Please add at least one valid item with description, quantity, and price");
      return;
    }
    
    try {
      await billingAPI.createInvoice({
        ...invoiceForm,
        items: validItems
      });
      alert("Invoice created successfully!");
      setShowCreateInvoice(false);
      setInvoiceForm({
        bookingId: '',
        guestId: '',
        branchId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, total: 0, taxRate: 18, taxAmount: 0 }],
        dueDate: '',
        notes: '',
        taxCalculations: { cgst: 0, sgst: 0, igst: 0, totalTax: 0 }
      });
      fetchInvoices();
    } catch (error) {
      alert("Error creating invoice: " + error.message);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      await billingAPI.createPayment(paymentForm);
      alert("Payment recorded successfully!");
      setShowCreatePayment(false);
      setPaymentForm({
        invoiceId: '',
        amount: 0,
        paymentMethod: 'cash',
        paymentType: 'full',
        branchId: '',
        notes: ''
      });
      fetchPayments();
    } catch (error) {
      alert("Error creating payment: " + error.message);
    }
  };

  const handleGeneratePDF = async (invoiceId) => {
    try {
      const data = await billingAPI.generateInvoicePDF(invoiceId);
      if (data.success) {
        // Open PDF in new tab
        window.open(`http://localhost:5000${data.pdfPath}`, '_blank');
      }
    } catch (error) {
      alert("Error generating PDF: " + error.message);
    }
  };

  const handleExportReport = async (format) => {
    try {
      const data = await billingAPI.getBillingReports(reportFilters);
      if (data.success) {
        // Create and download file
        const csvContent = convertToCSV(data.data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billing-report-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
      }
    } catch (error) {
      alert("Error exporting report: " + error.message);
    }
  };

  const convertToCSV = (data) => {
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(obj => Object.values(obj).join(','));
      return [headers, ...rows].join('\n');
    }
    return '';
  };

  const updateInvoiceItem = (index, field, value) => {
    const updatedItems = [...invoiceForm.items];
    updatedItems[index][field] = value;
    
    // Recalculate totals
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
      updatedItems[index].taxAmount = updatedItems[index].total * (updatedItems[index].taxRate / 100);
    }
    
    setInvoiceForm({ ...invoiceForm, items: updatedItems });
  };

  const addInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { 
        description: '', 
        quantity: 1, 
        unitPrice: 0, 
        total: 0, 
        taxRate: 18, 
        taxAmount: 0 
      }]
    });
  };

  const removeInvoiceItem = (index) => {
    const updatedItems = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, items: updatedItems });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partially_paid': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateInvoice(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                + Create Invoice
              </button>
              <button
                onClick={() => setShowCreatePayment(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + Record Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {['invoices', 'payments', 'reports'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h2>
              
              {/* Invoice List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.guestId?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${invoice.totalAmount?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleGeneratePDF(invoice._id)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            PDF
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payments</h2>
              
              {/* Payment List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.paymentNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.invoiceId?.invoiceNumber || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payment.amount?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.paymentType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Analytics</h2>
              
              {/* Report Filters */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select
                      value={reportFilters.type}
                      onChange={(e) => setReportFilters({ ...reportFilters, type: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="revenue">Revenue Report</option>
                      <option value="payments">Payment Report</option>
                      <option value="taxes">Tax Report</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                    <select
                      value={reportFilters.period}
                      onChange={(e) => setReportFilters({ ...reportFilters, period: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <select
                      value={reportFilters.branchId}
                      onChange={(e) => setReportFilters({ ...reportFilters, branchId: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Branches</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} - {branch.city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={fetchTaxReports}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Generate Report
                    </button>
                    <button
                      onClick={() => handleExportReport('csv')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => handleExportReport('pdf')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Tax Report Display */}
              {taxReports.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Branch-wise Tax Calculations</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CGST</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SGST</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IGST</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tax</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {taxReports.map((report, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {report.branch?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${report.cgst?.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${report.sgst?.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${report.igst?.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${report.totalTax?.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${report.totalRevenue?.toFixed(2)}
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
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative min-h-screen flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Create Invoice</h3>
                <button
                  onClick={() => setShowCreateInvoice(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreateInvoice} className="px-6 py-4">
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Booking ID:</label>
                    <div className="text-lg font-bold text-indigo-600">
                      {showCreateInvoice ? 'AUTO-GENERATED' : 'N/A'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Booking ID will be automatically assigned when you create invoice
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Booking ID</label>
                    <input
                      type="text"
                      value={invoiceForm.bookingId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, bookingId: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Guest</label>
                    <select
                      value={invoiceForm.guestId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, guestId: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Guest</option>
                      {guests.map((guest) => (
                        <option key={guest._id} value={guest._id}>
                          {guest.name} - {guest.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <select
                      value={invoiceForm.branchId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, branchId: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} - {branch.city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
                    <button
                      type="button"
                      onClick={addInvoiceItem}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {invoiceForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border border-gray-200 rounded-md">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Tax %"
                          value={item.taxRate}
                          onChange={(e) => updateInvoiceItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <div className="text-sm text-gray-900">
                          Total: ${item.total?.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeInvoiceItem(index)}
                          className="px-2 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateInvoice(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Create Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreatePayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative min-h-screen flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
                <button
                  onClick={() => setShowCreatePayment(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreatePayment} className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice</label>
                    <select
                      value={paymentForm.invoiceId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Invoice</option>
                      {invoices.map((invoice) => (
                        <option key={invoice._id} value={invoice._id}>
                          {invoice.invoiceNumber} - ${invoice.totalAmount?.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <select
                      value={paymentForm.branchId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, branchId: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} - {branch.city}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                    <select
                      value={paymentForm.paymentType}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="full">Full Payment</option>
                      <option value="partial">Partial Payment</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreatePayment(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
