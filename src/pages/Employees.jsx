import { BadgeCheck, Plus, Download } from 'lucide-react';

export default function Employees() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your team members and their roles</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <BadgeCheck size={36} />
        </div>
        <h3>No employees added</h3>
        <p>Add your team members to manage assignments, attendance, and payroll.</p>
      </div>
    </div>
  );
}
