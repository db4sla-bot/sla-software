import { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Download, Search, X, Save, Check,
  CalendarClock, Pencil, Trash2, Filter,
  TrendingUp, UserCheck, UserX, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar, UserPlus
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import '../CSS/Leads.css';

/* ===== CONSTANTS ===== */
const SERVICES = ['Invisible Grills', 'Mosquito Mesh', 'Cloth Hangers'];

const SOURCES = [
  'Google Listing',
  'JustDial',
  'Marketers',
  'Digital Marketing',
  'Offline Marketing',
  'Reference',
  'Others',
];

const SUBSOURCE_MAP = {
  'Digital Marketing': ['Instagram Ads', 'Facebook Ads', 'Google Ads', 'Whatsapp Business', 'Way2News'],
  'Offline Marketing': ['Cafe', 'Exhibition', 'Bike Tags', 'Pamphlets', 'Pole Boards', 'No Parking'],
  'Reference': ['Interiors', 'Builders', 'Engineers', 'Customer', 'Self'],
};

const STATUSES = [
  'Just an Enquiry', 'Positive Lead', 'Future Requirement',
  'Out of Station', 'Other Products', 'Not Interested', 'Others',
];

const SUB_STATUSES = [
  'Site Visit', 'Quotation', 'Followup', 'Awaiting for Response',
  'Confirmed', 'Dropped', 'Closed', 'Others',
];

const ITEMS_PER_PAGE = 32;

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

const INITIAL_FORM = {
  customerName: '', phoneNumber: '', address: '', services: [],
  source: '', subSource: '', otherSource: '',
  status: '', subStatus: '', otherStatus: '', otherSubStatus: '',
  followUpDate: '', followUpTime: '',
};

const INITIAL_FILTERS = {
  service: '', source: '', subSource: '', status: '', subStatus: '',
};

/* ===== DATE HELPERS ===== */
function getDateRange(preset) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();

  switch (preset) {
    case 'today':
      return { from: new Date(y, m, d), to: new Date(y, m, d, 23, 59, 59, 999) };
    case 'yesterday': {
      const yd = new Date(y, m, d - 1);
      return { from: yd, to: new Date(yd.getFullYear(), yd.getMonth(), yd.getDate(), 23, 59, 59, 999) };
    }
    case 'this_month':
      return { from: new Date(y, m, 1), to: new Date(y, m, d, 23, 59, 59, 999) };
    case 'last_month':
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59, 999) };
    case 'this_year':
      return { from: new Date(y, 0, 1), to: new Date(y, m, d, 23, 59, 59, 999) };
    case 'last_year':
      return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31, 23, 59, 59, 999) };
    case 'all':
      return { from: null, to: null };
    default:
      return { from: null, to: null };
  }
}

