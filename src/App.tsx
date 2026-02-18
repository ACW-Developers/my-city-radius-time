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
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import PayRateManagement from "./pages/admin/PayRateManagement";
import AdminAttendance from "./pages/admin/AdminAttendance";
import Payroll from "./pages/admin/Payroll";
import NotFound from "./pages/NotFound";

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
              <Route path="admin/employees" element={<EmployeeManagement />} />
              <Route path="admin/pay-rates" element={<PayRateManagement />} />
              <Route path="admin/attendance" element={<AdminAttendance />} />
              <Route path="admin/payroll" element={<Payroll />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
