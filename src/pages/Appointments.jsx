import { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck, Plus, Search, X, Save, Check,
  Pencil, Trash2, AlertTriangle, Eye, Clock,
  Users, Briefcase, Building2, ChevronLeft, ChevronRight,
  Phone, MapPin, MessageSquare
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import '../css/Appointments.css';

const ITEMS_PER_PAGE = 32;

const TABS = [
  { key: 'customer', label: 'Customer Appointments', icon: Users, color: '#6c5ce7' },
  { key: 'business', label: 'Business Appointments', icon: Briefcase, color: '#00b894' },
  { key: 'internal', label: 'Internal Appointments', icon: Building2, color: '#0984e3' },
];

const COLLECTIONS = {
  customer: 'customerAppointments',
  business: 'businessAppointments',
  internal: 'internalAppointments',
};

const INITIAL_FORMS = {
  customer: { customerName: '', phoneNumber: '', address: '', date: '', time: '', reason: '', resultComments: '' },
  business: { businessPartnerName: '', phoneNumber: '', address: '', date: '', time: '', reason: '', resultComments: '' },
  internal: { meetingWithName: '', mobileNumber: '', date: '', time: '', reason: '', resultComments: '' },
};

const AVATAR_COLORS = ['#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fdcb6e', '#00cec9', '#a29bfe', '#fd79a8'];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Appointments() {
  const [activeTab, setActiveTab] = useState('customer');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORMS.customer });
  const [saving, setSaving] = useState(false);

  // View Details Modal
  const [viewItem, setViewItem] = useState(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  /* ---- Fetch ---- */
  useEffect(() => {
    fetchAppointments();
    setCurrentPage(1);
    setSearchTerm('');
  }, [activeTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const colName = COLLECTIONS[activeTab];
      const q = query(collection(db, colName), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Helpers ---- */
  const getNameField = (tab = activeTab) => {
    if (tab === 'customer') return 'customerName';
    if (tab === 'business') return 'businessPartnerName';
    return 'meetingWithName';
  };

  const getPhoneField = (tab = activeTab) => {
    if (tab === 'internal') return 'mobileNumber';
    return 'phoneNumber';
  };

  const getNameLabel = () => {
    if (activeTab === 'customer') return 'Customer Name';
    if (activeTab === 'business') return 'Business Partner Name';
    return 'Meeting With (Name)';
  };

  const getPhoneLabel = () => {
    if (activeTab === 'internal') return 'Mobile Number';
    return 'Phone Number';
  };

  /* ---- Form ---- */
  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ ...INITIAL_FORMS[activeTab] });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    const initial = { ...INITIAL_FORMS[activeTab] };
    Object.keys(initial).forEach(key => {
      initial[key] = item[key] || '';
    });
    setForm(initial);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  /* ---- Save ---- */
  const handleSave = async () => {
    const nameField = getNameField();
    if (!form[nameField]?.trim()) { showToast(`Enter ${getNameLabel()}`, 'error'); return; }
    if (!form.date) { showToast('Select a date', 'error'); return; }
    if (!form.time) { showToast('Select a time', 'error'); return; }

    try {
      setSaving(true);
      const data = {};
      Object.keys(form).forEach(key => {
        data[key] = typeof form[key] === 'string' ? form[key].trim() : form[key];
      });

      const colName = COLLECTIONS[activeTab];

      if (editingItem) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, colName, editingItem.id), data);
        showToast('Appointment updated!');
      } else {
        data.createdAt = serverTimestamp();
        data.status = 'pending';
        await addDoc(collection(db, colName), data);
        showToast('Appointment added!');
      }
      closeModal();
      fetchAppointments();
    } catch (err) {
      console.error(err);
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      const colName = COLLECTIONS[activeTab];
      await deleteDoc(doc(db, colName, id));
      showToast('Appointment deleted!');
      setDeleteConfirm(null);
      fetchAppointments();
    } catch (err) {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Filter & Pagination ---- */
  const filtered = useMemo(() => {
    if (!searchTerm) return appointments;
    const t = searchTerm.toLowerCase();
    const nameField = getNameField();
    const phoneField = getPhoneField();
    return appointments.filter(a =>
      a[nameField]?.toLowerCase().includes(t) ||
      a[phoneField]?.toLowerCase().includes(t) ||
      a.reason?.toLowerCase().includes(t) ||
      a.address?.toLowerCase().includes(t)
    );
  }, [appointments, searchTerm, activeTab]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  /* ---- Pagination helpers ---- */
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  /* ---- Tab counts ---- */
  const tabCounts = { customer: 0, business: 0, internal: 0 };
  if (activeTab === 'customer') tabCounts.customer = appointments.length;
  if (activeTab === 'business') tabCounts.business = appointments.length;
  if (activeTab === 'internal') tabCounts.internal = appointments.length;

  const currentTabConfig = TABS.find(t => t.key === activeTab);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Schedule and manage all types of appointments</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Appointment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="appt-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`appt-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.key && (
              <span className="appt-tab-count">{appointments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="appt-stats-bar">
        <div className="appt-stat-card">
          <div className="appt-stat-icon" style={{ background: `${currentTabConfig.color}15`, color: currentTabConfig.color }}>
            <CalendarCheck size={22} />
          </div>
          <div className="appt-stat-info">
            <h4>{appointments.length}</h4>
            <p>Total {currentTabConfig.label}</p>
          </div>
        </div>
        <div className="appt-stat-card">
          <div className="appt-stat-icon" style={{ background: 'rgba(253, 203, 110, 0.12)', color: '#e67e22' }}>
            <Clock size={22} />
          </div>
          <div className="appt-stat-info">
            <h4>{appointments.filter(a => a.status === 'pending').length}</h4>
            <p>Pending</p>
          </div>
        </div>
        <div className="appt-stat-card">
          <div className="appt-stat-icon" style={{ background: 'rgba(0, 184, 148, 0.12)', color: '#00b894' }}>
            <Check size={22} />
          </div>
          <div className="appt-stat-info">
            <h4>{appointments.filter(a => a.status === 'completed').length}</h4>
            <p>Completed</p>
          </div>
        </div>
        <div className="appt-stat-card">
          <div className="appt-stat-icon" style={{ background: 'rgba(116, 185, 255, 0.12)', color: '#0984e3' }}>
            <Search size={22} />
          </div>
          <div className="appt-stat-info">
            <h4>{filtered.length}</h4>
            <p>Showing Results</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="appt-table-card">
        <div className="appt-table-header">
          <h3>{currentTabConfig.label} ({filtered.length})</h3>
          <div className="appt-search">
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="appt-table-wrap">
          <table className="appt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{activeTab === 'customer' ? 'Customer' : activeTab === 'business' ? 'Business Partner' : 'Meeting With'}</th>
                {activeTab !== 'internal' && <th>Address</th>}
                <th>Date & Time</th>
                <th>Reason</th>
                <th>Result / Comments</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="appt-empty-row">
                  <td colSpan={activeTab !== 'internal' ? 8 : 7}>
                    <div className="appt-empty-content">
                      <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 28, height: 28 }} />
                      <p>Loading appointments...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr className="appt-empty-row">
                  <td colSpan={activeTab !== 'internal' ? 8 : 7}>
                    <div className="appt-empty-content">
                      <CalendarCheck size={40} />
                      <h4>{searchTerm ? 'No matching appointments' : 'No appointments yet'}</h4>
                      <p>{searchTerm ? 'Try adjusting your search' : 'Click "Add Appointment" to schedule your first one'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const name = item[getNameField()];
                  const phone = item[getPhoneField()];
                  const serialNum = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{serialNum}</td>
                      <td>
                        <div className="appt-name-cell">
                          <div className="appt-name-avatar" style={{ background: getAvatarColor(name) }}>
                            {getInitials(name)}
                          </div>
                          <div>
                            <div className="appt-name-text">{name || '—'}</div>
                            {phone && <div className="appt-name-phone"><Phone size={11} /> {phone}</div>}
                          </div>
                        </div>
                      </td>
                      {activeTab !== 'internal' && (
                        <td>
                          {item.address ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={13} />{item.address}
                            </span>
                          ) : '—'}
                        </td>
                      )}
                      <td>
                        <div className="appt-datetime">
                          <span className="appt-date">{formatDisplayDate(item.date)}</span>
                          <span className="appt-time"><Clock size={11} /> {formatDisplayTime(item.time)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="appt-reason" title={item.reason}>{item.reason || '—'}</span>
                      </td>
                      <td>
                        <span className="appt-result" title={item.resultComments}>{item.resultComments || '—'}</span>
                      </td>
                      <td>
                        <span className={`appt-status ${item.status || 'pending'}`}>
                          {item.status || 'pending'}
                        </span>
                      </td>
                      <td>
                        <div className="appt-actions">
                          <button className="appt-action-btn view-btn" title="View" onClick={() => setViewItem(item)}>
                            <Eye size={15} />
                          </button>
                          <button className="appt-action-btn edit-btn" title="Edit" onClick={() => openEditModal(item)}>
                            <Pencil size={15} />
                          </button>
                          <button className="appt-action-btn delete-btn" title="Delete" onClick={() => setDeleteConfirm(item)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="appt-pagination">
            <span className="appt-pagination-info">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="appt-pagination-controls">
              <button
                className="appt-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((page, i) =>
                page === '...' ? (
                  <span key={`e-${i}`} className="appt-page-ellipsis">…</span>
                ) : (
                  <button
                    key={page}
                    className={`appt-page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                className="appt-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== ADD/EDIT MODAL ========== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>
                {editingItem ? <Pencil size={20} /> : <Plus size={20} />}
                {editingItem ? 'Edit Appointment' : 'Add Appointment'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">
                {activeTab === 'customer' ? 'Customer Details' : activeTab === 'business' ? 'Business Partner Details' : 'Meeting Details'}
              </div>

              {/* Name Field */}
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">{getNameLabel()} <span className="required">*</span></label>
                  <input
                    className="form-input"
                    placeholder={`Enter ${getNameLabel().toLowerCase()}`}
                    value={form[getNameField()]}
                    onChange={e => handleChange(getNameField(), e.target.value)}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">{getPhoneLabel()}</label>
                  <input
                    className="form-input"
                    placeholder={`Enter ${getPhoneLabel().toLowerCase()}`}
                    value={form[getPhoneField()]}
                    onChange={e => handleChange(getPhoneField(), e.target.value)}
                  />
                </div>
              </div>

              {/* Address — only for customer & business */}
              {activeTab !== 'internal' && (
                <div className="form-row single">
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input
                      className="form-input"
                      placeholder="Enter address"
                      value={form.address}
                      onChange={e => handleChange('address', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-section-title">Schedule</div>

              {/* Date & Time */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date <span className="required">*</span></label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.date}
                    onChange={e => handleChange('date', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time <span className="required">*</span></label>
                  <input
                    className="form-input"
                    type="time"
                    value={form.time}
                    onChange={e => handleChange('time', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-section-title">Purpose</div>

              {/* Reason */}
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Enter the reason for this appointment"
                    value={form.reason}
                    onChange={e => handleChange('reason', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Result Comments */}
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Result / Comments</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Enter result or comments"
                    value={form.resultComments}
                    onChange={e => handleChange('resultComments', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingItem ? 'Update' : 'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== VIEW DETAILS MODAL ========== */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2><Eye size={20} /> Appointment Details</h2>
              <button className="modal-close-btn" onClick={() => setViewItem(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="appt-detail-grid">
                <div className="appt-detail-item">
                  <span className="appt-detail-label">{getNameLabel()}</span>
                  <span className="appt-detail-value">{viewItem[getNameField()] || '—'}</span>
                </div>
                <div className="appt-detail-item">
                  <span className="appt-detail-label">{getPhoneLabel()}</span>
                  <span className="appt-detail-value">{viewItem[getPhoneField()] || '—'}</span>
                </div>
                {activeTab !== 'internal' && (
                  <div className="appt-detail-item full-width">
                    <span className="appt-detail-label">Address</span>
                    <span className="appt-detail-value">{viewItem.address || '—'}</span>
                  </div>
                )}
                <div className="appt-detail-item">
                  <span className="appt-detail-label">Date</span>
                  <span className="appt-detail-value">{formatDisplayDate(viewItem.date)}</span>
                </div>
                <div className="appt-detail-item">
                  <span className="appt-detail-label">Time</span>
                  <span className="appt-detail-value">{formatDisplayTime(viewItem.time)}</span>
                </div>
                <div className="appt-detail-item full-width">
                  <span className="appt-detail-label">Reason</span>
                  <span className="appt-detail-value">{viewItem.reason || '—'}</span>
                </div>
                <div className="appt-detail-item full-width">
                  <span className="appt-detail-label">Result / Comments</span>
                  <span className="appt-detail-value">{viewItem.resultComments || '—'}</span>
                </div>
                <div className="appt-detail-item">
                  <span className="appt-detail-label">Status</span>
                  <span className={`appt-status ${viewItem.status || 'pending'}`}>{viewItem.status || 'pending'}</span>
                </div>
                <div className="appt-detail-item">
                  <span className="appt-detail-label">Created</span>
                  <span className="appt-detail-value">{formatDate(viewItem.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setViewItem(null)}>Close</button>
              <button className="btn-save" onClick={() => { setViewItem(null); openEditModal(viewItem); }}>
                <Pencil size={16} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== DELETE CONFIRM ========== */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon"><AlertTriangle size={32} /></div>
            <h3>Delete Appointment</h3>
            <p>
              Are you sure you want to delete the appointment for{' '}
              <strong>{deleteConfirm[getNameField()]}</strong>? This cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-delete" onClick={() => handleDelete(deleteConfirm.id)} disabled={deleting}>
                {deleting ? <><div className="spinner" /> Deleting...</> : <><Trash2 size={16} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}{toast.message}
        </div>
      )}
    </div>
  );
}
