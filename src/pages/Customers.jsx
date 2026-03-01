import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Download, Search, X, Save, Check,
  Phone, MapPin, User, Pencil, Trash2, Eye,
  AlertTriangle, CalendarClock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import '../css/Customers.css';

const ITEMS_PER_PAGE = 32;

const INITIAL_FORM = {
  customerName: '',
  mobileNumber: '',
  address: '',
};

/* =============================
   CUSTOMERS PAGE
   ============================= */
export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);



  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  /* ---- Fetch ---- */
  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setCustomers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---- Toast ---- */
  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Form ---- */
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ---- Open Modals ---- */
  const openAddModal = () => {
    setEditingCustomer(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setForm({
      customerName: customer.customerName || '',
      mobileNumber: customer.mobileNumber || '',
      address: customer.address || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!form.customerName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }
    if (!form.mobileNumber.trim()) {
      showToast('Please enter mobile number', 'error');
      return;
    }

    try {
      setSaving(true);
      const data = {
        customerName: form.customerName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        address: form.address.trim(),
      };

      if (editingCustomer) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'customers', editingCustomer.id), data);
        showToast('Customer updated successfully!');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'customers'), data);
        showToast('Customer added successfully!');
      }

      closeModal();
      fetchCustomers();
    } catch (err) {
      console.error('Error saving customer:', err);
      showToast('Failed to save customer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'customers', id));
      showToast('Customer deleted successfully!');
      setDeleteConfirm(null);
      fetchCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Failed to delete customer.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Filtered & Paginated ---- */
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const t = searchTerm.toLowerCase();
    return customers.filter((c) =>
      c.customerName?.toLowerCase().includes(t) ||
      c.mobileNumber?.includes(t) ||
      c.address?.toLowerCase().includes(t)
    );
  }, [customers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  /* ==================
     RENDER
     ================== */
  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your customer database</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="customers-stats-bar">
        <div className="customers-stat-card">
          <div className="customers-stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}>
            <Users size={22} />
          </div>
          <div className="customers-stat-info">
            <h4>{customers.length}</h4>
            <p>Total Customers</p>
          </div>
        </div>
        <div className="customers-stat-card">
          <div className="customers-stat-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}>
            <User size={22} />
          </div>
          <div className="customers-stat-info">
            <h4>{filteredCustomers.length}</h4>
            <p>Showing Results</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="customers-table-card">
        <div className="customers-table-header">
          <h3>All Customers ({filteredCustomers.length})</h3>
          <div className="customers-search">
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Address</th>
                <th>Added On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="customers-empty-row">
                  <td colSpan="6">
                    <div className="customers-empty-content">
                      <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: '28px', height: '28px' }} />
                      <p>Loading customers...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr className="customers-empty-row">
                  <td colSpan="6">
                    <div className="customers-empty-content">
                      <Users size={40} />
                      <h4>{searchTerm ? 'No matching customers found' : 'No customers yet'}</h4>
                      <p>{searchTerm ? 'Try adjusting your search' : 'Click "Add Customer" to add your first customer'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust, idx) => (
                  <tr key={cust.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </td>
                    <td>
                      <span className="customer-name">{cust.customerName}</span>
                    </td>
                    <td>
                      <span className="customer-phone">
                        <Phone size={13} /> {cust.mobileNumber}
                      </span>
                    </td>
                    <td>
                      <span className="customer-address" title={cust.address}>
                        {cust.address || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="customer-date">
                        <CalendarClock size={13} />
                        {formatDate(cust.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="customer-actions">
                        <button
                          className="customer-action-btn view-btn"
                          title="View"
                          onClick={() => navigate(`/customer/${cust.id}`)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="customer-action-btn edit-btn"
                          title="Edit"
                          onClick={() => openEditModal(cust)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="customer-action-btn delete-btn"
                          title="Delete"
                          onClick={() => setDeleteConfirm(cust)}
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

        {/* Pagination */}
        {filteredCustomers.length > ITEMS_PER_PAGE && (
          <div className="customers-pagination">
            <div className="customers-pagination-info">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of {filteredCustomers.length} customers
            </div>
            <div className="customers-pagination-controls">
              <button className="cpag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                <ChevronsLeft size={16} />
              </button>
              <button className="cpag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="cpag-dots">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`cpag-btn page-num ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              <button className="cpag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight size={16} />
              </button>
              <button className="cpag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============ ADD / EDIT CUSTOMER MODAL ============ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingCustomer ? <Pencil size={20} /> : <Plus size={20} />}
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-section-title">Customer Information</div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">
                    Customer Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter customer name"
                    value={form.customerName}
                    onChange={(e) => handleChange('customerName', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">
                    Mobile Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Enter mobile number"
                    value={form.mobileNumber}
                    onChange={(e) => handleChange('mobileNumber', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Enter address"
                    rows={3}
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><div className="spinner" /> Saving...</>
                ) : (
                  <><Save size={16} /> {editingCustomer ? 'Update Customer' : 'Save Customer'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ============ DELETE CONFIRMATION ============ */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Delete Customer</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.customerName}</strong>?
              This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-delete" onClick={() => handleDelete(deleteConfirm.id)} disabled={deleting}>
                {deleting ? (
                  <><div className="spinner" /> Deleting...</>
                ) : (
                  <><Trash2 size={16} /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
