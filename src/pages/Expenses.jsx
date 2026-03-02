import { useState, useEffect, useMemo } from 'react';
import {
  Receipt, Plus, Download, Search, X, Save, Check,
  Pencil, Trash2, AlertTriangle, CalendarClock, Filter,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import '../CSS/Expenses.css';

const ITEMS_PER_PAGE = 32;

/* ====== CATEGORY CONFIG ====== */
const CATEGORIES = [
  'Rent', 'Bills', 'Maintenance', 'EMI', 'Marketing',
  'Food', 'Transport', 'Investment', 'Miscellaneous'
];

const SUBCATEGORIES = {
  Rent: ['Office', 'Room'],
  Bills: ['Electricity', 'Mobile', 'DTH', 'Wifi', 'Gas'],
  Maintenance: ['Cleaning', 'Service', 'Repairs', 'Maid', 'Hospital', 'Parties', 'Outing'],
  EMI: ['Just Dial', 'Bike', 'WI', 'IndiaMart'],
  Marketing: ['Flex', 'Digital Marketing', 'NewsPapers', 'Influencers', 'Google Ads', 'Campaigns', 'Pamphlets', 'Appointments'],
  Food: ['DMart', 'Gas', 'Rice', 'Eggs', 'Non Veg', 'Milk', 'Curd', 'Water', 'Kirana', 'Veg', 'Misc'],
  Transport: ['Logistics', 'Site Visit', 'Site Work'],
  Investment: ['Assets', 'Designing', 'Printing'],
  Miscellaneous: ['Office', 'Site', 'Materials']
};

const TRANSPORT_MODES = ['Auto', 'Bike', 'Bus', 'Car'];
const TRANSPORT_ITEMS = ['MM', 'CH', 'IG', 'Others'];

/* ====== DATE HELPERS ====== */
const getDateRange = (preset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'Today': return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case 'Yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); return { start: y, end: new Date(today.getTime() - 1) }; }
    case 'This Month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'Last Month': { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); return { start: s, end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) }; }
    case 'This Year': return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'Last Year': return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59) };
    default: return null;
  }
};

const DATE_PRESETS = ['Today', 'Yesterday', 'This Month', 'Last Month', 'This Year', 'Last Year', 'All Time'];

