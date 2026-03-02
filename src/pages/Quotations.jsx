import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Eye, Printer, Calendar, CalendarClock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Plus, Pencil, Trash2, X, Save, AlertTriangle, Check
} from 'lucide-react';
import { db } from '../firebase.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import '../CSS/Quotations.css';

const ITEMS_PER_PAGE = 32;

const DATE_PRESETS = ['Today', 'Yesterday', 'This Month', 'Last Month', 'This Year', 'Last Year', 'All Time'];
const EMPTY_QUOTATION_ITEM = { description: '', width: '', height: '', sqft: 0, amount: '', subtotal: 0 };

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

/* ===== Quotation Preview Component (Same layout as Invoice) ===== */
const QuotationPreview = ({ quo }) => (
  <div className="cd-invoice-preview" id="invoice-print-area">
    <div className="cd-inv-header">
      <div className="cd-inv-brand">
        <h2>{quo.fromName}</h2>
        <p>{quo.fromAddress}</p>
        {quo.fromPhone && <p>Ph: {quo.fromPhone}</p>}
        {quo.referredBy && <p>Referred By: {quo.referredBy}</p>}
        {quo.technician && <p>Technician: {quo.technician}</p>}
      </div>
      <div className="cd-inv-number">
        <h3>QUOTATION</h3>
        <p>{quo.quotationNumber}</p>
        <p>Date: {quo.date}</p>
      </div>
    </div>
    <div className="cd-inv-parties">
      <div className="cd-inv-party">
        <h4>From</h4>
        <p><strong>{quo.fromName}</strong></p>
        <p>{quo.fromAddress}</p>
        {quo.fromPhone && <p>{quo.fromPhone}</p>}
      </div>
      <div className="cd-inv-party">
        <h4>Quotation To</h4>
        <p><strong>{quo.toName}</strong></p>
        <p>{quo.toAddress}</p>
        {quo.toPhone && <p>{quo.toPhone}</p>}
      </div>
    </div>
    <table className="cd-inv-table">
      <thead><tr><th>Sl.No</th><th>Description</th><th>Width</th><th>Height</th><th>Sq.Ft</th><th>Rate</th><th>Subtotal</th></tr></thead>
      <tbody>
        {quo.items?.map((item, idx) => (
          <tr key={idx}>
            <td>{idx + 1}</td><td>{item.description}</td><td>{item.width}</td><td>{item.height}</td>
            <td>{item.sqft}</td><td>₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
            <td style={{ fontWeight: 700 }}>₹{(item.subtotal || 0).toLocaleString('en-IN')}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><td colSpan="6" style={{ textAlign: 'right' }}>Subtotal</td><td>₹{(quo.subtotal || 0).toLocaleString('en-IN')}</td></tr>
        {(quo.transportation > 0) && <tr><td colSpan="6" style={{ textAlign: 'right' }}>Transportation</td><td>₹{quo.transportation?.toLocaleString('en-IN')}</td></tr>}
        {(quo.discount > 0) && <tr><td colSpan="6" style={{ textAlign: 'right' }}>Discount</td><td>-₹{quo.discount?.toLocaleString('en-IN')}</td></tr>}
        <tr className="cd-inv-total-row"><td colSpan="6" style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem' }}>Total ESTIMATE</td><td style={{ fontWeight: 800, fontSize: '1rem', color: '#6c5ce7' }}>₹{(quo.total || 0).toLocaleString('en-IN')}</td></tr>
      </tfoot>
    </table>
    {quo.terms && <div className="cd-inv-notes"><h4>Terms & Conditions</h4><p>{quo.terms}</p></div>}
    {quo.notes && <div className="cd-inv-notes"><h4>Notes</h4><p>{quo.notes}</p></div>}
  </div>
);

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [datePreset, setDatePreset] = useState('Today');
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingQuo, setEditingQuo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [quoForm, setQuoForm] = useState({
    fromName: 'SLA Invisible Grills', fromAddress: 'Hyderabad, Telangana', fromPhone: '',
    referredBy: '', technician: '',
    toName: '', toAddress: '', toPhone: '',
    items: [{ ...EMPTY_QUOTATION_ITEM }],
    transportation: '', discount: '',
    terms: '', notes: ''
  });

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Print/View States
  const [viewQuo, setViewQuo] = useState(null);
  const [printMode, setPrintMode] = useState(false);

  /* ---- Fetch ---- */
  useEffect(() => { fetchQuotations(); }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setQuotations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Filter ---- */
  const filtered = useMemo(() => {
    let list = quotations;

    // Date filter
    if (datePreset !== 'All Time') {
      const range = getDateRange(datePreset);
      if (range) {
        list = list.filter(quo => {
          if (!quo.createdAt) return false;
          const d = quo.createdAt.toDate ? quo.createdAt.toDate() : new Date(quo.createdAt);
          return d >= range.start && d <= range.end;
        });
      }
    }

    // Search
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(quo =>
        quo.quotationNumber?.toLowerCase().includes(t) ||
        quo.toName?.toLowerCase().includes(t)
      );
    }

    return list;
  }, [quotations, searchTerm, datePreset]);

  const totalAmount = filtered.reduce((s, quo) => s + (quo.total || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, datePreset]);

  /* ---- Handlers ---- */
  const openModal = (quo = null) => {
    setEditingQuo(quo);
    if (quo) {
      setQuoForm({
        fromName: quo.fromName || 'SLA Invisible Grills', fromAddress: quo.fromAddress || '', fromPhone: quo.fromPhone || '',
        referredBy: quo.referredBy || '', technician: quo.technician || '',
        toName: quo.toName || '', toAddress: quo.toAddress || '', toPhone: quo.toPhone || '',
        items: quo.items?.length ? quo.items.map(it => ({ ...it })) : [{ ...EMPTY_QUOTATION_ITEM }],
        transportation: quo.transportation != null ? String(quo.transportation) : '',
        discount: quo.discount != null ? String(quo.discount) : '',
        terms: quo.terms || '', notes: quo.notes || ''
      });
    } else {
      setQuoForm({
        fromName: 'SLA Invisible Grills', fromAddress: 'Hyderabad, Telangana', fromPhone: '',
        referredBy: '', technician: '',
        toName: '', toAddress: '', toPhone: '',
        items: [{ ...EMPTY_QUOTATION_ITEM }],
        transportation: '', discount: '',
        terms: '', notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingQuo(null);
  };

  // Form helpers
  const updateItem = (idx, field, value) => {
    setQuoForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      const w = parseFloat(items[idx].width) || 0;
      const h = parseFloat(items[idx].height) || 0;
      items[idx].sqft = parseFloat((w * h).toFixed(2));
      const amt = parseFloat(items[idx].amount) || 0;
      items[idx].subtotal = parseFloat((items[idx].sqft * amt).toFixed(2));
      return { ...prev, items };
    });
  };

  const addItem = () => setQuoForm(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_QUOTATION_ITEM }] }));
  const removeItem = (idx) => setQuoForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const subtotal = quoForm.items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const transportation = parseFloat(quoForm.transportation) || 0;
  const discount = parseFloat(quoForm.discount) || 0;
  const total = subtotal + transportation - discount;

  const handleSave = async () => {
    if (!quoForm.toName.trim()) { showToast('Please enter customer name (To)', 'error'); return; }
    if (quoForm.items.length === 0) { showToast('Add at least one item', 'error'); return; }

    try {
      setSaving(true);
      const data = {
        fromName: quoForm.fromName, fromAddress: quoForm.fromAddress, fromPhone: quoForm.fromPhone,
        referredBy: quoForm.referredBy, technician: quoForm.technician,
        toName: quoForm.toName, toAddress: quoForm.toAddress, toPhone: quoForm.toPhone,
        items: quoForm.items, subtotal, transportation, discount, total,
        terms: quoForm.terms, notes: quoForm.notes,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      };

      if (editingQuo) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'quotations', editingQuo.id), data);
        showToast('Quotation updated!');
      } else {
        data.quotationNumber = `QUO-${Date.now().toString(36).toUpperCase()}`;
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'quotations'), data);
        showToast('Quotation created!');
      }

      closeModal();
      fetchQuotations();
    } catch (err) {
      console.error(err);
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'quotations', deleteConfirm.id));
      setDeleteConfirm(null);
      fetchQuotations();
      showToast('Quotation deleted successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Print ---- */
  const handlePrint = (quo) => {
    setViewQuo(quo);
    setPrintMode(true);
  };

  useEffect(() => {
    if (printMode && viewQuo) {
      const timer = setTimeout(() => { window.print(); setPrintMode(false); }, 400);
      return () => clearTimeout(timer);
    }
  }, [printMode, viewQuo]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      {/* Print-only */}
      {viewQuo && printMode && (
        <div className="quo-print-only">
          <QuotationPreview quo={viewQuo} />
        </div>
      )}

      {/* View Modal */}
      {viewQuo && !printMode && (
        <div className="modal-overlay" onClick={() => setViewQuo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 850, maxHeight: '95vh' }}>
            <div className="modal-header">
              <h2><Eye size={20} /> Quotation Preview</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={() => handlePrint(viewQuo)}><Printer size={14} /> Print</button>
                <button className="modal-close-btn" onClick={() => setViewQuo(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body">
              <QuotationPreview quo={viewQuo} />
            </div>
          </div>
        </div>
      )}


      <div className="page quo-no-print">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Quotations</h1>
            <p className="page-subtitle">Manage all your quotations and estimates</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} /> Add Quotation
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="quotations-date-bar">
          <Calendar size={16} color="var(--text-muted)" />
          <div className="quotations-date-chips">
            {DATE_PRESETS.map(p => (
              <button key={p} className={`quo-date-chip ${datePreset === p ? 'active' : ''}`} onClick={() => setDatePreset(p)}>{p}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="quotations-stats-bar">
          <div className="quotations-stat-card">
            <div className="quotations-stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}>
              <FileText size={22} />
            </div>
            <div className="quotations-stat-info">
              <h4>{filtered.length}</h4>
              <p>Total Quotations</p>
            </div>
          </div>
          <div className="quotations-stat-card">
            <div className="quotations-stat-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}>
              <FileText size={22} />
            </div>
            <div className="quotations-stat-info">
              <h4>₹{totalAmount.toLocaleString('en-IN')}</h4>
              <p>Total Estimated</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="quotations-table-card">
          <div className="quotations-table-header">
            <h3>All Quotations ({filtered.length})</h3>
            <div className="quotations-header-right">
              <div className="quotations-search">
                <Search size={15} color="var(--text-muted)" />
                <input type="text" placeholder="Search quotations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="quotations-table-wrap">
            <table className="quotations-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Quotation No</th>
                  <th>Quotation To</th>
                  <th>Total Estimate</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="quotations-empty-row">
                    <td colSpan="6">
                      <div className="quotations-empty-content">
                        <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 28, height: 28 }} />
                        <p>Loading quotations...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr className="quotations-empty-row">
                    <td colSpan="6">
                      <div className="quotations-empty-content">
                        <FileText size={40} />
                        <h4>{searchTerm ? 'No matching quotations' : 'No quotations yet'}</h4>
                        <p>{searchTerm ? 'Try adjusting your search or filters' : 'Click Add Quotation to create your first one'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((quo, idx) => (
                    <tr key={quo.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{quo.quotationNumber}</td>
                      <td>{quo.toName}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{quo.total?.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CalendarClock size={13} />{quo.date || formatDate(quo.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div className="quotation-actions">
                          <button className="quotation-action-btn view-btn" title="View" onClick={() => setViewQuo(quo)}><Eye size={15} /></button>
                          <button className="quotation-action-btn print-btn" title="Print" onClick={() => handlePrint(quo)}><Printer size={15} /></button>
                          <button className="quotation-action-btn edit-btn" title="Edit" onClick={() => openModal(quo)}><Pencil size={15} /></button>
                          <button className="quotation-action-btn delete-btn" title="Delete" onClick={() => setDeleteConfirm(quo)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="quotations-pagination">
              <div className="quotations-pagination-info">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} quotations
              </div>
              <div className="quotations-pagination-controls">
                <button className="qpag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft size={16} /></button>
                <button className="qpag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                  .map((p, i) => p === '...'
                    ? <span key={`d-${i}`} className="qpag-dots">…</span>
                    : <button key={p} className={`qpag-btn page-num ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                  )}
                <button className="qpag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
                <button className="qpag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight size={16} /></button>
              </div>
            </div>
          )}
        </div>

        {/* ========== MODALS ========== */}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '95vh' }}>
              <div className="modal-header">
                <h2>{editingQuo ? <Pencil size={20} /> : <Plus size={20} />} {editingQuo ? 'Edit Quotation' : 'Create Quotation'}</h2>
                <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto', paddingRight: '8px' }}>
                <div className="form-section-title">From (Your Business)</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Business Name</label>
                    <input className="form-input" value={quoForm.fromName} onChange={e => setQuoForm(p => ({ ...p, fromName: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={quoForm.fromPhone} onChange={e => setQuoForm(p => ({ ...p, fromPhone: e.target.value }))} /></div>
                </div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Address</label>
                  <input className="form-input" value={quoForm.fromAddress} onChange={e => setQuoForm(p => ({ ...p, fromAddress: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Referred By</label>
                    <input className="form-input" placeholder="Enter referred by" value={quoForm.referredBy} onChange={e => setQuoForm(p => ({ ...p, referredBy: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Technician</label>
                    <input className="form-input" placeholder="Enter technician name" value={quoForm.technician} onChange={e => setQuoForm(p => ({ ...p, technician: e.target.value }))} /></div>
                </div>

                <div className="form-section-title">To (Customer)</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Customer Name <span className="required">*</span></label>
                    <input className="form-input" value={quoForm.toName} onChange={e => setQuoForm(p => ({ ...p, toName: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={quoForm.toPhone} onChange={e => setQuoForm(p => ({ ...p, toPhone: e.target.value }))} /></div>
                </div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Address</label>
                  <input className="form-input" value={quoForm.toAddress} onChange={e => setQuoForm(p => ({ ...p, toAddress: e.target.value }))} /></div>
                </div>

                <div className="form-section-title">Items</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="cd-invoice-items-table" style={{ width: '100%', minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th>Sl.No</th><th>Description</th><th>Width</th><th>Height</th>
                        <th>Sq.Ft</th><th>Amount</th><th>Subtotal</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoForm.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td><input className="form-input" placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></td>
                          <td><input type="number" className="form-input" placeholder="W" value={item.width} onChange={e => updateItem(idx, 'width', e.target.value)} style={{ width: 60 }} /></td>
                          <td><input type="number" className="form-input" placeholder="H" value={item.height} onChange={e => updateItem(idx, 'height', e.target.value)} style={{ width: 60 }} /></td>
                          <td style={{ fontWeight: 600 }}>{item.sqft || 0}</td>
                          <td><input type="number" className="form-input" placeholder="Amt" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} style={{ width: 80 }} /></td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{(item.subtotal || 0).toLocaleString('en-IN')}</td>
                          <td><button className="cd-remove-item" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => removeItem(idx)}><X size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="cd-add-item-btn" style={{ background: 'none', border: '1px dashed var(--border-color)', width: '100%', padding: '10px', marginTop: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)' }} onClick={addItem}><Plus size={14} /> Add Item</button>

                <div className="form-section-title">Quotation Summary</div>
                <div className="cd-invoice-summary" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <table className="cd-invoice-summary-table" style={{ width: '300px', borderSpacing: '0 8px' }}>
                    <tbody>
                      <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>₹{subtotal.toLocaleString('en-IN')}</td></tr>
                      <tr><td>Transportation</td><td style={{ textAlign: 'right' }}>
                        <input type="number" className="form-input" style={{ width: 100, padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }} placeholder="0" value={quoForm.transportation} onChange={e => setQuoForm(p => ({ ...p, transportation: e.target.value }))} />
                      </td></tr>
                      <tr><td>Discount</td><td style={{ textAlign: 'right' }}>
                        <input type="number" className="form-input" style={{ width: 100, padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }} placeholder="0" value={quoForm.discount} onChange={e => setQuoForm(p => ({ ...p, discount: e.target.value }))} />
                      </td></tr>
                      <tr className="total" style={{ borderTop: '2px solid var(--border-color)' }}>
                        <td style={{ paddingTop: '8px', fontWeight: 'bold' }}>Total Estimate</td>
                        <td style={{ paddingTop: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>₹{total.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="form-section-title">Additional</div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Terms & Conditions</label>
                  <textarea className="form-textarea" rows={2} placeholder="Enter terms..." value={quoForm.terms} onChange={e => setQuoForm(p => ({ ...p, terms: e.target.value }))} /></div>
                </div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} placeholder="Any notes..." value={quoForm.notes} onChange={e => setQuoForm(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingQuo ? 'Update Quotation' : 'Save Quotation'}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="delete-modal" onClick={e => e.stopPropagation()}>
              <div className="delete-modal-icon"><AlertTriangle size={32} /></div>
              <h3>Delete Quotation</h3>
              <p>Are you sure you want to delete Quotation <strong>{deleteConfirm.quotationNumber}</strong>? This cannot be undone.</p>
              <div className="delete-modal-actions">
                <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
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
    </>
  );
}
