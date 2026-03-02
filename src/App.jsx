import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Materials from './pages/Materials';
import MosquitoMeshDoors from './pages/MosquitoMeshDoors';
import Expenses from './pages/Expenses';
import Invoices from './pages/Invoices';
import Quotations from './pages/Quotations';
import Appointments from './pages/Appointments';
import Employees from './pages/Employees';
import QRCodes from './pages/QRCodes';
import Passwords from './pages/Passwords';

// Redirect staff to their first accessible page
function StaffRedirect() {
  const { isAdmin, getDefaultPath } = useAuth();
  if (isAdmin) return <Dashboard />;
  const defaultPath = getDefaultPath();
  if (defaultPath && defaultPath !== '/') {
    return <Navigate to={defaultPath} replace />;
  }
  // If no access at all, show AccessDenied via ProtectedRoute
  return <ProtectedRoute path="/"><Dashboard /></ProtectedRoute>;
}

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--content-bg)',
      }}>
        <div className="spinner" style={{
          width: 36, height: 36,
          borderColor: 'var(--border-color)',
          borderTopColor: 'var(--primary)',
        }} />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<StaffRedirect />} />
        <Route path="/leads" element={<ProtectedRoute path="/leads"><Leads /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute path="/customers"><Customers /></ProtectedRoute>} />
        <Route path="/customer/:customerId" element={<ProtectedRoute path="/customers"><CustomerDetails /></ProtectedRoute>} />
        <Route path="/materials" element={<ProtectedRoute path="/materials"><Materials /></ProtectedRoute>} />
        <Route path="/mosquito-mesh-doors" element={<ProtectedRoute path="/mosquito-mesh-doors"><MosquitoMeshDoors /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute path="/expenses"><Expenses /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute path="/invoices"><Invoices /></ProtectedRoute>} />
        <Route path="/quotations" element={<ProtectedRoute path="/quotations"><Quotations /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute path="/appointments"><Appointments /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute path="/employees"><Employees /></ProtectedRoute>} />
        <Route path="/qr-codes" element={<ProtectedRoute path="/qr-codes"><QRCodes /></ProtectedRoute>} />
        <Route path="/passwords" element={<ProtectedRoute path="/passwords"><Passwords /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
