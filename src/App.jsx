import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customer/:customerId" element={<CustomerDetails />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/mosquito-mesh-doors" element={<MosquitoMeshDoors />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/qr-codes" element={<QRCodes />} />
          <Route path="/passwords" element={<Passwords />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
