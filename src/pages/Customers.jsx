import { UserCheck, Plus, Download } from 'lucide-react';

export default function Customers() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your customer database</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <UserCheck size={36} />
        </div>
        <h3>No customers yet</h3>
        <p>Your customer list will appear here once you start adding customers to the system.</p>
      </div>
    </div>
  );
}
