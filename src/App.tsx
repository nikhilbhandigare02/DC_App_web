import { Navigate, Route, Routes } from 'react-router-dom';
import { AppointmentsPage } from './features/appointments/AppointmentsPage';
import { ClientInformationPage } from './features/appointments/ClientInformationPage';
import { FacilityPage } from './features/facility/FacilityPage';
import { UploadReportPage } from './features/upload-report/UploadReportPage';
import { ViewReportsPage } from './features/view-reports/ViewReportsPage';
import { ReportDocumentsPage } from './features/view-reports/ReportDocumentsPage';
import { HomeLayout } from './routes/HomeLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Dashboard } from './routes/pages/Dashboard';
import { Profile } from './routes/pages/Profile';
import { Splash } from './routes/pages/Splash';
import { Login } from './routes/pages/Login';
import { ForgotPassword } from './routes/pages/ForgotPassword';
import { FirstLoginPassword } from './routes/pages/FirstLoginPassword';
import { SetNewPassword } from './routes/pages/SetNewPassword';
import { ChangePassword } from './routes/pages/ChangePassword';
import { ToastContainer } from './components/ui/Toast';

function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Splash />} />

        {/* Auth flow — built by this agent. */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/first-login-password" element={<FirstLoginPassword />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />

        {/* Protected /home/* subtree. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomeLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="appointments/:appointmentId/client-info" element={<ClientInformationPage />} />
            <Route path="upload-report" element={<UploadReportPage />} />
            <Route path="view-reports" element={<ViewReportsPage />} />
            <Route path="view-reports/documents" element={<ReportDocumentsPage />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="facility" element={<FacilityPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
