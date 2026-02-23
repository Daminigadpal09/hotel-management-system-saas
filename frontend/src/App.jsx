   
 import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import HotelOwnerDashboard from "./pages/HotelOwnerDashboard";
import BranchManagement from "./pages/BranchManagement";
import RoomManagement from "./pages/RoomManagementEnhanced";
import BookingManagement from "./pages/BookingManagement";
import GuestManagement from "./pages/GuestManagement";
import ViewHotel from "./pages/ViewHotel";
import BillingManagement from "./pages/BillingManagement";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <HotelOwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner-dashboard"
          element={
            <ProtectedRoute>
              <HotelOwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branches/:hotelId"
          element={
            <ProtectedRoute>
              <BranchManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:hotelId/:branchId"
          element={
            <ProtectedRoute>
              <RoomManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room-management"
          element={
            <ProtectedRoute>
              <RoomManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hotel-rooms/:hotelId"
          element={
            <ProtectedRoute>
              <RoomManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <BookingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:hotelId"
          element={
            <ProtectedRoute>
              <BookingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:hotelId/:branchId"
          element={
            <ProtectedRoute>
              <BookingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guests"
          element={
            <ProtectedRoute>
              <GuestManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guests/:hotelId"
          element={
            <ProtectedRoute>
              <GuestManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/view-hotel/:hotelId"
          element={
            <ProtectedRoute>
              <ViewHotel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;



 

