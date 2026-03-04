import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = user.role?.toLowerCase();
    
    // Redirect based on role
    if (role === "super_admin") {
      navigate("/super-admin");
    } else if (role === "owner") {
      navigate("/owner-dashboard");
    } else if (role === "branch_manager") {
      navigate("/branch-manager-dashboard");
    } else if (role === "receptionist") {
      navigate("/receptionist-dashboard");
    } else if (role === "housekeeper" || role === "housekeeping") {
      navigate("/housekeeping-dashboard");
    } else if (role === "accountant") {
      navigate("/accountant-dashboard");
    } else {
      // If no valid role, redirect to login
      navigate("/login");
    }
  }, [navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
