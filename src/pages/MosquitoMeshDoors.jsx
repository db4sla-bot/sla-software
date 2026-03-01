import { DoorOpen, Plus, Download } from 'lucide-react';

export default function MosquitoMeshDoors() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Mosquito Mesh Doors</h1>
          <p className="page-subtitle">Manage mosquito mesh door orders and installations</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Order
          </button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">
          <DoorOpen size={36} />
        </div>
        <h3>No mosquito mesh door records</h3>
        <p>Add and manage your mosquito mesh door orders, installations, and tracking here.</p>
      </div>
    </div>
  );
}
