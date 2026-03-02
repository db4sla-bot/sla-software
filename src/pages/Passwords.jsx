import { useState, useEffect, useMemo } from 'react';
import {
  KeyRound, Plus, Search, X, Save, Check,
  Pencil, Trash2, AlertTriangle, Eye, EyeOff, Copy, CalendarClock
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import '../CSS/Passwords.css';

const INITIAL_FORM = { displayLabel: '', username: '', password: '' };

export default function Passwords() {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Visibility & Copy
  const [visibleIds, setVisibleIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  /* ---- Fetch ---- */
  useEffect(() => { fetchPasswords(); }, []);

  const fetchPasswords = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'passwords'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPasswords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error('Error fetching passwords:', err); }
    finally { setLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Form ---- */
  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      displayLabel: item.displayLabel || '',
      username: item.username || '',
      password: item.password || ''
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!form.displayLabel.trim()) { showToast('Enter display label', 'error'); return; }
    if (!form.username.trim()) { showToast('Enter username', 'error'); return; }
    if (!form.password.trim()) { showToast('Enter password', 'error'); return; }

    try {
      setSaving(true);
      const data = {
        displayLabel: form.displayLabel.trim(),
        username: form.username.trim(),
        password: form.password.trim(),
      };

      if (editingItem) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'passwords', editingItem.id), data);
        showToast('Password updated!');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'passwords'), data);
        showToast('Password added!');
      }
      closeModal();
      fetchPasswords();
    } catch (err) { console.error(err); showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'passwords', id));
      showToast('Password deleted!');
      setDeleteConfirm(null);
      fetchPasswords();
    } catch (err) { showToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  };

  /* ---- Toggle visibility ---- */
  const toggleVisibility = (id) => {
    setVisibleIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /* ---- Copy ---- */
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { showToast('Failed to copy', 'error'); }
  };

  /* ---- Filter ---- */
  const filtered = useMemo(() => {
    if (!searchTerm) return passwords;
    const t = searchTerm.toLowerCase();
    return passwords.filter(p =>
      p.displayLabel?.toLowerCase().includes(t) ||
      p.username?.toLowerCase().includes(t)
    );
  }, [passwords, searchTerm]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Passwords</h1>
          <p className="page-subtitle">Securely manage your credentials</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> Add Password</button>
        </div>
      </div>

      {/* Stats */}
      <div className="passwords-stats-bar">
        <div className="passwords-stat-card">
          <div className="passwords-stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}>
            <KeyRound size={22} />
          </div>
          <div className="passwords-stat-info">
            <h4>{passwords.length}</h4>
            <p>Total Passwords</p>
          </div>
        </div>
        <div className="passwords-stat-card">
          <div className="passwords-stat-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}>
            <KeyRound size={22} />
          </div>
          <div className="passwords-stat-info">
            <h4>{filtered.length}</h4>
            <p>Showing Results</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="passwords-table-card">
        <div className="passwords-table-header">
          <h3>All Passwords ({filtered.length})</h3>
          <div className="passwords-search">
            <Search size={15} color="var(--text-muted)" />
            <input type="text" placeholder="Search passwords..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="passwords-table-wrap">
          <table className="passwords-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Display Label</th>
                <th>Username</th>
                <th>Password</th>
                <th>Added On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="passwords-empty-row">
                  <td colSpan="6">
                    <div className="passwords-empty-content">
                      <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 28, height: 28 }} />
                      <p>Loading passwords...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="passwords-empty-row">
                  <td colSpan="6">
                    <div className="passwords-empty-content">
                      <KeyRound size={40} />
                      <h4>{searchTerm ? 'No matching passwords' : 'No passwords yet'}</h4>
                      <p>{searchTerm ? 'Try adjusting your search' : 'Click "Add Password" to save your first credential'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <span className="pwd-label-tag">
                        <span className="pwd-label-dot" />
                        {item.displayLabel}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.username}</td>
                    <td>
                      <div className="pwd-field">
                        {visibleIds[item.id]
                          ? <span className="pwd-visible">{item.password}</span>
                          : <span className="pwd-mask">••••••••</span>
                        }
                        <button className="pwd-toggle" title={visibleIds[item.id] ? 'Hide' : 'Show'} onClick={() => toggleVisibility(item.id)}>
                          {visibleIds[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button className={`pwd-copy ${copiedId === item.id ? 'copied' : ''}`} title="Copy" onClick={() => copyToClipboard(item.password, item.id)}>
                          {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarClock size={13} />{formatDate(item.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="pwd-actions">
                        <button className="pwd-action-btn edit-btn" title="Edit" onClick={() => openEditModal(item)}><Pencil size={15} /></button>
                        <button className="pwd-action-btn delete-btn" title="Delete" onClick={() => setDeleteConfirm(item)}><Trash2 size={15} /></button>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>{editingItem ? <Pencil size={20} /> : <Plus size={20} />} {editingItem ? 'Edit Password' : 'Add Password'}</h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">Credential Details</div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Display Label <span className="required">*</span></label>
                  <input className="form-input" placeholder="e.g. Gmail, Instagram, Firebase" value={form.displayLabel} onChange={e => handleChange('displayLabel', e.target.value)} />
                </div>
              </div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Username <span className="required">*</span></label>
                  <input className="form-input" placeholder="Enter username or email" value={form.username} onChange={e => handleChange('username', e.target.value)} />
                </div>
              </div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <input className="form-input" placeholder="Enter password" value={form.password} onChange={e => handleChange('password', e.target.value)} />
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

      {/* ========== DELETE CONFIRM ========== */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon"><AlertTriangle size={32} /></div>
            <h3>Delete Password</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.displayLabel}</strong>? This cannot be undone.</p>
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
