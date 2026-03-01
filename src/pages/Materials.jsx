import { Package, Plus, Download } from 'lucide-react';

export default function Materials() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Materials</h1>
          <p className="page-subtitle">Track your inventory and materials stock</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Material
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <Package size={36} />
        </div>
        <h3>No materials added</h3>
        <p>Add materials to keep track of your inventory, stock levels, and material costs.</p>
      </div>
    </div>
  );
}
