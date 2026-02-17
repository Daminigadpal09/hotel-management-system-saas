import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Hero Section */}
      <section className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-32 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Manage Your Hotel Effortlessly
          </h1>
          <p className="text-lg mb-8">
            All-in-one cloud platform for multi-branch hotels. Streamline bookings, rooms, staff, and payments.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded hover:bg-gray-100 transition"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-white rounded hover:bg-white hover:text-indigo-600 transition"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">Core Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-xl mb-2">Hotel & Branch Management</h3>
              <p>Manage multiple hotels and branches effortlessly with role-based access control.</p>
            </div>
            <div className="p-6 bg-white rounded shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-xl mb-2">Room Management</h3>
              <p>Track room categories, availability, and maintenance status per branch.</p>
            </div>
            <div className="p-6 bg-white rounded shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-xl mb-2">Booking Management</h3>
              <p>Create, modify, check-in, and check-out bookings with complete history.</p>
            </div>
            <div className="p-6 bg-white rounded shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-xl mb-2">Guest Management</h3>
              <p>Store guest records, upload ID documents, and manage visit history.</p>
            </div>
            <div className="p-6 bg-white rounded shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-xl mb-2">Billing & Payments</h3>
              <p>Generate invoices, track partial or full payments, and calculate taxes per branch.</p>
            </div>
            <div className="p-6 bg-white rounded shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-xl mb-2">Reports & Dashboard</h3>
              <p>View occupancy, revenue trends, and financial summary for your hotel or branches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-indigo-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8">Why Choose HotelPro SaaS?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded shadow">
              <h3 className="font-semibold mb-2">Multi-Tenant Architecture</h3>
              <p>Each hotel operates independently with isolated data for maximum security.</p>
            </div>
            <div className="p-6 bg-white rounded shadow">
              <h3 className="font-semibold mb-2">Role-Based Access</h3>
              <p>Super Admin, Owner, Branch Manager, Receptionist, Housekeeping – access exactly what you need.</p>
            </div>
            <div className="p-6 bg-white rounded shadow">
              <h3 className="font-semibold mb-2">Cloud-Based & Flexible</h3>
              <p>Access your dashboard from anywhere with monthly or yearly subscription plans.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
        <Link
          to="/register"
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition"
        >
          Start Free Trial
        </Link>
      </section>
    </div>
  );
}
