import { CalendarCheck, Plus, Download } from 'lucide-react';

export default function Appointments() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Schedule and manage customer appointments</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Schedule Appointment
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <CalendarCheck size={36} />
        </div>
        <h3>No appointments scheduled</h3>
        <p>Schedule appointments with your customers for site visits, installations, and consultations.</p>
      </div>
    </div>
  );
}
