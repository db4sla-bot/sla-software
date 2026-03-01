import { FileText, Plus, Download } from 'lucide-react';

export default function Invoices() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Create and manage your customer invoices</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Create Invoice
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <FileText size={36} />
        </div>
        <h3>No invoices created</h3>
        <p>Create invoices for your customers and track payments effortlessly.</p>
      </div>
    </div>
  );
}
