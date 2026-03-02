import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  DoorOpen,
  Receipt,
  FileText,
  ClipboardList,
  CalendarCheck,
  BadgeCheck,
  QrCode,
  KeyRound,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./Sidebar.css";

const mainNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Users, badge: null },
  { path: "/customers", label: "Customers", icon: UserCheck },
  { path: "/materials", label: "Materials", icon: Package },
  {
    path: "/mosquito-mesh-doors",
    label: "Mosquito Mesh Doors",
    icon: DoorOpen,
  },
];

const financeNavItems = [
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/invoices", label: "Invoices", icon: FileText },
  { path: "/quotations", label: "Quotations", icon: ClipboardList },
];

const managementNavItems = [
  { path: "/appointments", label: "Appointments", icon: CalendarCheck },
  { path: "/employees", label: "Employees", icon: BadgeCheck },
];

const toolsNavItems = [
  { path: "/qr-codes", label: "QR Codes", icon: QrCode },
  { path: "/passwords", label: "Passwords", icon: KeyRound },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { hasAccess, currentUser, logout, isAdmin, staffData } = useAuth();

  const filterItems = (items) => {
    return items.filter(item => {
      // Dashboard is admin-only, all other items check access
      if (item.path === '/') return isAdmin;
      return hasAccess(item.path);
    });
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={`nav-item ${isActive ? "active" : ""}`}
        onClick={onClose}
      >
        <Icon className="nav-item-icon" />
        <span className="nav-item-text">{item.label}</span>
        {item.badge && <span className="nav-item-badge">{item.badge}</span>}
      </NavLink>
    );
  };

  const filteredMain = filterItems(mainNavItems);
  const filteredFinance = filterItems(financeNavItems);
  const filteredManagement = filterItems(managementNavItems);
  const filteredTools = filterItems(toolsNavItems);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Shield />
          </div>
          <div className="sidebar-brand-info">
            <span className="sidebar-brand-name">SLA Invisible Grills</span>
            <span className="sidebar-brand-label">
              {isAdmin ? 'Admin Panel' : (staffData?.role || 'Staff Panel')}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredMain.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              {filteredMain.map(renderNavItem)}
            </div>
          )}

          {filteredFinance.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">Finance</div>
              {filteredFinance.map(renderNavItem)}
            </div>
          )}

          {filteredManagement.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">Management</div>
              {filteredManagement.map(renderNavItem)}
            </div>
          )}

          {filteredTools.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">Tools</div>
              {filteredTools.map(renderNavItem)}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {currentUser && (
            <button
              className="nav-item"
              onClick={handleLogout}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
            >
              <LogOut className="nav-item-icon" />
              <span className="nav-item-text">Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
