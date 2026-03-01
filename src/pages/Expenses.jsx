import { Receipt, Plus, Download } from 'lucide-react';

export default function Expenses() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage your business expenses</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <Receipt size={36} />
        </div>
        <h3>No expenses recorded</h3>
        <p>Start recording your business expenses to track your spending and manage budgets.</p>
      </div>
    </div>
  );
}
