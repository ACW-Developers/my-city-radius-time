import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import AttendanceHistory from "./pages/AttendanceHistory";
import PaySummary from "./pages/PaySummary";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import PayRateManagement from "./pages/admin/PayRateManagement";
import AdminAttendance from "./pages/admin/AdminAttendance";
import Payroll from "./pages/admin/Payroll";
import Reports from "./pages/admin/Reports";
import ActivityLog from "./pages/admin/ActivityLog";
import Settings from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";
import AdminGuard from "./components/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="checkin" element={<CheckIn />} />
              <Route path="attendance" element={<AttendanceHistory />} />
              <Route path="pay" element={<PaySummary />} />
              <Route path="profile" element={<Profile />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="admin/employees" element={<AdminGuard><EmployeeManagement /></AdminGuard>} />
              <Route path="admin/pay-rates" element={<AdminGuard><PayRateManagement /></AdminGuard>} />
              <Route path="admin/attendance" element={<AdminGuard><AdminAttendance /></AdminGuard>} />
              <Route path="admin/payroll" element={<AdminGuard><Payroll /></AdminGuard>} />
              <Route path="admin/reports" element={<AdminGuard><Reports /></AdminGuard>} />
              <Route path="activity-log" element={<AdminGuard><ActivityLog /></AdminGuard>} />
              <Route path="settings" element={<AdminGuard><Settings /></AdminGuard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
