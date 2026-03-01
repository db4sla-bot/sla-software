import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, MapPin, CalendarClock, Pencil, Trash2,
  Plus, Save, X, Check, Eye, Printer, Briefcase, CreditCard,
  FileText, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  doc, getDoc, updateDoc, collection, addDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import '../css/CustomerDetails.css';

const SERVICES = ['Invisible Grills', 'Mosquito Mesh', 'Cloth Hangers'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'];
const EMPTY_INVOICE_ITEM = { description: '', width: '', height: '', sqft: 0, amount: '', subtotal: 0 };

export default function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Profile
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ customerName: '', mobileNumber: '', address: '' });

  // Works
  const [works, setWorks] = useState([]);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [workForm, setWorkForm] = useState({ workName: '', service: '' });
  const [savingWork, setSavingWork] = useState(false);

  // Payments
  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ workId: '', amount: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [expandedPayment, setExpandedPayment] = useState(null);

  // Installments
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentPaymentId, setInstallmentPaymentId] = useState(null);
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: '', time: '', mode: '', remarks: '' });
  const [savingInstallment, setSavingInstallment] = useState(false);

  // Invoices
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    fromName: 'SLA Invisible Grills', fromAddress: '', fromPhone: '',
    referredBy: '', technician: '',
    toName: '', toAddress: '', toPhone: '',
    items: [{ ...EMPTY_INVOICE_ITEM }],
    transportation: '', discount: '',
    terms: '', notes: ''
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [printMode, setPrintMode] = useState(false);

  // Generic delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ========== FETCH ========== */
  const fetchCustomer = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'customers', customerId));
      if (snap.exists()) {
        const d = { id: snap.id, ...snap.data() };
        setCustomer(d);
        setProfileForm({ customerName: d.customerName || '', mobileNumber: d.mobileNumber || '', address: d.address || '' });
      }
    } catch (err) { console.error(err); }
  }, [customerId]);

  const fetchWorks = useCallback(async () => {
    try {
      const q = query(collection(db, 'customers', customerId, 'works'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setWorks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  }, [customerId]);

  const fetchPayments = useCallback(async () => {
    try {
      const q = query(collection(db, 'customers', customerId, 'payments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const pList = [];
      for (const d of snap.docs) {
        const p = { id: d.id, ...d.data(), installments: [] };
        const iq = query(collection(db, 'customers', customerId, 'payments', d.id, 'installments'), orderBy('createdAt', 'asc'));
        const iSnap = await getDocs(iq);
        p.installments = iSnap.docs.map(i => ({ id: i.id, ...i.data() }));
        pList.push(p);
      }
      setPayments(pList);
    } catch (err) { console.error(err); }
  }, [customerId]);

  const fetchInvoices = useCallback(async () => {
    try {
      const q = query(collection(db, 'customers', customerId, 'invoices'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  }, [customerId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchCustomer();
      await Promise.all([fetchWorks(), fetchPayments(), fetchInvoices()]);
      setLoading(false);
    })();
  }, [fetchCustomer, fetchWorks, fetchPayments, fetchInvoices]);

  /* ========== PROFILE ========== */
  const saveProfile = async () => {
    try {
      await updateDoc(doc(db, 'customers', customerId), {
        customerName: profileForm.customerName.trim(),
        mobileNumber: profileForm.mobileNumber.trim(),
        address: profileForm.address.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingProfile(false);
      fetchCustomer();
      showToast('Profile updated!');
    } catch (err) { showToast('Failed to update', 'error'); }
  };

  /* ========== WORKS ========== */
  const openWorkModal = (work = null) => {
    setEditingWork(work);
    setWorkForm(work ? { workName: work.workName, service: work.service } : { workName: '', service: '' });
    setShowWorkModal(true);
  };

  const saveWork = async () => {
    if (!workForm.workName.trim() || !workForm.service) { showToast('Fill work name and service', 'error'); return; }
    try {
      setSavingWork(true);
      if (editingWork) {
        await updateDoc(doc(db, 'customers', customerId, 'works', editingWork.id), {
          workName: workForm.workName.trim(), service: workForm.service, updatedAt: serverTimestamp()
        });
        showToast('Work updated!');
      } else {
        await addDoc(collection(db, 'customers', customerId, 'works'), {
          workName: workForm.workName.trim(), service: workForm.service, createdAt: serverTimestamp()
        });
        showToast('Work added!');
      }
      setShowWorkModal(false);
      fetchWorks();
    } catch (err) { showToast('Failed', 'error'); }
    finally { setSavingWork(false); }
  };

  /* ========== PAYMENTS ========== */
  const openPaymentModal = (payment = null) => {
    setEditingPayment(payment);
    setPaymentForm(payment ? { workId: payment.workId, amount: String(payment.totalAmount || '') } : { workId: '', amount: '' });
    setShowPaymentModal(true);
  };

  const savePayment = async () => {
    if (!paymentForm.workId || !paymentForm.amount) { showToast('Select work and enter amount', 'error'); return; }
    try {
      setSavingPayment(true);
      const work = works.find(w => w.id === paymentForm.workId);
      const data = {
        workId: paymentForm.workId, workName: work?.workName || '', service: work?.service || '',
        totalAmount: Number(paymentForm.amount)
      };
      if (editingPayment) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'customers', customerId, 'payments', editingPayment.id), data);
        showToast('Payment updated!');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'customers', customerId, 'payments'), data);
        showToast('Payment added!');
      }
      setShowPaymentModal(false);
      fetchPayments();
    } catch (err) { showToast('Failed', 'error'); }
    finally { setSavingPayment(false); }
  };

  /* ========== INSTALLMENTS ========== */
  const openInstallmentModal = (paymentId, inst = null) => {
    setInstallmentPaymentId(paymentId);
    setEditingInstallment(inst);
    if (inst) {
      setInstallmentForm({ amount: String(inst.amount || ''), date: inst.date || '', time: inst.time || '', mode: inst.mode || '', remarks: inst.remarks || '' });
    } else {
      const now = new Date();
      setInstallmentForm({ amount: '', mode: '', remarks: '', date: now.toISOString().split('T')[0], time: now.toTimeString().slice(0, 5) });
    }
    setShowInstallmentModal(true);
  };

  const saveInstallment = async () => {
    if (!installmentForm.amount) { showToast('Enter amount', 'error'); return; }
    try {
      setSavingInstallment(true);
      if (editingInstallment) {
        await updateDoc(doc(db, 'customers', customerId, 'payments', installmentPaymentId, 'installments', editingInstallment.id), {
          amount: Number(installmentForm.amount), date: installmentForm.date, time: installmentForm.time,
          mode: installmentForm.mode, remarks: installmentForm.remarks.trim(), updatedAt: serverTimestamp()
        });
        showToast('Installment updated!');
      } else {
        const payment = payments.find(p => p.id === installmentPaymentId);
        const count = payment?.installments?.length || 0;
        const label = count === 0 ? 'Advance' : `Installment ${count}`;
        await addDoc(collection(db, 'customers', customerId, 'payments', installmentPaymentId, 'installments'), {
          label, amount: Number(installmentForm.amount), date: installmentForm.date, time: installmentForm.time,
          mode: installmentForm.mode, remarks: installmentForm.remarks.trim(), createdAt: serverTimestamp()
        });
        showToast('Installment added!');
      }
      setShowInstallmentModal(false);
      fetchPayments();
    } catch (err) { showToast('Failed', 'error'); }
    finally { setSavingInstallment(false); }
  };

  const deleteInstallment = async (paymentId, instId) => {
    try {
      await deleteDoc(doc(db, 'customers', customerId, 'payments', paymentId, 'installments', instId));
      fetchPayments();
      showToast('Installment deleted!');
    } catch (err) { showToast('Failed', 'error'); }
  };

  /* ========== INVOICES ========== */
  const openInvoiceModal = (inv = null) => {
    setEditingInvoice(inv);
    if (inv) {
      setInvoiceForm({
        fromName: inv.fromName || 'SLA Invisible Grills', fromAddress: inv.fromAddress || '', fromPhone: inv.fromPhone || '',
        referredBy: inv.referredBy || '', technician: inv.technician || '',
        toName: inv.toName || '', toAddress: inv.toAddress || '', toPhone: inv.toPhone || '',
        items: inv.items?.length ? inv.items.map(it => ({ ...it })) : [{ ...EMPTY_INVOICE_ITEM }],
        transportation: inv.transportation != null ? String(inv.transportation) : '',
        discount: inv.discount != null ? String(inv.discount) : '',
        terms: inv.terms || '', notes: inv.notes || ''
      });
    } else {
      setInvoiceForm({
        fromName: 'SLA Invisible Grills', fromAddress: 'Hyderabad, Telangana', fromPhone: '',
        referredBy: '', technician: '',
        toName: customer?.customerName || '', toAddress: customer?.address || '', toPhone: customer?.mobileNumber || '',
        items: [{ ...EMPTY_INVOICE_ITEM }],
        transportation: '', discount: '',
        terms: '', notes: ''
      });
    }
    setShowInvoiceModal(true);
  };

  const updateInvoiceItem = (idx, field, value) => {
    setInvoiceForm(prev => {
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

  const addInvoiceItem = () => setInvoiceForm(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_INVOICE_ITEM }] }));
  const removeInvoiceItem = (idx) => setInvoiceForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const invoiceSubtotal = invoiceForm.items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const invoiceTransportation = parseFloat(invoiceForm.transportation) || 0;
  const invoiceDiscount = parseFloat(invoiceForm.discount) || 0;
  const invoiceTotal = invoiceSubtotal + invoiceTransportation - invoiceDiscount;

  const saveInvoice = async () => {
    if (invoiceForm.items.length === 0) { showToast('Add at least one item', 'error'); return; }
    try {
      setSavingInvoice(true);
      const data = {
        fromName: invoiceForm.fromName, fromAddress: invoiceForm.fromAddress, fromPhone: invoiceForm.fromPhone,
        referredBy: invoiceForm.referredBy, technician: invoiceForm.technician,
        toName: invoiceForm.toName, toAddress: invoiceForm.toAddress, toPhone: invoiceForm.toPhone,
        items: invoiceForm.items, subtotal: invoiceSubtotal,
        transportation: invoiceTransportation, discount: invoiceDiscount, total: invoiceTotal,
        terms: invoiceForm.terms, notes: invoiceForm.notes,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
      if (editingInvoice) {
        data.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'customers', customerId, 'invoices', editingInvoice.id), data);
        showToast('Invoice updated!');
      } else {
        data.invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'customers', customerId, 'invoices'), data);
        showToast('Invoice created!');
      }
      setShowInvoiceModal(false);
      fetchInvoices();
    } catch (err) { showToast('Failed', 'error'); }
    finally { setSavingInvoice(false); }
  };

  /* ========== GENERIC DELETE ========== */
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, parentId, label } = deleteConfirm;
    try {
      setDeleting(true);
      if (type === 'work') await deleteDoc(doc(db, 'customers', customerId, 'works', id));
      else if (type === 'payment') await deleteDoc(doc(db, 'customers', customerId, 'payments', id));
      else if (type === 'installment') await deleteDoc(doc(db, 'customers', customerId, 'payments', parentId, 'installments', id));
      else if (type === 'invoice') await deleteDoc(doc(db, 'customers', customerId, 'invoices', id));
      setDeleteConfirm(null);
      if (type === 'work') fetchWorks();
      else if (type === 'payment' || type === 'installment') fetchPayments();
      else if (type === 'invoice') fetchInvoices();
      showToast(`${label} deleted!`);
    } catch (err) { showToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  };

  /* ========== PRINT ========== */
  const handlePrint = (inv) => {
    setViewInvoice(inv);
    setPrintMode(true);
  };

  useEffect(() => {
    if (printMode && viewInvoice) {
      const timer = setTimeout(() => { window.print(); setPrintMode(false); }, 400);
      return () => clearTimeout(timer);
    }
  }, [printMode, viewInvoice]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  /* ========== LOADING / NOT FOUND ========== */
  if (loading) return (
    <div className="page"><div className="cd-loading">
      <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 32, height: 32 }} />
      <p>Loading customer details...</p>
    </div></div>
  );

  if (!customer) return (
    <div className="page"><div className="cd-loading">
      <AlertTriangle size={40} /><h4>Customer not found</h4>
      <button className="btn btn-primary" onClick={() => navigate('/customers')}>Back to Customers</button>
    </div></div>
  );

  /* ========== INVOICE PREVIEW COMPONENT ========== */
  const InvoicePreview = ({ inv }) => (
    <div className="cd-invoice-preview" id="invoice-print-area">
      <div className="cd-inv-header">
        <div className="cd-inv-brand">
          <h2>{inv.fromName}</h2>
          <p>{inv.fromAddress}</p>
          {inv.fromPhone && <p>Ph: {inv.fromPhone}</p>}
          {inv.referredBy && <p>Referred By: {inv.referredBy}</p>}
          {inv.technician && <p>Technician: {inv.technician}</p>}
        </div>
        <div className="cd-inv-number">
          <h3>INVOICE</h3>
          <p>{inv.invoiceNumber}</p>
          <p>Date: {inv.date}</p>
        </div>
      </div>
      <div className="cd-inv-parties">
        <div className="cd-inv-party">
          <h4>Bill From</h4>
          <p><strong>{inv.fromName}</strong></p>
          <p>{inv.fromAddress}</p>
          {inv.fromPhone && <p>{inv.fromPhone}</p>}
        </div>
        <div className="cd-inv-party">
          <h4>Bill To</h4>
          <p><strong>{inv.toName}</strong></p>
          <p>{inv.toAddress}</p>
          {inv.toPhone && <p>{inv.toPhone}</p>}
        </div>
      </div>
      <table className="cd-inv-table">
        <thead><tr><th>Sl.No</th><th>Description</th><th>Width</th><th>Height</th><th>Sq.Ft</th><th>Rate</th><th>Subtotal</th></tr></thead>
        <tbody>
          {inv.items?.map((item, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td><td>{item.description}</td><td>{item.width}</td><td>{item.height}</td>
              <td>{item.sqft}</td><td>₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
              <td style={{ fontWeight: 700 }}>₹{(item.subtotal || 0).toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan="6" style={{ textAlign: 'right' }}>Subtotal</td><td>₹{(inv.subtotal || 0).toLocaleString('en-IN')}</td></tr>
          {(inv.transportation > 0) && <tr><td colSpan="6" style={{ textAlign: 'right' }}>Transportation</td><td>₹{inv.transportation?.toLocaleString('en-IN')}</td></tr>}
          {(inv.discount > 0) && <tr><td colSpan="6" style={{ textAlign: 'right' }}>Discount</td><td>-₹{inv.discount?.toLocaleString('en-IN')}</td></tr>}
          <tr className="cd-inv-total-row"><td colSpan="6" style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem' }}>Total</td><td style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>₹{(inv.total || 0).toLocaleString('en-IN')}</td></tr>
        </tfoot>
      </table>
      {inv.terms && <div className="cd-inv-notes"><h4>Terms & Conditions</h4><p>{inv.terms}</p></div>}
      {inv.notes && <div className="cd-inv-notes"><h4>Notes</h4><p>{inv.notes}</p></div>}
    </div>
  );

  /* ========== RENDER ========== */
  return (
    <>
      {/* Print-only invoice */}
      {viewInvoice && (
        <div className="cd-print-only">
          <InvoicePreview inv={viewInvoice} />
        </div>
      )}

      <div className="page cd-no-print">
        {/* Back */}
        <div className="cd-back" onClick={() => navigate('/customers')}><ArrowLeft size={16} /> Back to Customers</div>

        {/* ===== PROFILE ===== */}
        <div className="cd-section">
          <div className="cd-section-header">
            <h3><User size={18} /> Customer Profile</h3>
            {!editingProfile ? (
              <button className="btn btn-outline" onClick={() => setEditingProfile(true)}><Pencil size={14} /> Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-cancel" onClick={() => { setEditingProfile(false); setProfileForm({ customerName: customer.customerName, mobileNumber: customer.mobileNumber, address: customer.address }); }}>Cancel</button>
                <button className="btn-save" onClick={saveProfile}><Save size={14} /> Save</button>
              </div>
            )}
          </div>
          <div className="cd-section-body">
            {editingProfile ? (
              <div className="cd-profile-grid">
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input className="form-input" value={profileForm.customerName} onChange={e => setProfileForm(p => ({ ...p, customerName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input className="form-input" value={profileForm.mobileNumber} onChange={e => setProfileForm(p => ({ ...p, mobileNumber: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Address</label>
                  <textarea className="form-textarea" rows={2} value={profileForm.address} onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="cd-profile-grid">
                <div className="cd-profile-item">
                  <div className="cd-profile-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}><User size={18} /></div>
                  <div><div className="cd-profile-label">Customer Name</div><div className="cd-profile-value">{customer.customerName}</div></div>
                </div>
                <div className="cd-profile-item">
                  <div className="cd-profile-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}><Phone size={18} /></div>
                  <div><div className="cd-profile-label">Mobile Number</div><div className="cd-profile-value">{customer.mobileNumber}</div></div>
                </div>
                <div className="cd-profile-item">
                  <div className="cd-profile-icon" style={{ background: 'rgba(225,112,85,0.1)', color: '#e17055' }}><MapPin size={18} /></div>
                  <div><div className="cd-profile-label">Address</div><div className="cd-profile-value">{customer.address || '—'}</div></div>
                </div>
                <div className="cd-profile-item">
                  <div className="cd-profile-icon" style={{ background: 'rgba(116,185,255,0.1)', color: '#2e86de' }}><CalendarClock size={18} /></div>
                  <div><div className="cd-profile-label">Added On</div><div className="cd-profile-value">{formatDate(customer.createdAt)}</div></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== WORKS ===== */}
        <div className="cd-section">
          <div className="cd-section-header">
            <h3><Briefcase size={18} /> Works ({works.length})</h3>
            <button className="btn btn-primary" onClick={() => openWorkModal()}><Plus size={14} /> Add Work</button>
          </div>
          {works.length === 0 ? (
            <div className="cd-empty"><Briefcase size={32} /><h4>No works yet</h4><p>Click "Add Work" to create one</p></div>
          ) : (
            <table className="cd-mini-table">
              <thead><tr><th>#</th><th>Work Name</th><th>Service</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {works.map((w, i) => (
                  <tr key={w.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{w.workName}</td>
                    <td><span className="cd-service-tag">{w.service}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(w.createdAt)}</td>
                    <td>
                      <div className="cd-actions-cell">
                        <button className="cd-action-btn edit" onClick={() => openWorkModal(w)}><Pencil size={14} /></button>
                        <button className="cd-action-btn delete" onClick={() => setDeleteConfirm({ type: 'work', id: w.id, label: 'Work', name: w.workName })}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== PAYMENTS ===== */}
        <div className="cd-section">
          <div className="cd-section-header">
            <h3><CreditCard size={18} /> Payments ({payments.length})</h3>
            <button className="btn btn-primary" onClick={() => openPaymentModal()} disabled={works.length === 0}><Plus size={14} /> Add Payment</button>
          </div>
          <div className="cd-section-body" style={{ padding: payments.length ? '16px 20px' : 0 }}>
            {payments.length === 0 ? (
              <div className="cd-empty"><CreditCard size={32} /><h4>No payments yet</h4><p>Add works first, then create payments</p></div>
            ) : (
              payments.map(p => {
                const paidTotal = p.installments.reduce((s, inst) => s + (inst.amount || 0), 0);
                const balance = (p.totalAmount || 0) - paidTotal;
                const isOpen = expandedPayment === p.id;
                return (
                  <div className="cd-payment-card" key={p.id}>
                    <div className="cd-payment-header" onClick={() => setExpandedPayment(isOpen ? null : p.id)}>
                      <div className="cd-payment-header-left">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <h4>{p.workName}</h4>
                        <span className="cd-service-tag">{p.service}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="cd-payment-amount">₹{p.totalAmount?.toLocaleString('en-IN')}</span>
                        <button className="cd-action-btn edit" onClick={e => { e.stopPropagation(); openPaymentModal(p); }}><Pencil size={14} /></button>
                        <button className="cd-action-btn delete" onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'payment', id: p.id, label: 'Payment', name: p.workName }); }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="cd-payment-body">
                        <div className="cd-installment-row header">
                          <span>Label</span><span>Amount</span><span>Date</span><span>Mode</span><span>Remarks</span><span>Actions</span>
                        </div>
                        {p.installments.length === 0 ? (
                          <div className="cd-empty" style={{ padding: '20px 16px' }}><p>No installments yet</p></div>
                        ) : (
                          p.installments.map(inst => (
                            <div className="cd-installment-row" key={inst.id}>
                              <span className="cd-installment-label">{inst.label}</span>
                              <span className="cd-installment-amount">₹{inst.amount?.toLocaleString('en-IN')}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inst.date} {inst.time}</span>
                              <span style={{ fontSize: '0.8rem' }}>{inst.mode || '—'}</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{inst.remarks || '—'}</span>
                              <span className="cd-actions-cell">
                                <button className="cd-action-btn edit" onClick={() => openInstallmentModal(p.id, inst)}><Pencil size={12} /></button>
                                <button className="cd-action-btn delete" onClick={() => setDeleteConfirm({ type: 'installment', id: inst.id, parentId: p.id, label: 'Installment', name: inst.label })}><Trash2 size={12} /></button>
                              </span>
                            </div>
                          ))
                        )}
                        <div className="cd-payment-summary">
                          <span>Total: <strong>₹{p.totalAmount?.toLocaleString('en-IN')}</strong></span>
                          <span>Paid: <strong style={{ color: '#00b894' }}>₹{paidTotal.toLocaleString('en-IN')}</strong></span>
                          <span>Balance: <strong className={balance > 0 ? 'cd-balance-due' : ''}>₹{balance.toLocaleString('en-IN')}</strong></span>
                        </div>
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                          <button className="btn btn-outline" onClick={() => openInstallmentModal(p.id)}><Plus size={14} /> Add Installment</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===== INVOICES ===== */}
        <div className="cd-section">
          <div className="cd-section-header">
            <h3><FileText size={18} /> Invoices ({invoices.length})</h3>
            <button className="btn btn-primary" onClick={() => openInvoiceModal()}><Plus size={14} /> Add Invoice</button>
          </div>
          {invoices.length === 0 ? (
            <div className="cd-empty"><FileText size={32} /><h4>No invoices yet</h4><p>Click "Add Invoice" to create one</p></div>
          ) : (
            <table className="cd-mini-table">
              <thead><tr><th>#</th><th>Invoice No</th><th>To</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td>{inv.toName}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{inv.total?.toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inv.date}</td>
                    <td>
                      <div className="cd-actions-cell">
                        <button className="cd-action-btn view" title="View" onClick={() => { setViewInvoice(inv); setPrintMode(false); }}><Eye size={14} /></button>
                        <button className="cd-action-btn print" title="Print" onClick={() => handlePrint(inv)}><Printer size={14} /></button>
                        <button className="cd-action-btn edit" title="Edit" onClick={() => openInvoiceModal(inv)}><Pencil size={14} /></button>
                        <button className="cd-action-btn delete" title="Delete" onClick={() => setDeleteConfirm({ type: 'invoice', id: inv.id, label: 'Invoice', name: inv.invoiceNumber })}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ========== MODALS ========== */}

        {/* Work Modal */}
        {showWorkModal && (
          <div className="modal-overlay" onClick={() => setShowWorkModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h2>{editingWork ? <Pencil size={20} /> : <Plus size={20} />} {editingWork ? 'Edit Work' : 'Add Work'}</h2>
                <button className="modal-close-btn" onClick={() => setShowWorkModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-row single"><div className="form-group">
                  <label className="form-label">Work Name <span className="required">*</span></label>
                  <input className="form-input" placeholder="Enter work name" value={workForm.workName} onChange={e => setWorkForm(p => ({ ...p, workName: e.target.value }))} />
                </div></div>
                <div className="form-row single"><div className="form-group">
                  <label className="form-label">Service <span className="required">*</span></label>
                  <select className="form-select" value={workForm.service} onChange={e => setWorkForm(p => ({ ...p, service: e.target.value }))}>
                    <option value="">Select service</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div></div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowWorkModal(false)}>Cancel</button>
                <button className="btn-save" onClick={saveWork} disabled={savingWork}>
                  {savingWork ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingWork ? 'Update' : 'Save'}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h2>{editingPayment ? <Pencil size={20} /> : <Plus size={20} />} {editingPayment ? 'Edit Payment' : 'Add Payment'}</h2>
                <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-row single"><div className="form-group">
                  <label className="form-label">Select Work <span className="required">*</span></label>
                  <select className="form-select" value={paymentForm.workId} onChange={e => setPaymentForm(p => ({ ...p, workId: e.target.value }))}>
                    <option value="">Select work</option>
                    {works.map(w => <option key={w.id} value={w.id}>{w.workName} ({w.service})</option>)}
                  </select>
                </div></div>
                <div className="form-row single"><div className="form-group">
                  <label className="form-label">Total Amount <span className="required">*</span></label>
                  <input type="number" className="form-input" placeholder="Enter total amount" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} />
                </div></div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button className="btn-save" onClick={savePayment} disabled={savingPayment}>
                  {savingPayment ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingPayment ? 'Update' : 'Save'}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Installment Modal */}
        {showInstallmentModal && (
          <div className="modal-overlay" onClick={() => setShowInstallmentModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h2>{editingInstallment ? <Pencil size={20} /> : <Plus size={20} />} {editingInstallment ? 'Edit Installment' : 'Add Installment'}</h2>
                <button className="modal-close-btn" onClick={() => setShowInstallmentModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-row single"><div className="form-group">
                  <label className="form-label">Amount <span className="required">*</span></label>
                  <input type="number" className="form-input" placeholder="Enter amount" value={installmentForm.amount} onChange={e => setInstallmentForm(p => ({ ...p, amount: e.target.value }))} />
                </div></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date</label>
                    <input type="date" className="form-input" value={installmentForm.date} onChange={e => setInstallmentForm(p => ({ ...p, date: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Time</label>
                    <input type="time" className="form-input" value={installmentForm.time} onChange={e => setInstallmentForm(p => ({ ...p, time: e.target.value }))} /></div>
                </div>
                <div className="form-row single"><div className="form-group">
                  <label className="form-label">Mode of Payment</label>
                  <select className="form-select" value={installmentForm.mode} onChange={e => setInstallmentForm(p => ({ ...p, mode: e.target.value }))}>
                    <option value="">Select mode</option>
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div></div>
                <div className="form-row single"><div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-textarea" rows={2} placeholder="Any remarks..." value={installmentForm.remarks} onChange={e => setInstallmentForm(p => ({ ...p, remarks: e.target.value }))} />
                </div></div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowInstallmentModal(false)}>Cancel</button>
                <button className="btn-save" onClick={saveInstallment} disabled={savingInstallment}>
                  {savingInstallment ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingInstallment ? 'Update' : 'Save'}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoiceModal && (
          <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '95vh' }}>
              <div className="modal-header">
                <h2>{editingInvoice ? <Pencil size={20} /> : <Plus size={20} />} {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
                <button className="modal-close-btn" onClick={() => setShowInvoiceModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-section-title">From (Your Business)</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Business Name</label>
                    <input className="form-input" value={invoiceForm.fromName} onChange={e => setInvoiceForm(p => ({ ...p, fromName: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={invoiceForm.fromPhone} onChange={e => setInvoiceForm(p => ({ ...p, fromPhone: e.target.value }))} /></div>
                </div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Address</label>
                  <input className="form-input" value={invoiceForm.fromAddress} onChange={e => setInvoiceForm(p => ({ ...p, fromAddress: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Referred By</label>
                    <input className="form-input" placeholder="Enter referred by" value={invoiceForm.referredBy} onChange={e => setInvoiceForm(p => ({ ...p, referredBy: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Technician</label>
                    <input className="form-input" placeholder="Enter technician name" value={invoiceForm.technician} onChange={e => setInvoiceForm(p => ({ ...p, technician: e.target.value }))} /></div>
                </div>

                <div className="form-section-title">To (Customer)</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Customer Name</label>
                    <input className="form-input" value={invoiceForm.toName} onChange={e => setInvoiceForm(p => ({ ...p, toName: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={invoiceForm.toPhone} onChange={e => setInvoiceForm(p => ({ ...p, toPhone: e.target.value }))} /></div>
                </div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Address</label>
                  <input className="form-input" value={invoiceForm.toAddress} onChange={e => setInvoiceForm(p => ({ ...p, toAddress: e.target.value }))} /></div>
                </div>

                <div className="form-section-title">Items</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="cd-invoice-items-table">
                    <thead><tr><th>Sl.No</th><th>Description</th><th>Width</th><th>Height</th><th>Sq.Feet</th><th>Amount</th><th>Subtotal</th><th></th></tr></thead>
                    <tbody>
                      {invoiceForm.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td><input className="form-input" placeholder="Description" value={item.description} onChange={e => updateInvoiceItem(idx, 'description', e.target.value)} /></td>
                          <td><input type="number" className="form-input" placeholder="W" value={item.width} onChange={e => updateInvoiceItem(idx, 'width', e.target.value)} style={{ width: 70 }} /></td>
                          <td><input type="number" className="form-input" placeholder="H" value={item.height} onChange={e => updateInvoiceItem(idx, 'height', e.target.value)} style={{ width: 70 }} /></td>
                          <td style={{ fontWeight: 600 }}>{item.sqft || 0}</td>
                          <td><input type="number" className="form-input" placeholder="Amt" value={item.amount} onChange={e => updateInvoiceItem(idx, 'amount', e.target.value)} style={{ width: 80 }} /></td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{(item.subtotal || 0).toLocaleString('en-IN')}</td>
                          <td><button className="cd-remove-item" onClick={() => removeInvoiceItem(idx)}><X size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="cd-add-item-btn" onClick={addInvoiceItem}><Plus size={14} /> Add Item</button>

                <div className="form-section-title">Order Summary</div>
                <div className="cd-invoice-summary">
                  <table className="cd-invoice-summary-table">
                    <tbody>
                      <tr><td>Subtotal</td><td>₹{invoiceSubtotal.toLocaleString('en-IN')}</td></tr>
                      <tr><td>Transportation</td><td>
                        <input type="number" className="form-input" style={{ width: 120, padding: '6px 10px', fontSize: '0.82rem', textAlign: 'right' }} placeholder="0" value={invoiceForm.transportation} onChange={e => setInvoiceForm(p => ({ ...p, transportation: e.target.value }))} />
                      </td></tr>
                      <tr><td>Discount</td><td>
                        <input type="number" className="form-input" style={{ width: 120, padding: '6px 10px', fontSize: '0.82rem', textAlign: 'right' }} placeholder="0" value={invoiceForm.discount} onChange={e => setInvoiceForm(p => ({ ...p, discount: e.target.value }))} />
                      </td></tr>
                      <tr className="total"><td>Total</td><td>₹{invoiceTotal.toLocaleString('en-IN')}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="form-section-title">Additional</div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Terms & Conditions</label>
                  <textarea className="form-textarea" rows={2} placeholder="Enter terms..." value={invoiceForm.terms} onChange={e => setInvoiceForm(p => ({ ...p, terms: e.target.value }))} /></div>
                </div>
                <div className="form-row single"><div className="form-group"><label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} placeholder="Any notes..." value={invoiceForm.notes} onChange={e => setInvoiceForm(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                <button className="btn-save" onClick={saveInvoice} disabled={savingInvoice}>
                  {savingInvoice ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingInvoice ? 'Update Invoice' : 'Save Invoice'}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice View Modal */}
        {viewInvoice && !printMode && (
          <div className="modal-overlay" onClick={() => setViewInvoice(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 850, maxHeight: '95vh' }}>
              <div className="modal-header">
                <h2><Eye size={20} /> Invoice Preview</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" onClick={() => handlePrint(viewInvoice)}><Printer size={14} /> Print</button>
                  <button className="modal-close-btn" onClick={() => setViewInvoice(null)}><X size={18} /></button>
                </div>
              </div>
              <div className="modal-body">
                <InvoicePreview inv={viewInvoice} />
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="delete-modal" onClick={e => e.stopPropagation()}>
              <div className="delete-modal-icon"><AlertTriangle size={32} /></div>
              <h3>Delete {deleteConfirm.label}</h3>
              <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.</p>
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
