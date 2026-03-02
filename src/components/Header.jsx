import { Search, Bell, Sun, Maximize2, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

export default function Header({ onMenuToggle }) {
  const { currentUser, staffData, isAdmin } = useAuth();

  const displayName = isAdmin
    ? (staffData?.name || 'SLA Admin')
    : (staffData?.name || currentUser?.email || 'Staff');

  const displayRole = isAdmin
    ? 'Administrator'
    : (staffData?.role || 'Staff');

  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="header">
      {/* Left Section */}
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuToggle}>
          <Menu size={20} />
        </button>

        <div className="header-search">
          <Search className="header-search-icon" />
          <input type="text" placeholder="Search anything..." />
          <div className="header-search-shortcut">
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="header-right">
        <button className="header-icon-btn" title="Toggle Theme">
          <Sun size={20} />
        </button>

        <button className="header-icon-btn" title="Fullscreen">
          <Maximize2 size={18} />
        </button>

        <button className="header-icon-btn" title="Notifications">
          <Bell size={20} />
          <span className="badge-dot"></span>
        </button>

        <div className="header-divider" />

        {/* User Profile */}
        <div className="header-user">
          <div className="header-user-avatar">{initials}</div>
          <div className="header-user-info">
            <span className="header-user-name">{displayName}</span>
            <span className="header-user-role">{displayRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
