import { KeyRound, Plus, Download } from 'lucide-react';

export default function Passwords() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Passwords</h1>
          <p className="page-subtitle">Securely store and manage your passwords</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Password
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <KeyRound size={36} />
        </div>
        <h3>No passwords saved</h3>
        <p>Securely store passwords for your business accounts, tools, and services.</p>
      </div>
    </div>
  );
}
