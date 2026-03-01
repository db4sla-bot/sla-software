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
} from "lucide-react";
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
            <span className="sidebar-brand-label">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            {mainNavItems.map(renderNavItem)}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Finance</div>
            {financeNavItems.map(renderNavItem)}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Management</div>
            {managementNavItems.map(renderNavItem)}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Tools</div>
            {toolsNavItems.map(renderNavItem)}
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={`nav-item ${location.pathname === "/settings" ? "active" : ""}`}
            onClick={onClose}
          >
            <Settings className="nav-item-icon" />
            <span className="nav-item-text">Settings</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
