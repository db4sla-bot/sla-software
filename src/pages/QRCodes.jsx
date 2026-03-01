import { QrCode, Plus, Download } from 'lucide-react';

export default function QRCodes() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">QR Codes</h1>
          <p className="page-subtitle">Generate and manage QR codes for your business</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Generate QR Code
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <QrCode size={36} />
        </div>
        <h3>No QR codes generated</h3>
        <p>Generate QR codes for payments, product tracking, or marketing purposes.</p>
      </div>
    </div>
  );
}