const INITIAL_FORM = {
  expenseName: '', category: '', subCategory: '',
  transportMode: '', transportItem: '', amount: ''
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [datePreset, setDatePreset] = useState('Today');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  /* ---- Fetch ---- */
  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error('Error fetching expenses:', err); }
    finally { setLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Form ---- */
  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'category') {
        next.subCategory = '';
        next.transportMode = '';
        next.transportItem = '';
      }
      return next;
    });
  };

  /* ---- Open Modals ---- */
  const openAddModal = () => {
    setEditingExpense(null);
    setForm({ ...INITIAL_FORM });
    setShowModal(true);
  };

  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setForm({
      expenseName: exp.expenseName || '',
      category: exp.category || '',
      subCategory: exp.subCategory || '',
      transportMode: exp.transportMode || '',
      transportItem: exp.transportItem || '',
      amount: exp.amount != null ? String(exp.amount) : ''
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingExpense(null); };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!form.expenseName.trim()) { showToast('Enter expense name', 'error'); return; }
    if (!form.category) { showToast('Select a category', 'error'); return; }
    if (!form.amount) { showToast('Enter amount', 'error'); return; }

    try {
      setSaving(true);
      const data = {
        expenseName: form.expenseName.trim(),
        category: form.category,
        subCategory: form.subCategory,
        amount: Number(form.amount),
      };
      if (form.category === 'Transport') {
        data.transportMode = form.transportMode;
        data.transportItem = form.transportItem;
      }

      if (editingExpense) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'expenses', editingExpense.id), data);
        showToast('Expense updated!');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'expenses'), data);
        showToast('Expense added!');
      }
      closeModal();
      fetchExpenses();
    } catch (err) { console.error(err); showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'expenses', id));
      showToast('Expense deleted!');
      setDeleteConfirm(null);
      fetchExpenses();
    } catch (err) { showToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  };

  /* ---- Filter & Paginate ---- */
  const filteredExpenses = useMemo(() => {
    let list = expenses;

    // Date filter
    if (datePreset !== 'All Time') {
      const range = getDateRange(datePreset);
      if (range) {
        list = list.filter(e => {
          if (!e.createdAt) return false;
          const d = e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
          return d >= range.start && d <= range.end;
        });
      }
    }

    // Category filter
    if (filterCategory) {
      list = list.filter(e => e.category === filterCategory);
    }

    // Sub category filter
    if (filterSubCategory) {
      list = list.filter(e => e.subCategory === filterSubCategory);
    }

    // Search
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.expenseName?.toLowerCase().includes(t) ||
        e.category?.toLowerCase().includes(t) ||
        e.subCategory?.toLowerCase().includes(t)
      );
    }

    return list;
  }, [expenses, searchTerm, filterCategory, filterSubCategory, datePreset]);

  const totalAmount = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE));
  const paginated = filteredExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory, filterSubCategory, datePreset]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getCategoryClass = (cat) => cat?.toLowerCase().replace(/[^a-z]/g, '') || '';

  /* ==================
     RENDER
     ================== */
  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage all expenses</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline"><Download size={16} /> Export</button>
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> Add Expense</button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="expenses-date-bar">
        <Calendar size={16} color="var(--text-muted)" />
        <div className="expenses-date-chips">
          {DATE_PRESETS.map(p => (
            <button key={p} className={`exp-date-chip ${datePreset === p ? 'active' : ''}`} onClick={() => setDatePreset(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="expenses-stats-bar">
        <div className="expenses-stat-card">
          <div className="expenses-stat-icon" style={{ background: 'rgba(225,112,85,0.1)', color: '#e17055' }}>
            <Receipt size={22} />
          </div>
          <div className="expenses-stat-info">
            <h4>{filteredExpenses.length}</h4>
            <p>Total Expenses</p>
          </div>
        </div>
        <div className="expenses-stat-card">
          <div className="expenses-stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}>
            <Receipt size={22} />
          </div>
          <div className="expenses-stat-info">
            <h4>₹{totalAmount.toLocaleString('en-IN')}</h4>
            <p>Total Amount</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="expenses-table-card">
        <div className="expenses-table-header">
          <h3>All Expenses ({filteredExpenses.length})</h3>
          <div className="expenses-header-right">
            <select className="expenses-filter-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterSubCategory(''); }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {filterCategory && SUBCATEGORIES[filterCategory] && (
              <select className="expenses-filter-select" value={filterSubCategory} onChange={e => setFilterSubCategory(e.target.value)}>
                <option value="">All Sub Categories</option>
                {SUBCATEGORIES[filterCategory].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <div className="expenses-search">
              <Search size={15} color="var(--text-muted)" />
              <input type="text" placeholder="Search expenses..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="expenses-table-wrap">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Expense Name</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="expenses-empty-row">
                  <td colSpan="7">
                    <div className="expenses-empty-content">
                      <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 28, height: 28 }} />
                      <p>Loading expenses...</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr className="expenses-empty-row">
                  <td colSpan="7">
                    <div className="expenses-empty-content">
                      <Receipt size={40} />
                      <h4>{searchTerm || filterCategory ? 'No matching expenses' : 'No expenses yet'}</h4>
                      <p>{searchTerm || filterCategory ? 'Try adjusting your search or filters' : 'Click "Add Expense" to add your first expense'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((exp, idx) => (
                  <tr key={exp.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{exp.expenseName}</td>
                    <td>
                      <span className={`expense-category-tag ${getCategoryClass(exp.category)}`}>{exp.category}</span>
                    </td>
                    <td>
                      {exp.subCategory && <span className="expense-sub-tag">{exp.subCategory}</span>}
                      {exp.transportMode && <span className="expense-sub-tag" style={{ marginLeft: 4 }}>{exp.transportMode}</span>}
                      {exp.transportItem && <span className="expense-sub-tag" style={{ marginLeft: 4 }}>{exp.transportItem}</span>}
                      {!exp.subCategory && !exp.transportMode && '—'}
                    </td>
                    <td><span className="expense-amount">₹{exp.amount?.toLocaleString('en-IN')}</span></td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarClock size={13} />{formatDate(exp.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="expense-actions">
                        <button className="expense-action-btn edit-btn" title="Edit" onClick={() => openEditModal(exp)}><Pencil size={15} /></button>
                        <button className="expense-action-btn delete-btn" title="Delete" onClick={() => setDeleteConfirm(exp)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredExpenses.length > ITEMS_PER_PAGE && (
          <div className="expenses-pagination">
            <div className="expenses-pagination-info">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredExpenses.length)} of {filteredExpenses.length} expenses
            </div>
            <div className="expenses-pagination-controls">
              <button className="epag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft size={16} /></button>
              <button className="epag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                .map((p, i) => p === '...'
                  ? <span key={`d-${i}`} className="epag-dots">…</span>
                  : <button key={p} className={`epag-btn page-num ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                )}
              <button className="epag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
              <button className="epag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ========== ADD/EDIT MODAL ========== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? <Pencil size={20} /> : <Plus size={20} />} {editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">Expense Details</div>

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Expense Name <span className="required">*</span></label>
                  <input className="form-input" placeholder="Enter expense name" value={form.expenseName} onChange={e => handleChange('expenseName', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category <span className="required">*</span></label>
                  <select className="form-select" value={form.category} onChange={e => handleChange('category', e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {form.category && SUBCATEGORIES[form.category] && (
                  <div className="form-group">
                    <label className="form-label">Sub Category</label>
                    <select className="form-select" value={form.subCategory} onChange={e => handleChange('subCategory', e.target.value)}>
                      <option value="">Select sub category</option>
                      {SUBCATEGORIES[form.category].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Transport Extra Fields */}
              {form.category === 'Transport' && (
                <div className="transport-extra-row">
                  <div className="form-group">
                    <label className="form-label">Mode</label>
                    <select className="form-select" value={form.transportMode} onChange={e => handleChange('transportMode', e.target.value)}>
                      <option value="">Select mode</option>
                      {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Item</label>
                    <select className="form-select" value={form.transportItem} onChange={e => handleChange('transportItem', e.target.value)}>
                      <option value="">Select item</option>
                      {TRANSPORT_ITEMS.map(it => <option key={it} value={it}>{it}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Amount <span className="required">*</span></label>
                  <input type="number" className="form-input" placeholder="Enter amount" value={form.amount} onChange={e => handleChange('amount', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingExpense ? 'Update' : 'Save'}</>}
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
            <h3>Delete Expense</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.expenseName}</strong>? This cannot be undone.</p>
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
