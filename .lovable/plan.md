

# My City Radius — Employee Attendance System

## Branding & Design Theme
- **Logo**: The uploaded My City Radius logo will be used in the sidebar and login page
- **Color scheme**: Teal/green primary, orange accents, matching the logo palette
- **Style**: Futuristic, clean UI with glassmorphism effects, smooth animations, and modern data visualizations
- **Responsive**: Fully mobile-friendly with collapsible sidebar

---

## 1. Authentication Page
- Unified login/signup page for all users (admin & employees)
- Email & password authentication via Supabase Auth
- The **first user** to sign up is automatically assigned the **admin** role
- Subsequent users sign up as unassigned (admin assigns their role later)
- Branded with the My City Radius logo and futuristic styling
- Password reset flow included

## 2. Role System
- Roles: **Admin**, **Caregiver**, **IT Support**, **Driver**, **Manager**
- Stored in a separate `user_roles` table (security best practice)
- Admin can assign/change roles for any employee from the admin dashboard
- Role-based access controls throughout the app

## 3. Employee Dashboard
- **Sidebar navigation** with toggle button (collapsible), showing logo, user info, and navigation links
- **Home/Overview**: Welcome message, today's status (clocked in/out), current timer, weekly hours summary
- **Check-In Module**:
  - One check-in per day allowed
  - After check-in: live timer showing duration at work
  - Pause button (for appointments) and Resume button
  - Checkout button to end the work day
  - System automatically calculates net working hours (excluding paused time)
- **Attendance History**: Table showing daily attendance records — date, check-in time, check-out time, pauses, total hours — filtered to the logged-in user
- **Pay & Hours Summary**: Shows the employee's hourly pay rate (set by admin), hours worked so far in the current biweekly period (Mon–Fri, 8 AM–5 PM schedule), and estimated pay

## 4. Admin Dashboard
- **Employee Management**: View all employees, assign/change roles, activate/deactivate accounts
- **Pay Rate Management**: Default hourly rate per role, with ability to override per individual employee
- **Attendance Overview**: View all employees' check-in/out records, filter by date range and employee
- **Payroll Reports**: Biweekly summary showing each employee's total hours and calculated pay, with the ability to view breakdowns

## 5. Backend (Supabase / Lovable Cloud)
- **Database tables**: profiles, user_roles, attendance_records (with check-in, check-out, pause/resume timestamps), pay_rates
- **Row-Level Security**: Employees see only their own records; admins see all
- **Auto-profile creation**: Trigger to create profile on signup and auto-assign admin role to first user

## 6. Data Visualization
- Charts showing weekly/biweekly hours worked
- Attendance trends and summaries on both employee and admin dashboards
- Modern card-based layout with progress indicators

