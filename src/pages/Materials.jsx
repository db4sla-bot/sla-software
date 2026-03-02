import { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  X,
  Save,
  Settings,
  Grid,
  Trash2,
  Shield,
  Calendar,
  Pencil,
} from "lucide-react";
import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import "../CSS/Materials.css";

const TABS = [
  {
    key: "invisible_grills",
    label: "Invisible Grills",
    icon: Shield,
    color: "#6c5ce7",
  },
  {
    key: "mosquito_mesh",
    label: "Mosquito Mesh",
    icon: Grid,
    color: "#00b894",
  },
  {
    key: "cloth_hangers",
    label: "Cloth Hangers",
    icon: Package,
    color: "#0984e3",
  },
];

const COLLECTIONS = {
  invisible_grills: "invisibleGrillsMaterials",
  mosquito_mesh: "mosquitoMeshMaterials",
  cloth_hangers: "clothHangerMaterials",
};

const INITIAL_FORM = {
  materialName: "",
  materialId: "",
  inventoryOld: "",
  newInventoryCount: "",
};

export default function Materials() {
  const [activeTab, setActiveTab] = useState("invisible_grills");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [editingItem, setEditingItem] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchMaterials();
    setSearchTerm("");
  }, [activeTab]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const colName = COLLECTIONS[activeTab];
      const q = query(
        collection(db, colName),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      setMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      materialName: item.materialName || "",
      materialId: item.materialId || "",
      inventoryOld: item.inventoryOld || "",
      newInventoryCount: item.newInventoryCount || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!form.materialName?.trim()) {
      showToast("Enter Material Name", "error");
      return;
    }
    if (!form.materialId?.trim()) {
      showToast("Enter Material ID", "error");
      return;
    }

    try {
      setSaving(true);
      const data = {
        materialName: form.materialName.trim(),
        materialId: form.materialId.trim(),
        inventoryOld: form.inventoryOld ? Number(form.inventoryOld) : 0,
        newInventoryCount: form.newInventoryCount
          ? Number(form.newInventoryCount)
          : 0,
      };

      const colName = COLLECTIONS[activeTab];

      if (editingItem) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, colName, editingItem.id), data);
        showToast("Material updated!");
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, colName), data);
        showToast("Material added!");
      }
      
      closeModal();
      fetchMaterials();
    } catch (err) {
      console.error(err);
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?"))
      return;
    try {
      const colName = COLLECTIONS[activeTab];
      await deleteDoc(doc(db, colName, id));
      showToast("Material deleted!");
      fetchMaterials();
    } catch (err) {
      showToast("Failed to delete", "error");
    }
  };

  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    const t = searchTerm.toLowerCase();
    return materials.filter(
      (m) =>
        m.materialName?.toLowerCase().includes(t) ||
        m.materialId?.toLowerCase().includes(t),
    );
  }, [materials, searchTerm]);

  const activeTabConfig = TABS.find((t) => t.key === activeTab);

  return (
    <div className="page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Materials</h1>
          <p className="page-subtitle">
            Track your inventory and materials stock
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Material
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mat-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`mat-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.key && (
              <span className="mat-tab-count">{materials.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mat-table-card">
        <div className="mat-table-header">
          <h3>
            {activeTabConfig?.label} Materials ({filteredMaterials.length})
          </h3>
          <div className="mat-table-filters">
            <div className="mat-search">
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mat-table-wrap">
          <table className="mat-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Material Name</th>
                <th>Material ID (Short Code)</th>
                <th>Old Inventory</th>
                <th>New Inventory</th>
                <th>Total Inventory</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="mat-empty-row">
                  <td colSpan={7}>
                    <div className="mat-empty-content">
                      <div
                        className="spinner"
                        style={{
                          borderColor: "var(--border-color)",
                          borderTopColor: "var(--primary)",
                          width: 28,
                          height: 28,
                        }}
                      />
                      <p>Loading materials...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr className="mat-empty-row">
                  <td colSpan={7}>
                    <div className="mat-empty-content">
                      <activeTabConfig.icon size={40} />
                      <h4>No materials found</h4>
                      <p>
                        Click "Add Material" to create your first inventory
                        item
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((item, idx) => (
                  <tr key={item.id}>
                    <td
                      style={{ color: "var(--text-muted)", fontWeight: 600 }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.materialName || "—"}
                    </td>
                    <td>
                      <span
                        style={{
                          background: "var(--content-bg)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                        }}
                      >
                        {item.materialId || "—"}
                      </span>
                    </td>
                    <td>{item.inventoryOld || 0}</td>
                    <td>{item.newInventoryCount || 0}</td>
                    <td style={{ fontWeight: "bold" }}>
                      {(item.inventoryOld || 0) +
                        (item.newInventoryCount || 0)}
                    </td>
                    <td>
                      <div className="mat-actions">
                        <button
                          className="mat-action-btn edit-btn"
                          title="Edit"
                          onClick={() => openEditModal(item)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="mat-action-btn delete-btn"
                          title="Delete"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== ADD/EDIT MODAL ========== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 450 }}
          >
            <div className="modal-header">
              <h2>
                {editingItem ? <Pencil size={20} /> : <Plus size={20} />} 
                {editingItem ? "Edit Material" : "Add Material"}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">
                    Material Name <span className="required">*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="Enter material name (e.g. Hooks)"
                    value={form.materialName}
                    onChange={(e) =>
                      handleChange("materialName", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">
                    Material ID (Short Code) <span className="required">*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="Enter ID/Short Code (e.g. HK-01)"
                    value={form.materialId}
                    onChange={(e) => handleChange("materialId", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Inventory (Old)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0"
                    value={form.inventoryOld}
                    onChange={(e) =>
                      handleChange("inventoryOld", e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Inventory Count (New)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0"
                    value={form.newInventoryCount}
                    onChange={(e) =>
                      handleChange("newInventoryCount", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="spinner" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> {editingItem ? "Update Material" : "Save Material"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

