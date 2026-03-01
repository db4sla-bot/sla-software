import { Search, Bell, Sun, Maximize2, Menu } from 'lucide-react';
import './Header.css';

export default function Header({ onMenuToggle }) {
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
          <div className="header-user-avatar">SL</div>
          <div className="header-user-info">
            <span className="header-user-name">SLA Admin</span>
            <span className="header-user-role">Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
