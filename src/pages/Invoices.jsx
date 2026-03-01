import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Eye, Printer, Calendar, CalendarClock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download
} from 'lucide-react';
import { db } from '../firebase.js';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import '../css/Invoices.css';

const ITEMS_PER_PAGE = 32;

const DATE_PRESETS = ['Today', 'Yesterday', 'This Month', 'Last Month', 'This Year', 'Last Year', 'All Time'];

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

/* ===== Invoice Preview Component ===== */
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
        <tr className="cd-inv-total-row"><td colSpan="6" style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem' }}>Total</td><td style={{ fontWeight: 800, fontSize: '1rem', color: '#6c5ce7' }}>₹{(inv.total || 0).toLocaleString('en-IN')}</td></tr>
      </tfoot>
    </table>
    {inv.terms && <div className="cd-inv-notes"><h4>Terms & Conditions</h4><p>{inv.terms}</p></div>}
    {inv.notes && <div className="cd-inv-notes"><h4>Notes</h4><p>{inv.notes}</p></div>}
  </div>
);

export default function Invoices() {
  const navigate = useNavigate();
  const [allInvoices, setAllInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [datePreset, setDatePreset] = useState('Today');

  // Print
  const [printInvoice, setPrintInvoice] = useState(null);
  const [printMode, setPrintMode] = useState(false);

  /* ---- Fetch all customers + their invoices ---- */
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      // Fetch customers
      const custSnap = await getDocs(query(collection(db, 'customers'), orderBy('createdAt', 'desc')));
      const custList = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCustomers(custList);

      // Fetch invoices from each customer
      const invoices = [];
      for (const cust of custList) {
        const invSnap = await getDocs(query(collection(db, 'customers', cust.id, 'invoices'), orderBy('createdAt', 'desc')));
        for (const d of invSnap.docs) {
          invoices.push({
            id: d.id,
            customerId: cust.id,
            customerName: cust.customerName,
            customerPhone: cust.mobileNumber,
            ...d.data()
          });
        }
      }
      // Sort all by createdAt desc
      invoices.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return db2 - da;
      });
      setAllInvoices(invoices);
    } catch (err) { console.error('Error fetching invoices:', err); }
    finally { setLoading(false); }
  };

  /* ---- Filter ---- */
  const filtered = useMemo(() => {
    let list = allInvoices;

    // Date filter
    if (datePreset !== 'All Time') {
      const range = getDateRange(datePreset);
      if (range) {
        list = list.filter(inv => {
          if (!inv.createdAt) return false;
          const d = inv.createdAt.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt);
          return d >= range.start && d <= range.end;
        });
      }
    }

    // Customer filter
    if (filterCustomer) {
      list = list.filter(inv => inv.customerId === filterCustomer);
    }

    // Search
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(t) ||
        inv.toName?.toLowerCase().includes(t) ||
        inv.customerName?.toLowerCase().includes(t)
      );
    }

    return list;
  }, [allInvoices, searchTerm, filterCustomer, datePreset]);

  const totalAmount = filtered.reduce((s, inv) => s + (inv.total || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCustomer, datePreset]);

  /* ---- Print ---- */
  const handlePrint = (inv) => {
    setPrintInvoice(inv);
    setPrintMode(true);
  };

  useEffect(() => {
    if (printMode && printInvoice) {
      const timer = setTimeout(() => { window.print(); setPrintMode(false); }, 400);
      return () => clearTimeout(timer);
    }
  }, [printMode, printInvoice]);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      {/* Print-only */}
      {printInvoice && (
        <div className="inv-print-only">
          <InvoicePreview inv={printInvoice} />
        </div>
      )}

      <div className="page inv-no-print">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">All customer invoices in one place</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-outline"><Download size={16} /> Export</button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="invoices-date-bar">
          <Calendar size={16} color="var(--text-muted)" />
          <div className="invoices-date-chips">
            {DATE_PRESETS.map(p => (
              <button key={p} className={`inv-date-chip ${datePreset === p ? 'active' : ''}`} onClick={() => setDatePreset(p)}>{p}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="invoices-stats-bar">
          <div className="invoices-stat-card">
            <div className="invoices-stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}>
              <FileText size={22} />
            </div>
            <div className="invoices-stat-info">
              <h4>{filtered.length}</h4>
              <p>Total Invoices</p>
            </div>
          </div>
          <div className="invoices-stat-card">
            <div className="invoices-stat-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}>
              <FileText size={22} />
            </div>
            <div className="invoices-stat-info">
              <h4>₹{totalAmount.toLocaleString('en-IN')}</h4>
              <p>Total Amount</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="invoices-table-card">
          <div className="invoices-table-header">
            <h3>All Invoices ({filtered.length})</h3>
            <div className="invoices-header-right">
              <select className="invoices-filter-select" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
                <option value="">All Customers</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.customerName}</option>)}
              </select>
              <div className="invoices-search">
                <Search size={15} color="var(--text-muted)" />
                <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="invoices-table-wrap">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>To</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="invoices-empty-row">
                    <td colSpan="7">
                      <div className="invoices-empty-content">
                        <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 28, height: 28 }} />
                        <p>Loading invoices...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr className="invoices-empty-row">
                    <td colSpan="7">
                      <div className="invoices-empty-content">
                        <FileText size={40} />
                        <h4>{searchTerm || filterCustomer ? 'No matching invoices' : 'No invoices yet'}</h4>
                        <p>{searchTerm || filterCustomer ? 'Try adjusting your search or filters' : 'Create invoices from individual customer pages'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((inv, idx) => (
                    <tr key={`${inv.customerId}-${inv.id}`}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                      <td style={{ fontSize: '0.82rem' }}>{inv.customerName}</td>
                      <td>{inv.toName}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{inv.total?.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CalendarClock size={13} />{inv.date || formatDate(inv.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div className="invoice-actions">
                          <button className="invoice-action-btn view-btn" title="View Customer" onClick={() => navigate(`/customer/${inv.customerId}`)}><Eye size={15} /></button>
                          <button className="invoice-action-btn print-btn" title="Print" onClick={() => handlePrint(inv)}><Printer size={15} /></button>
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
            <div className="invoices-pagination">
              <div className="invoices-pagination-info">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} invoices
              </div>
              <div className="invoices-pagination-controls">
                <button className="ipag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft size={16} /></button>
                <button className="ipag-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                  .map((p, i) => p === '...'
                    ? <span key={`d-${i}`} className="ipag-dots">…</span>
                    : <button key={p} className={`ipag-btn page-num ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                  )}
                <button className="ipag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
                <button className="ipag-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