function toLocalDateStr(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStatusClass(status) {
  switch (status) {
    case 'Just an Enquiry': return 'enquiry';
    case 'Positive Lead': return 'positive';
    case 'Future Requirement': return 'future';
    case 'Not Interested': return 'not-interested';
    case 'Out of Station': return 'out-of-station';
    case 'Other Products': return 'other-products';
    default: return 'others';
  }
}

/* =============================
   LEADS PAGE
   ============================= */
export default function Leads() {
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Convert confirm
  const [convertConfirm, setConvertConfirm] = useState(null);
  const [converting, setConverting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // Date filter state
  const [datePreset, setDatePreset] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  /* ---- Fetch Leads ---- */
  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setLeads(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---- Toast ---- */
  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Form handlers ---- */
  const handleChange = (field, value) => {
    setForm((prev) => {
      const u = { ...prev, [field]: value };
      if (field === 'source') { u.subSource = ''; u.otherSource = ''; }
      if (field === 'status') { u.subStatus = ''; u.otherStatus = ''; u.otherSubStatus = ''; }
      if (field === 'subStatus') { u.otherSubStatus = ''; }
      return u;
    });
  };

  const toggleService = (svc) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter((s) => s !== svc)
        : [...prev.services, svc],
    }));
  };

  /* ---- Open Modal ---- */
  const openAddModal = () => { setEditingLead(null); setForm({ ...INITIAL_FORM }); setShowModal(true); };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    const isKnownSource = SOURCES.includes(lead.source);
    const isKnownStatus = STATUSES.includes(lead.status);
    const isKnownSubStatus = SUB_STATUSES.includes(lead.subStatus);
    let originalSourceKey = lead.source;
    if (lead.subSource) {
      for (const [key, values] of Object.entries(SUBSOURCE_MAP)) {
        if (values.includes(lead.subSource)) { originalSourceKey = key; break; }
      }
    }
    setForm({
      customerName: lead.customerName || '', phoneNumber: lead.phoneNumber || '',
      address: lead.address || '', services: lead.services || [],
      source: isKnownSource ? lead.source : (lead.subSource ? originalSourceKey : 'Others'),
      subSource: lead.subSource || '',
      otherSource: isKnownSource ? '' : (lead.source || ''),
      status: isKnownStatus ? lead.status : 'Others',
      subStatus: lead.status === 'Positive Lead' ? (isKnownSubStatus ? (lead.subStatus || '') : 'Others') : '',
      otherStatus: isKnownStatus ? '' : (lead.status || ''),
      otherSubStatus: (lead.status === 'Positive Lead' && !isKnownSubStatus && lead.subStatus) ? lead.subStatus : '',
      followUpDate: lead.followUpDate || '', followUpTime: lead.followUpTime || '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingLead(null); };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!form.customerName.trim() || !form.phoneNumber.trim()) {
      showToast('Please fill customer name and phone number', 'error'); return;
    }
    if (form.services.length === 0) {
      showToast('Please select at least one service', 'error'); return;
    }
    try {
      setSaving(true);
      const ld = {
        customerName: form.customerName.trim(), phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(), services: form.services,
        source: form.source === 'Others' ? form.otherSource.trim() : form.source,
        subSource: form.subSource,
        status: form.status === 'Others' ? form.otherStatus.trim() : form.status,
        subStatus: form.status === 'Positive Lead'
          ? (form.subStatus === 'Others' ? form.otherSubStatus.trim() : form.subStatus) : '',
        followUpDate: form.followUpDate, followUpTime: form.followUpTime,
      };
      if (editingLead) {
        ld.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'leads', editingLead.id), ld);
        showToast('Lead updated successfully!');
      } else {
        ld.createdAt = serverTimestamp();
        ld.isConverted = false; // By default not converted
        await addDoc(collection(db, 'leads'), ld);
        showToast('Lead added successfully!');
      }
      closeModal(); fetchLeads();
    } catch (err) {
      console.error('Error saving lead:', err);
      showToast('Failed to save lead. Please try again.', 'error');
    } finally { setSaving(false); }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'leads', id));
      showToast('Lead deleted successfully!');
      setDeleteConfirm(null); fetchLeads();
    } catch (err) {
      console.error('Error deleting lead:', err);
      showToast('Failed to delete lead.', 'error');
    } finally { setDeleting(false); }
  };

  /* ---- Convert ---- */
  const handleConvert = async (lead) => {
    try {
      setConverting(true);
      const customerData = {
        customerName: lead.customerName,
        mobileNumber: lead.phoneNumber,
        address: lead.address || '',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'customers'), customerData);

      await updateDoc(doc(db, 'leads', lead.id), {
        isConverted: true,
        updatedAt: serverTimestamp()
      });

      showToast('Lead successfully converted to Customer!');
      setConvertConfirm(null);
      fetchLeads();
    } catch (err) {
      console.error('Error converting lead:', err);
      showToast('Failed to convert lead. Please try again.', 'error');
    } finally {
      setConverting(false);
    }
  };

  /* ---- Filter Handlers ---- */
  const handleFilterChange = (f, v) => setFilters((p) => ({ ...p, [f]: v }));
  const clearFilters = () => { setFilters({ ...INITIAL_FILTERS }); };
  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  /* ---- Date Preset Handler ---- */
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    if (preset !== 'custom') { setCustomFrom(''); setCustomTo(''); }
  };

  /* ---- Computed: Date Range ---- */
  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00') : null,
        to: customTo ? new Date(customTo + 'T23:59:59.999') : null,
      };
    }
    return getDateRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  /* ---- Computed: Filtered Leads ---- */
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Text search
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (!(lead.customerName?.toLowerCase().includes(t) ||
          lead.phoneNumber?.includes(t) ||
          lead.source?.toLowerCase().includes(t) ||
          lead.status?.toLowerCase().includes(t))) return false;
      }
      // Dropdown filters
      if (filters.service && !lead.services?.includes(filters.service)) return false;
      if (filters.source && lead.source !== filters.source) return false;
      if (filters.subSource && lead.subSource !== filters.subSource) return false;
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.subStatus && lead.subStatus !== filters.subStatus) return false;

      // Date filter
      if (dateRange.from || dateRange.to) {
        const createdAt = lead.createdAt?.toDate ? lead.createdAt.toDate() : (lead.createdAt ? new Date(lead.createdAt) : null);
        if (!createdAt) return false;
        if (dateRange.from && createdAt < dateRange.from) return false;
        if (dateRange.to && createdAt > dateRange.to) return false;
      }

      return true;
    });
  }, [leads, searchTerm, filters, dateRange]);

  /* ---- Computed: Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filters, datePreset, customFrom, customTo]);

  const statCounts = {
    total: filteredLeads.length,
    positive: filteredLeads.filter((l) => l.status === 'Positive Lead').length,
    enquiry: filteredLeads.filter((l) => l.status === 'Just an Enquiry').length,
    notInterested: filteredLeads.filter((l) => l.status === 'Not Interested').length,
  };

  const availableSubSources = [...new Set(leads.map((l) => l.subSource).filter(Boolean))];
  const availableSubStatuses = [...new Set(leads.map((l) => l.subStatus).filter(Boolean))];

  const hasSubSource = SUBSOURCE_MAP[form.source];
  const showOtherSource = form.source === 'Others';
  const showSubStatus = form.status === 'Positive Lead';
  const showOtherStatus = form.status === 'Others';
  const showOtherSubStatus = form.subStatus === 'Others';

  /* ==================
     RENDER
     ================== */
  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Manage and track your potential customers</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline"><Download size={16} /> Export</button>
          <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> Add Lead</button>
        </div>
      </div>

      {/* Date Preset Chips */}
      <div className="date-filter-bar">
        <div className="date-filter-left">
          <Calendar size={16} className="date-filter-icon" />
          <div className="date-preset-chips">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                className={`date-chip ${datePreset === p.value ? 'active' : ''}`}
                onClick={() => handleDatePresetChange(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {datePreset === 'custom' && (
          <div className="date-custom-range">
            <div className="date-custom-field">
              <label>From</label>
              <input type="date" className="form-input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="date-custom-field">
              <label>To</label>
              <input type="date" className="form-input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="leads-stats-bar">
        <div className="leads-stat-card">
          <div className="leads-stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}><Users size={22} /></div>
          <div className="leads-stat-info"><h4>{statCounts.total}</h4><p>Total Leads</p></div>
        </div>
        <div className="leads-stat-card">
          <div className="leads-stat-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}><TrendingUp size={22} /></div>
          <div className="leads-stat-info"><h4>{statCounts.positive}</h4><p>Positive Leads</p></div>
        </div>
        <div className="leads-stat-card">
          <div className="leads-stat-icon" style={{ background: 'rgba(116,185,255,0.1)', color: '#2e86de' }}><UserCheck size={22} /></div>
          <div className="leads-stat-info"><h4>{statCounts.enquiry}</h4><p>Enquiries</p></div>
        </div>
        <div className="leads-stat-card">
          <div className="leads-stat-icon" style={{ background: 'rgba(225,112,85,0.1)', color: '#e17055' }}><UserX size={22} /></div>
          <div className="leads-stat-info"><h4>{statCounts.notInterested}</h4><p>Not Interested</p></div>
        </div>
      </div>

      {/* Table Card */}
      <div className="leads-table-card">
        <div className="leads-table-header">
          <h3>All Leads ({filteredLeads.length})</h3>
          <div className="leads-filters">
            <div className="leads-filter-input">
              <Search size={15} color="var(--text-muted)" />
              <input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button className={`btn btn-outline filter-toggle-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={15} /> Filters
              {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="leads-filter-bar">
            <div className="filter-row">
              <div className="filter-group">
                <label className="filter-label">Service</label>
                <select className="filter-select" value={filters.service} onChange={(e) => handleFilterChange('service', e.target.value)}>
                  <option value="">All Services</option>
                  {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Source</label>
                <select className="filter-select" value={filters.source} onChange={(e) => handleFilterChange('source', e.target.value)}>
                  <option value="">All Sources</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Sub Source</label>
                <select className="filter-select" value={filters.subSource} onChange={(e) => handleFilterChange('subSource', e.target.value)}>
                  <option value="">All Sub Sources</option>
                  {availableSubSources.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select className="filter-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <option value="">All Statuses</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Sub Status</label>
                <select className="filter-select" value={filters.subStatus} onChange={(e) => handleFilterChange('subStatus', e.target.value)}>
                  <option value="">All Sub Statuses</option>
                  {availableSubStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-group filter-actions">
                <button className="btn-clear-filters" onClick={clearFilters}><X size={14} /> Clear All</button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="leads-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>#</th><th>Customer</th><th>Phone</th><th>Services</th>
                <th>Source</th><th>Status</th><th>Follow Up</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="leads-empty-row"><td colSpan="8">
                  <div className="leads-empty-content">
                    <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: '28px', height: '28px' }} />
                    <p>Loading leads...</p>
                  </div>
                </td></tr>
              ) : paginatedLeads.length === 0 ? (
                <tr className="leads-empty-row"><td colSpan="8">
                  <div className="leads-empty-content">
                    <Users size={40} />
                    <h4>{searchTerm || activeFilterCount || datePreset !== 'all' ? 'No matching leads found' : 'No leads yet'}</h4>
                    <p>{searchTerm || activeFilterCount || datePreset !== 'all' ? 'Try adjusting your search, filters, or date range' : 'Click "Add Lead" to add your first lead'}</p>
                  </div>
                </td></tr>
              ) : (
                paginatedLeads.map((lead, idx) => (
                  <tr key={lead.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td><span className="lead-name">{lead.customerName}</span></td>
                    <td><span className="lead-phone">{lead.phoneNumber}</span></td>
                    <td>
                      <div className="lead-services">
                        {lead.services?.map((s) => <span key={s} className="lead-service-tag">{s}</span>)}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {lead.source}
                      {lead.subSource && <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lead.subSource}</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(lead.status)}`}>{lead.status || '—'}</span>
                      {lead.subStatus && <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>{lead.subStatus}</span>}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {lead.followUpDate ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarClock size={13} />{lead.followUpDate}{lead.followUpTime && ` ${lead.followUpTime}`}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="lead-actions" style={{ gap: '8px' }}>
                        {lead.isConverted ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,184,148,0.1)', color: '#00b894', padding: '4px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            <Check size={12} /> Converted
                          </div>
                        ) : (
                          <>
                            <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.7rem', height: '30px' }} title="Convert to Customer" onClick={() => setConvertConfirm(lead)}>
                              <UserPlus size={14} /> Convert
                            </button>
                            <button className="lead-action-btn edit-btn" title="Edit" onClick={() => openEditModal(lead)}><Pencil size={15} /></button>
                          </>
                        )}
                        <button className="lead-action-btn delete-btn" title="Delete" onClick={() => setDeleteConfirm(lead)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLeads.length > ITEMS_PER_PAGE && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length} leads
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                <ChevronsLeft size={16} />
              </button>
              <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
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
                    <span key={`dots-${i}`} className="pagination-dots">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`pagination-btn page-num ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight size={16} />
              </button>
              <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============ ADD / EDIT LEAD MODAL ============ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLead ? <Pencil size={20} /> : <Plus size={20} />}{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">Customer Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Customer Name <span className="required">*</span></label>
                  <input type="text" className="form-input" placeholder="Enter customer name" value={form.customerName} onChange={(e) => handleChange('customerName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number <span className="required">*</span></label>
                  <input type="tel" className="form-input" placeholder="Enter phone number" value={form.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} />
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea className="form-textarea" placeholder="Enter address" rows={2} value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
                </div>
              </div>
              <div className="form-section-title">Required Services</div>
              <div className="form-row single" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Select Services <span className="required">*</span></label>
                  <div className="multi-select-wrap">
                    {SERVICES.map((svc) => (
                      <div key={svc} className={`multi-select-chip ${form.services.includes(svc) ? 'selected' : ''}`} onClick={() => toggleService(svc)}>
                        <div className="chip-check">{form.services.includes(svc) && <Check size={12} />}</div>{svc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-section-title">Lead Source</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select className="form-select" value={form.source} onChange={(e) => handleChange('source', e.target.value)}>
                    <option value="">Select source</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {hasSubSource && (
                  <div className="form-group">
                    <label className="form-label">Sub Source</label>
                    <select className="form-select" value={form.subSource} onChange={(e) => handleChange('subSource', e.target.value)}>
                      <option value="">Select sub source</option>
                      {SUBSOURCE_MAP[form.source].map((ss) => <option key={ss} value={ss}>{ss}</option>)}
                    </select>
                  </div>
                )}
                {showOtherSource && (
                  <div className="form-group">
                    <label className="form-label">Specify Source</label>
                    <input type="text" className="form-input" placeholder="Enter source name" value={form.otherSource} onChange={(e) => handleChange('otherSource', e.target.value)} />
                  </div>
                )}
              </div>
              <div className="form-section-title">Lead Status</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                    <option value="">Select status</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {showSubStatus && (
                  <div className="form-group">
                    <label className="form-label">Sub Status</label>
                    <select className="form-select" value={form.subStatus} onChange={(e) => handleChange('subStatus', e.target.value)}>
                      <option value="">Select sub status</option>
                      {SUB_STATUSES.map((ss) => <option key={ss} value={ss}>{ss}</option>)}
                    </select>
                  </div>
                )}
                {showOtherStatus && (
                  <div className="form-group">
                    <label className="form-label">Specify Status</label>
                    <input type="text" className="form-input" placeholder="Enter status" value={form.otherStatus} onChange={(e) => handleChange('otherStatus', e.target.value)} />
                  </div>
                )}
              </div>
              {showOtherSubStatus && (
                <div className="form-row single">
                  <div className="form-group">
                    <label className="form-label">Specify Sub Status</label>
                    <input type="text" className="form-input" placeholder="Enter sub status" value={form.otherSubStatus} onChange={(e) => handleChange('otherSubStatus', e.target.value)} />
                  </div>
                </div>
              )}
              <div className="form-section-title">Follow Up</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Follow Up Date</label>
                  <input type="date" className="form-input" value={form.followUpDate} onChange={(e) => handleChange('followUpDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Follow Up Time</label>
                  <input type="time" className="form-input" value={form.followUpTime} onChange={(e) => handleChange('followUpTime', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? (<><div className="spinner" /> Saving...</>) : (<><Save size={16} /> {editingLead ? 'Update Lead' : 'Save Lead'}</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CONVERT CONFIRMATION ============ */}
      {convertConfirm && (
        <div className="modal-overlay" onClick={() => setConvertConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon" style={{ background: 'rgba(9, 132, 227, 0.1)', color: '#0984e3' }}><UserPlus size={32} /></div>
            <h3>Convert to Customer</h3>
            <p>Are you sure you want to convert <strong>{convertConfirm.customerName}</strong> into a verified Customer?</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setConvertConfirm(null)}>Cancel</button>
              <button className="btn-save" onClick={() => handleConvert(convertConfirm)} disabled={converting}>
                {converting ? (<><div className="spinner" /> Converting...</>) : (<><UserPlus size={16} /> Convert</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION ============ */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon"><AlertTriangle size={32} /></div>
            <h3>Delete Lead</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.customerName}</strong>? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-delete" onClick={() => handleDelete(deleteConfirm.id)} disabled={deleting}>
                {deleting ? (<><div className="spinner" /> Deleting...</>) : (<><Trash2 size={16} /> Delete</>)}
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
