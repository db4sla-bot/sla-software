import { useState, useEffect, useMemo } from 'react';
import {
  BadgeCheck, Plus, Search, X, Save, Check,
  Pencil, Trash2, AlertTriangle, Eye, EyeOff,
  Phone, MapPin, User, Shield, KeyRound, CalendarClock
} from 'lucide-react';
import { db, auth } from '../firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, setDoc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import '../css/Employees.css';

const ROLE_OPTIONS = ['Admin', 'Manager', 'Staff', 'Technician', 'Sales Executive', 'Accountant'];

const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

// All sidebar menu items except Dashboard for access control
const ACCESS_MENU_ITEMS = [
  { path: '/leads', label: 'Leads' },
  { path: '/customers', label: 'Customers' },
  { path: '/materials', label: 'Materials' },
  { path: '/mosquito-mesh-doors', label: 'Mosquito Mesh Doors' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/invoices', label: 'Invoices' },
  { path: '/quotations', label: 'Quotations' },
  { path: '/appointments', label: 'Appointments' },
  { path: '/employees', label: 'Employees' },
  { path: '/qr-codes', label: 'QR Codes' },
  { path: '/passwords', label: 'Passwords' },
];

const INITIAL_FORM = {
  employeeId: '',
  role: '',
  name: '',
  mobileNumber: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  username: '',
  password: '',
  access: [],
  dateOfBirth: '',
  maritalStatus: '',
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

function generateEmployeeId() {
  let id = '';
  for (let i = 0; i < 8; i++) id += Math.floor(Math.random() * 10);
  return id;
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // View Details
  const [viewItem, setViewItem] = useState(null);
  const [viewShowPassword, setViewShowPassword] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  /* ---- Fetch ---- */
  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Form ---- */
  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleAccess = (path) => {
    setForm(prev => {
      const current = prev.access || [];
      if (current.includes(path)) {
        return { ...prev, access: current.filter(p => p !== path) };
      }
      return { ...prev, access: [...current, path] };
    });
  };

  const selectAllAccess = () => {
    setForm(prev => ({ ...prev, access: ACCESS_MENU_ITEMS.map(i => i.path) }));
  };

  const clearAllAccess = () => {
    setForm(prev => ({ ...prev, access: [] }));
  };

  const openAddModal = async () => {
    setEditingItem(null);
    // Generate unique employee ID
    let newId = generateEmployeeId();
    // Check if ID already exists
    const existingIds = employees.map(e => e.employeeId);
    while (existingIds.includes(newId)) {
      newId = generateEmployeeId();
    }
    setForm({ ...INITIAL_FORM, employeeId: newId });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      employeeId: item.employeeId || '',
      role: item.role || '',
      name: item.name || '',
      mobileNumber: item.mobileNumber || '',
      address: item.address || '',
      emergencyContactName: item.emergencyContactName || '',
      emergencyContactPhone: item.emergencyContactPhone || '',
      emergencyContactRelation: item.emergencyContactRelation || '',
      username: item.username || '',
      password: item.password || '',
      access: item.access || [],
      dateOfBirth: item.dateOfBirth || '',
      maritalStatus: item.maritalStatus || '',
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Enter employee name', 'error'); return; }
    if (!form.role) { showToast('Select a role', 'error'); return; }
    if (!form.username.trim()) { showToast('Enter username', 'error'); return; }
    if (!form.password.trim()) { showToast('Enter password', 'error'); return; }
    if (form.password.trim().length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    try {
      setSaving(true);
      const data = {
        employeeId: form.employeeId.trim(),
        role: form.role,
        name: form.name.trim(),
        mobileNumber: form.mobileNumber.trim(),
        address: form.address.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        emergencyContactRelation: form.emergencyContactRelation.trim(),
        username: form.username.trim(),
        password: form.password.trim(),
        access: form.access,
        dateOfBirth: form.dateOfBirth,
        maritalStatus: form.maritalStatus,
      };

      if (editingItem) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'staff', editingItem.id), data);
        showToast('Employee updated!');
      } else {
        // Create Firebase Auth user with email/password
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            form.username.trim(),
            form.password.trim()
          );
          // Save staff data with UID as document ID
          data.createdAt = serverTimestamp();
          data.uid = userCredential.user.uid;
          await setDoc(doc(db, 'staff', userCredential.user.uid), data);
          showToast('Employee added & account created!');
        } catch (authErr) {
          console.error('Auth error:', authErr);
          if (authErr.code === 'auth/email-already-in-use') {
            showToast('This username/email is already in use', 'error');
          } else if (authErr.code === 'auth/invalid-email') {
            showToast('Please enter a valid email address as username', 'error');
          } else {
            showToast(`Failed to create account: ${authErr.message}`, 'error');
          }
          return;
        }
      }
      closeModal();
      fetchEmployees();
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
      await deleteDoc(doc(db, 'staff', id));
      showToast('Employee deleted!');
      setDeleteConfirm(null);
      fetchEmployees();
    } catch (err) {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Filter ---- */
  const filtered = useMemo(() => {
    if (!searchTerm) return employees;
    const t = searchTerm.toLowerCase();
    return employees.filter(e =>
      e.name?.toLowerCase().includes(t) ||
      e.employeeId?.toLowerCase().includes(t) ||
      e.role?.toLowerCase().includes(t) ||
      e.mobileNumber?.includes(t) ||
      e.username?.toLowerCase().includes(t)
    );
  }, [employees, searchTerm]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDob = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your team members and their roles</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="emp-stats-bar">
        <div className="emp-stat-card">
          <div className="emp-stat-icon" style={{ background: 'rgba(108, 92, 231, 0.1)', color: '#6c5ce7' }}>
            <BadgeCheck size={22} />
          </div>
          <div className="emp-stat-info">
            <h4>{employees.length}</h4>
            <p>Total Employees</p>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-icon" style={{ background: 'rgba(0, 184, 148, 0.1)', color: '#00b894' }}>
            <Shield size={22} />
          </div>
          <div className="emp-stat-info">
            <h4>{employees.filter(e => e.role === 'Admin').length}</h4>
            <p>Admins</p>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-icon" style={{ background: 'rgba(116, 185, 255, 0.12)', color: '#0984e3' }}>
            <User size={22} />
          </div>
          <div className="emp-stat-info">
            <h4>{filtered.length}</h4>
            <p>Showing Results</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="emp-table-card">
        <div className="emp-table-header">
          <h3>All Employees ({filtered.length})</h3>
          <div className="emp-search">
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee ID</th>
                <th>Employee</th>
                <th>Role</th>
                <th>Mobile</th>
                <th>Username</th>
                <th>Added On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="emp-empty-row">
                  <td colSpan="8">
                    <div className="emp-empty-content">
                      <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 28, height: 28 }} />
                      <p>Loading employees...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="emp-empty-row">
                  <td colSpan="8">
                    <div className="emp-empty-content">
                      <BadgeCheck size={40} />
                      <h4>{searchTerm ? 'No matching employees' : 'No employees yet'}</h4>
                      <p>{searchTerm ? 'Try adjusting your search' : 'Click "Add Employee" to add your first team member'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <span className="emp-id-badge">{item.employeeId}</span>
                    </td>
                    <td>
                      <div className="emp-name-cell">
                        <div className="emp-name-avatar" style={{ background: getAvatarColor(item.name) }}>
                          {getInitials(item.name)}
                        </div>
                        <div>
                          <div className="emp-name-text">{item.name || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`emp-role-badge ${item.role?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.role || '—'}
                      </span>
                    </td>
                    <td>
                      {item.mobileNumber ? (
                        <span style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                          <Phone size={12} /> {item.mobileNumber}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{item.username || '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarClock size={13} />{formatDate(item.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="emp-actions">
                        <button className="emp-action-btn view-btn" title="View" onClick={() => { setViewItem(item); setViewShowPassword(false); }}>
                          <Eye size={15} />
                        </button>
                        <button className="emp-action-btn edit-btn" title="Edit" onClick={() => openEditModal(item)}>
                          <Pencil size={15} />
                        </button>
                        <button className="emp-action-btn delete-btn" title="Delete" onClick={() => setDeleteConfirm(item)}>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>
                {editingItem ? <Pencil size={20} /> : <Plus size={20} />}
                {editingItem ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">

              {/* Employee ID & Role */}
              <div className="form-section-title">Employee Info</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input className="form-input" value={form.employeeId} readOnly style={{ background: 'var(--content-bg)', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 700 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role <span className="required">*</span></label>
                  <select className="form-select" value={form.role} onChange={e => handleChange('role', e.target.value)}>
                    <option value="">Select Role</option>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Personal Details */}
              <div className="form-section-title">Personal Details</div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Name <span className="required">*</span></label>
                  <input className="form-input" placeholder="Enter full name" value={form.name} onChange={e => handleChange('name', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input className="form-input" placeholder="Enter mobile number" value={form.mobileNumber} onChange={e => handleChange('mobileNumber', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" placeholder="Enter address" value={form.address} onChange={e => handleChange('address', e.target.value)} />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="form-section-title">Emergency Contact</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-input" placeholder="Emergency contact name" value={form.emergencyContactName} onChange={e => handleChange('emergencyContactName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" placeholder="Emergency phone number" value={form.emergencyContactPhone} onChange={e => handleChange('emergencyContactPhone', e.target.value)} />
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Relation</label>
                  <input className="form-input" placeholder="e.g. Father, Mother, Spouse" value={form.emergencyContactRelation} onChange={e => handleChange('emergencyContactRelation', e.target.value)} />
                </div>
              </div>

              {/* Credentials */}
              <div className="form-section-title">Credentials</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Username (Email) <span className="required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="e.g. john@sla.com"
                    value={form.username}
                    onChange={e => handleChange('username', e.target.value)}
                    disabled={!!editingItem}
                    style={editingItem ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <div className="emp-password-field">
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={e => handleChange('password', e.target.value)}
                    />
                    <button type="button" className="emp-password-toggle" onClick={() => setShowPassword(prev => !prev)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Access Control */}
              <div className="form-section-title">
                Access Control
                <span className="emp-access-actions">
                  <button type="button" onClick={selectAllAccess}>Select All</button>
                  <button type="button" onClick={clearAllAccess}>Clear All</button>
                </span>
              </div>
              <div className="emp-access-grid">
                {ACCESS_MENU_ITEMS.map(item => (
                  <label key={item.path} className={`emp-access-item ${form.access.includes(item.path) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.access.includes(item.path)}
                      onChange={() => toggleAccess(item.path)}
                    />
                    <span className="emp-access-checkbox">
                      {form.access.includes(item.path) && <Check size={12} />}
                    </span>
                    {item.label}
                  </label>
                ))}
              </div>

              {/* Additional Info */}
              <div className="form-section-title">Additional Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => handleChange('dateOfBirth', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Marital Status</label>
                  <select className="form-select" value={form.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value)}>
                    <option value="">Select</option>
                    {MARITAL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2><Eye size={20} /> Employee Details</h2>
              <button className="modal-close-btn" onClick={() => setViewItem(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="emp-view-header">
                <div className="emp-view-avatar" style={{ background: getAvatarColor(viewItem.name) }}>
                  {getInitials(viewItem.name)}
                </div>
                <div>
                  <h3>{viewItem.name}</h3>
                  <span className={`emp-role-badge ${viewItem.role?.toLowerCase().replace(/\s+/g, '-')}`}>{viewItem.role}</span>
                </div>
              </div>

              <div className="emp-detail-grid">
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Employee ID</span>
                  <span className="emp-detail-value" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{viewItem.employeeId}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Mobile Number</span>
                  <span className="emp-detail-value">{viewItem.mobileNumber || '—'}</span>
                </div>
                <div className="emp-detail-item full-width">
                  <span className="emp-detail-label">Address</span>
                  <span className="emp-detail-value">{viewItem.address || '—'}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Emergency Contact</span>
                  <span className="emp-detail-value">{viewItem.emergencyContactName || '—'}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Emergency Phone</span>
                  <span className="emp-detail-value">{viewItem.emergencyContactPhone || '—'}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Relation</span>
                  <span className="emp-detail-value">{viewItem.emergencyContactRelation || '—'}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Username</span>
                  <span className="emp-detail-value" style={{ fontFamily: 'monospace' }}>{viewItem.username || '—'}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Password</span>
                  <span className="emp-detail-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace' }}>{viewShowPassword ? viewItem.password : '••••••••'}</span>
                    <button className="emp-password-toggle-sm" onClick={() => setViewShowPassword(p => !p)}>
                      {viewShowPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Date of Birth</span>
                  <span className="emp-detail-value">{formatDob(viewItem.dateOfBirth)}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Marital Status</span>
                  <span className="emp-detail-value">{viewItem.maritalStatus || '—'}</span>
                </div>
                <div className="emp-detail-item full-width">
                  <span className="emp-detail-label">Menu Access</span>
                  <div className="emp-access-tags">
                    {viewItem.access && viewItem.access.length > 0 ? (
                      viewItem.access.map(p => {
                        const item = ACCESS_MENU_ITEMS.find(a => a.path === p);
                        return <span key={p} className="emp-access-tag">{item?.label || p}</span>;
                      })
                    ) : (
                      <span className="emp-detail-value">No access assigned</span>
                    )}
                  </div>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Created</span>
                  <span className="emp-detail-value">{formatDate(viewItem.createdAt)}</span>
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
            <h3>Delete Employee</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> (ID: {deleteConfirm.employeeId})?
              This cannot be undone.
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
