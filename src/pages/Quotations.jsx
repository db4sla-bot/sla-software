import { ClipboardList, Plus, Download } from 'lucide-react';

export default function Quotations() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">Create and send quotations to your customers</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Create Quotation
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <ClipboardList size={36} />
        </div>
        <h3>No quotations yet</h3>
        <p>Create professional quotations for your customers and convert them into orders.</p>
      </div>
    </div>
  );
}
