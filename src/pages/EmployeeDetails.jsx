import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, MapPin, CalendarClock, Pencil, Trash2,
  Plus, Save, X, Check, Eye, EyeOff, Shield, KeyRound,
  FileImage, CreditCard, ChevronDown, ChevronUp, AlertTriangle,
  Upload, Image as ImageIcon, IdCard, Car
} from 'lucide-react';
import { db } from '../firebase.js';
import {
  doc, getDoc, updateDoc, collection, addDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { IMAGEKIT_CONFIG } from '../imagekit.js';
import '../css/EmployeeDetails.css';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'];

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

const ROLE_OPTIONS = ['Admin', 'Manager', 'Staff', 'Technician', 'Sales Executive', 'Accountant'];
const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'access', label: 'Access', icon: Shield },
  { key: 'documents', label: 'Documents', icon: FileImage },
  { key: 'advance', label: 'Advance', icon: CreditCard },
];

const DOC_TYPES = [
  { key: 'profilePhoto', label: 'Profile Photo', icon: ImageIcon, required: false },
  { key: 'aadhaarCard', label: 'Aadhaar Card', icon: IdCard, required: true },
  { key: 'panCard', label: 'PAN Card', icon: IdCard, required: false },
  { key: 'license', label: 'License', icon: Car, required: false },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fdcb6e', '#00cec9'];
function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Upload to ImageKit using Basic Auth with private key
async function uploadToImageKit(file, folder) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  formData.append('folder', folder);

  // Basic Auth: base64(privateKey:)
  const authString = btoa(IMAGEKIT_CONFIG.privateKey + ':');

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${authString}` },
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('ImageKit error:', errData);
    throw new Error(errData.message || 'Upload failed');
  }
  return await res.json();
}

export default function EmployeeDetails() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState(null);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Access editing
  const [editingAccess, setEditingAccess] = useState(false);
  const [accessForm, setAccessForm] = useState([]);
  const [savingAccess, setSavingAccess] = useState(false);

  // Documents
  const [documents, setDocuments] = useState({});
  const [pendingFiles, setPendingFiles] = useState({}); // { key: File }
  const [savingDocs, setSavingDocs] = useState(false);

  // Advances
  const [advances, setAdvances] = useState([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '', date: '', time: '' });
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [expandedAdvance, setExpandedAdvance] = useState(null);

  // Repayments
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentAdvanceId, setRepaymentAdvanceId] = useState(null);
  const [editingRepayment, setEditingRepayment] = useState(null);
  const [repaymentForm, setRepaymentForm] = useState({ amount: '', date: '', time: '', mode: '', remarks: '' });
  const [savingRepayment, setSavingRepayment] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ========== FETCH ========== */
  const fetchEmployee = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'staff', employeeId));
      if (snap.exists()) {
        const d = { id: snap.id, ...snap.data() };
        setEmployee(d);
        setProfileForm({
          name: d.name || '', role: d.role || '', mobileNumber: d.mobileNumber || '',
          address: d.address || '', emergencyContactName: d.emergencyContactName || '',
          emergencyContactPhone: d.emergencyContactPhone || '',
          emergencyContactRelation: d.emergencyContactRelation || '',
          username: d.username || '', password: d.password || '',
          dateOfBirth: d.dateOfBirth || '', maritalStatus: d.maritalStatus || '',
        });
        setAccessForm(d.access || []);
        setDocuments(d.documents || {});
      }
    } catch (err) { console.error(err); }
  }, [employeeId]);

  const fetchAdvances = useCallback(async () => {
    try {
      const q = query(collection(db, 'staff', employeeId, 'advances'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const aList = [];
      for (const d of snap.docs) {
        const a = { id: d.id, ...d.data(), repayments: [] };
        const rq = query(collection(db, 'staff', employeeId, 'advances', d.id, 'repayments'), orderBy('createdAt', 'asc'));
        const rSnap = await getDocs(rq);
        a.repayments = rSnap.docs.map(r => ({ id: r.id, ...r.data() }));
        aList.push(a);
      }
      setAdvances(aList);
    } catch (err) { console.error(err); }
  }, [employeeId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchEmployee();
      await fetchAdvances();
      setLoading(false);
    })();
  }, [fetchEmployee, fetchAdvances]);

  /* ========== PROFILE ========== */
  const saveProfile = async () => {
    if (!profileForm.name.trim()) { showToast('Name is required', 'error'); return; }
    try {
      setSavingProfile(true);
      await updateDoc(doc(db, 'staff', employeeId), {
        name: profileForm.name.trim(), role: profileForm.role,
        mobileNumber: profileForm.mobileNumber.trim(), address: profileForm.address.trim(),
        emergencyContactName: profileForm.emergencyContactName.trim(),
        emergencyContactPhone: profileForm.emergencyContactPhone.trim(),
        emergencyContactRelation: profileForm.emergencyContactRelation.trim(),
        password: profileForm.password.trim(),
        dateOfBirth: profileForm.dateOfBirth, maritalStatus: profileForm.maritalStatus,
        updatedAt: serverTimestamp()
      });
      setEditingProfile(false);
      fetchEmployee();
      showToast('Profile updated!');
    } catch (err) { showToast('Failed to update', 'error'); }
    finally { setSavingProfile(false); }
  };

  /* ========== ACCESS ========== */
  const toggleAccess = (path) => {
    setAccessForm(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  };

  const saveAccess = async () => {
    try {
      setSavingAccess(true);
      await updateDoc(doc(db, 'staff', employeeId), { access: accessForm, updatedAt: serverTimestamp() });
      setEditingAccess(false);
      fetchEmployee();
      showToast('Access updated!');
    } catch (err) { showToast('Failed to update', 'error'); }
    finally { setSavingAccess(false); }
  };

  /* ========== DOCUMENTS ========== */
  // Choose file locally (no upload yet)
  const handleFileChoose = (docKey, file) => {
    if (!file) return;
    setPendingFiles(prev => ({ ...prev, [docKey]: file }));
  };

  // Remove a pending (not yet uploaded) file
  const removePendingFile = (docKey) => {
    setPendingFiles(prev => {
      const updated = { ...prev };
      delete updated[docKey];
      return updated;
    });
  };

  // Remove an already uploaded document
  const removeDoc = async (docKey) => {
    const updatedDocs = { ...documents };
    delete updatedDocs[docKey];
    setDocuments(updatedDocs);
    await updateDoc(doc(db, 'staff', employeeId), { documents: updatedDocs, updatedAt: serverTimestamp() });
    showToast('Document removed!');
  };

  // Save all pending files: upload to ImageKit, then store URLs in Firestore
  const saveDocuments = async () => {
    const pendingKeys = Object.keys(pendingFiles);
    if (pendingKeys.length === 0) { showToast('No new files to save', 'error'); return; }
    try {
      setSavingDocs(true);
      const safeName = (employee.name || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
      const folder = `employees/${safeName}`;
      const updatedDocs = { ...documents };
      for (const docKey of pendingKeys) {
        const file = pendingFiles[docKey];
        const result = await uploadToImageKit(file, folder);
        updatedDocs[docKey] = { url: result.url, name: result.name, fileId: result.fileId };
      }
      await updateDoc(doc(db, 'staff', employeeId), { documents: updatedDocs, updatedAt: serverTimestamp() });
      setDocuments(updatedDocs);
      setPendingFiles({});
      showToast('Documents saved successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Upload failed', 'error');
    } finally {
      setSavingDocs(false);
    }
  };

  const hasPendingFiles = Object.keys(pendingFiles).length > 0;

  /* ========== ADVANCES ========== */
  const openAdvanceModal = () => {
    const now = new Date();
    setAdvanceForm({ amount: '', reason: '', date: now.toISOString().split('T')[0], time: now.toTimeString().slice(0, 5) });
    setShowAdvanceModal(true);
  };

  const saveAdvance = async () => {
    if (!advanceForm.amount) { showToast('Enter amount', 'error'); return; }
    try {
      setSavingAdvance(true);
      await addDoc(collection(db, 'staff', employeeId, 'advances'), {
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason.trim(),
        date: advanceForm.date,
        time: advanceForm.time,
        createdAt: serverTimestamp()
      });
      setShowAdvanceModal(false);
      fetchAdvances();
      showToast('Advance added!');
    } catch (err) { showToast('Failed', 'error'); }
    finally { setSavingAdvance(false); }
  };

  /* ========== REPAYMENTS ========== */
  const openRepaymentModal = (advanceId, rep = null) => {
    setRepaymentAdvanceId(advanceId);
    setEditingRepayment(rep);
    if (rep) {
      setRepaymentForm({ amount: String(rep.amount || ''), date: rep.date || '', time: rep.time || '', mode: rep.mode || '', remarks: rep.remarks || '' });
    } else {
      const now = new Date();
      setRepaymentForm({ amount: '', date: now.toISOString().split('T')[0], time: now.toTimeString().slice(0, 5), mode: '', remarks: '' });
    }
    setShowRepaymentModal(true);
  };

  const saveRepayment = async () => {
    if (!repaymentForm.amount) { showToast('Enter amount', 'error'); return; }
    try {
      setSavingRepayment(true);
      if (editingRepayment) {
        await updateDoc(doc(db, 'staff', employeeId, 'advances', repaymentAdvanceId, 'repayments', editingRepayment.id), {
          amount: Number(repaymentForm.amount), date: repaymentForm.date, time: repaymentForm.time,
          mode: repaymentForm.mode, remarks: repaymentForm.remarks.trim(), updatedAt: serverTimestamp()
        });
        showToast('Repayment updated!');
      } else {
        const adv = advances.find(a => a.id === repaymentAdvanceId);
        const count = adv?.repayments?.length || 0;
        const label = `Installment ${count + 1}`;
        await addDoc(collection(db, 'staff', employeeId, 'advances', repaymentAdvanceId, 'repayments'), {
          label, amount: Number(repaymentForm.amount), date: repaymentForm.date, time: repaymentForm.time,
          mode: repaymentForm.mode, remarks: repaymentForm.remarks.trim(), createdAt: serverTimestamp()
        });
        showToast('Repayment added!');
      }
      setShowRepaymentModal(false);
      fetchAdvances();
    } catch (err) { showToast('Failed', 'error'); }
    finally { setSavingRepayment(false); }
  };

  /* ========== DELETE ========== */
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, parentId, label } = deleteConfirm;
    try {
      setDeleting(true);
      if (type === 'advance') await deleteDoc(doc(db, 'staff', employeeId, 'advances', id));
      else if (type === 'repayment') await deleteDoc(doc(db, 'staff', employeeId, 'advances', parentId, 'repayments', id));
      setDeleteConfirm(null);
      fetchAdvances();
      showToast(`${label} deleted!`);
    } catch (err) { showToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDob = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  // Advance totals
  const totalAdvance = advances.reduce((s, a) => s + (a.amount || 0), 0);
  const totalRepaid = advances.reduce((s, a) => s + a.repayments.reduce((rs, r) => rs + (r.amount || 0), 0), 0);
  const totalPending = totalAdvance - totalRepaid;

  /* ========== LOADING ========== */
  if (loading) return (
    <div className="page"><div className="ed-loading">
      <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 32, height: 32 }} />
      <p>Loading employee details...</p>
    </div></div>
  );

  if (!employee) return (
    <div className="page"><div className="ed-loading">
      <AlertTriangle size={40} /><h4>Employee not found</h4>
      <button className="btn btn-primary" onClick={() => navigate('/employees')}>Back to Employees</button>
    </div></div>
  );

  /* ========== RENDER ========== */
  return (
    <div className="page">
      {/* Back */}
      <div className="ed-back" onClick={() => navigate('/employees')}><ArrowLeft size={16} /> Back to Employees</div>

      {/* Employee Header */}
      <div className="ed-header-card">
        <div className="ed-header-left">
          <div className="ed-header-avatar" style={{ background: getAvatarColor(employee.name) }}>
            {documents.profilePhoto?.url
              ? <img src={documents.profilePhoto.url} alt="" />
              : getInitials(employee.name)
            }
          </div>
          <div>
            <h2>{employee.name}</h2>
            <div className="ed-header-meta">
              <span className={`emp-role-badge ${employee.role?.toLowerCase().replace(/\s+/g, '-')}`}>{employee.role}</span>
              <span className="ed-emp-id">ID: {employee.employeeId}</span>
              {employee.mobileNumber && <span className="ed-meta-item"><Phone size={13} /> {employee.mobileNumber}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ed-tabs">
        {TABS.map(tab => (
          <button key={tab.key} className={`ed-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== PROFILE TAB ===== */}
      {activeTab === 'profile' && (
        <div className="ed-section">
          <div className="ed-section-header">
            <h3><User size={18} /> Profile Details</h3>
            {!editingProfile ? (
              <button className="btn btn-outline" onClick={() => setEditingProfile(true)}><Pencil size={14} /> Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-cancel" onClick={() => { setEditingProfile(false); fetchEmployee(); }}>Cancel</button>
                <button className="btn-save" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? <><div className="spinner" /> Saving...</> : <><Save size={14} /> Save</>}
                </button>
              </div>
            )}
          </div>
          <div className="ed-section-body">
            {editingProfile ? (
              <div className="ed-profile-form">
                <div className="form-section-title">Personal Details</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name <span className="required">*</span></label>
                    <input className="form-input" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Role</label>
                    <select className="form-select" value={profileForm.role} onChange={e => setProfileForm(p => ({ ...p, role: e.target.value }))}>
                      <option value="">Select</option>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Mobile Number</label>
                    <input className="form-input" value={profileForm.mobileNumber} onChange={e => setProfileForm(p => ({ ...p, mobileNumber: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Address</label>
                    <input className="form-input" value={profileForm.address} onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))} /></div>
                </div>
                <div className="form-section-title">Emergency Contact</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Contact Name</label>
                    <input className="form-input" value={profileForm.emergencyContactName} onChange={e => setProfileForm(p => ({ ...p, emergencyContactName: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={profileForm.emergencyContactPhone} onChange={e => setProfileForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} /></div>
                </div>
                <div className="form-row single">
                  <div className="form-group"><label className="form-label">Relation</label>
                    <input className="form-input" value={profileForm.emergencyContactRelation} onChange={e => setProfileForm(p => ({ ...p, emergencyContactRelation: e.target.value }))} /></div>
                </div>
                <div className="form-section-title">Credentials</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Username</label>
                    <input className="form-input" value={profileForm.username} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} /></div>
                  <div className="form-group"><label className="form-label">Password</label>
                    <div className="emp-password-field">
                      <input className="form-input" type={showPassword ? 'text' : 'password'} value={profileForm.password} onChange={e => setProfileForm(p => ({ ...p, password: e.target.value }))} />
                      <button type="button" className="emp-password-toggle" onClick={() => setShowPassword(p => !p)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div></div>
                </div>
                <div className="form-section-title">Additional</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date of Birth</label>
                    <input className="form-input" type="date" value={profileForm.dateOfBirth} onChange={e => setProfileForm(p => ({ ...p, dateOfBirth: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Marital Status</label>
                    <select className="form-select" value={profileForm.maritalStatus} onChange={e => setProfileForm(p => ({ ...p, maritalStatus: e.target.value }))}>
                      <option value="">Select</option>{MARITAL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                </div>
              </div>
            ) : (
              <div className="ed-profile-grid">
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}><User size={18} /></div>
                  <div><div className="ed-pi-label">Name</div><div className="ed-pi-value">{employee.name}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}><Shield size={18} /></div>
                  <div><div className="ed-pi-label">Role</div><div className="ed-pi-value">{employee.role || '—'}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(225,112,85,0.1)', color: '#e17055' }}><Phone size={18} /></div>
                  <div><div className="ed-pi-label">Mobile</div><div className="ed-pi-value">{employee.mobileNumber || '—'}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(116,185,255,0.1)', color: '#0984e3' }}><MapPin size={18} /></div>
                  <div><div className="ed-pi-label">Address</div><div className="ed-pi-value">{employee.address || '—'}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(253,203,110,0.15)', color: '#e67e22' }}><Phone size={18} /></div>
                  <div><div className="ed-pi-label">Emergency Contact</div><div className="ed-pi-value">{employee.emergencyContactName || '—'} {employee.emergencyContactPhone ? `(${employee.emergencyContactPhone})` : ''}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(0,206,201,0.1)', color: '#00cec9' }}><User size={18} /></div>
                  <div><div className="ed-pi-label">Relation</div><div className="ed-pi-value">{employee.emergencyContactRelation || '—'}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}><KeyRound size={18} /></div>
                  <div><div className="ed-pi-label">Username</div><div className="ed-pi-value" style={{ fontFamily: 'monospace' }}>{employee.username || '—'}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(162,155,254,0.15)', color: '#a29bfe' }}><CalendarClock size={18} /></div>
                  <div><div className="ed-pi-label">Date of Birth</div><div className="ed-pi-value">{formatDob(employee.dateOfBirth)}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(253,121,168,0.1)', color: '#fd79a8' }}><User size={18} /></div>
                  <div><div className="ed-pi-label">Marital Status</div><div className="ed-pi-value">{employee.maritalStatus || '—'}</div></div></div>
                <div className="ed-profile-item"><div className="ed-pi-icon" style={{ background: 'rgba(116,185,255,0.1)', color: '#2e86de' }}><CalendarClock size={18} /></div>
                  <div><div className="ed-pi-label">Added On</div><div className="ed-pi-value">{formatDate(employee.createdAt)}</div></div></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ACCESS TAB ===== */}
      {activeTab === 'access' && (
        <div className="ed-section">
          <div className="ed-section-header">
            <h3><Shield size={18} /> Menu Access</h3>
            {!editingAccess ? (
              <button className="btn btn-outline" onClick={() => { setEditingAccess(true); setAccessForm(employee.access || []); }}><Pencil size={14} /> Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-cancel" onClick={() => { setEditingAccess(false); setAccessForm(employee.access || []); }}>Cancel</button>
                <button className="btn-save" onClick={saveAccess} disabled={savingAccess}>
                  {savingAccess ? <><div className="spinner" /> Saving...</> : <><Save size={14} /> Save</>}
                </button>
              </div>
            )}
          </div>
          <div className="ed-section-body">
            {editingAccess ? (
              <div className="emp-access-grid">
                {ACCESS_MENU_ITEMS.map(item => (
                  <label key={item.path} className={`emp-access-item ${accessForm.includes(item.path) ? 'selected' : ''}`}>
                    <input type="checkbox" checked={accessForm.includes(item.path)} onChange={() => toggleAccess(item.path)} />
                    <span className="emp-access-checkbox">{accessForm.includes(item.path) && <Check size={12} />}</span>
                    {item.label}
                  </label>
                ))}
              </div>
            ) : (
              <div className="ed-access-display">
                {(employee.access || []).length > 0 ? (
                  <div className="emp-access-tags">
                    {employee.access.map(p => {
                      const item = ACCESS_MENU_ITEMS.find(a => a.path === p);
                      return <span key={p} className="emp-access-tag">{item?.label || p}</span>;
                    })}
                  </div>
                ) : (
                  <p className="ed-no-data">No menu access assigned</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DOCUMENTS TAB ===== */}
      {activeTab === 'documents' && (
        <div className="ed-section">
          <div className="ed-section-header">
            <h3><FileImage size={18} /> Documents</h3>
            {hasPendingFiles && (
              <button className="btn-save" onClick={saveDocuments} disabled={savingDocs}>
                {savingDocs ? <><div className="spinner" /> Uploading &amp; Saving...</> : <><Save size={14} /> Save Documents</>}
              </button>
            )}
          </div>
          {hasPendingFiles && (
            <div className="ed-doc-pending-banner">
              <Upload size={15} /> {Object.keys(pendingFiles).length} file(s) selected — click <strong>Save Documents</strong> to upload
            </div>
          )}
          <div className="ed-section-body">
            <div className="ed-docs-grid">
              {DOC_TYPES.map(dtype => {
                const docData = documents[dtype.key];
                const pending = pendingFiles[dtype.key];
                const previewUrl = pending ? URL.createObjectURL(pending) : null;
                const DIcon = dtype.icon;
                return (
                  <div key={dtype.key} className={`ed-doc-card ${pending ? 'ed-doc-pending' : ''}`}>
                    <div className="ed-doc-header">
                      <span className="ed-doc-title"><DIcon size={16} /> {dtype.label}{dtype.required && <span className="required"> *</span>}</span>
                      {pending && <span className="ed-doc-new-badge">New</span>}
                    </div>
                    <div className="ed-doc-body">
                      {pending ? (
                        /* Show local preview for a pending file */
                        <div className="ed-doc-preview">
                          <img src={previewUrl} alt={dtype.label} />
                          <div className="ed-doc-overlay">
                            <label className="ed-doc-change-btn">
                              <Pencil size={14} /> Change
                              <input type="file" accept="image/*" hidden onChange={e => handleFileChoose(dtype.key, e.target.files[0])} />
                            </label>
                            <button className="ed-doc-remove-btn" onClick={() => removePendingFile(dtype.key)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ) : docData?.url ? (
                        /* Show already uploaded image */
                        <div className="ed-doc-preview">
                          <img src={docData.url} alt={dtype.label} />
                          <div className="ed-doc-overlay">
                            <a href={docData.url} target="_blank" rel="noopener noreferrer" className="ed-doc-view-btn"><Eye size={16} /></a>
                            <label className="ed-doc-change-btn">
                              <Pencil size={14} /> Change
                              <input type="file" accept="image/*" hidden onChange={e => handleFileChoose(dtype.key, e.target.files[0])} />
                            </label>
                            <button className="ed-doc-remove-btn" onClick={() => removeDoc(dtype.key)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        /* Empty state: choose file */
                        <label className="ed-doc-upload">
                          <Upload size={24} /><span>Choose file</span>
                          <input type="file" accept="image/*" hidden onChange={e => handleFileChoose(dtype.key, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== ADVANCE TAB ===== */}
      {activeTab === 'advance' && (
        <div className="ed-section">
          <div className="ed-section-header">
            <h3><CreditCard size={18} /> Advances ({advances.length})</h3>
            <button className="btn btn-primary" onClick={openAdvanceModal}><Plus size={14} /> Add Advance</button>
          </div>

          {/* Advance Stats */}
          <div className="ed-advance-stats">
            <div className="ed-adv-stat"><span>Total Advance</span><strong>₹{totalAdvance.toLocaleString('en-IN')}</strong></div>
            <div className="ed-adv-stat"><span>Total Repaid</span><strong style={{ color: '#00b894' }}>₹{totalRepaid.toLocaleString('en-IN')}</strong></div>
            <div className="ed-adv-stat"><span>Pending</span><strong className={totalPending > 0 ? 'ed-balance-due' : ''}>₹{totalPending.toLocaleString('en-IN')}</strong></div>
          </div>

          <div className="ed-section-body" style={{ padding: advances.length ? '16px 20px' : 0 }}>
            {advances.length === 0 ? (
              <div className="ed-empty"><CreditCard size={32} /><h4>No advances yet</h4><p>Click "Add Advance" to record one</p></div>
            ) : (
              advances.map(adv => {
                const repaidTotal = adv.repayments.reduce((s, r) => s + (r.amount || 0), 0);
                const balance = (adv.amount || 0) - repaidTotal;
                const isOpen = expandedAdvance === adv.id;
                return (
                  <div className="ed-advance-card" key={adv.id}>
                    <div className="ed-advance-header" onClick={() => setExpandedAdvance(isOpen ? null : adv.id)}>
                      <div className="ed-advance-header-left">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <h4>₹{adv.amount?.toLocaleString('en-IN')}</h4>
                        {adv.reason && <span className="ed-advance-reason">{adv.reason}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{adv.date} {formatTime(adv.time)}</span>
                        <span className={`ed-adv-badge ${balance <= 0 ? 'cleared' : 'pending'}`}>{balance <= 0 ? 'Cleared' : `₹${balance.toLocaleString('en-IN')} due`}</span>
                        <button className="cd-action-btn delete" onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'advance', id: adv.id, label: 'Advance' }); }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="ed-advance-body">
                        <div className="cd-installment-row header">
                          <span>Label</span><span>Amount</span><span>Date</span><span>Mode</span><span>Remarks</span><span>Actions</span>
                        </div>
                        {adv.repayments.length === 0 ? (
                          <div className="ed-empty" style={{ padding: '20px 16px' }}><p>No repayments yet</p></div>
                        ) : (
                          adv.repayments.map(rep => (
                            <div className="cd-installment-row" key={rep.id}>
                              <span className="cd-installment-label">{rep.label}</span>
                              <span className="cd-installment-amount">₹{rep.amount?.toLocaleString('en-IN')}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rep.date} {formatTime(rep.time)}</span>
                              <span style={{ fontSize: '0.8rem' }}>{rep.mode || '—'}</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rep.remarks || '—'}</span>
                              <span className="cd-actions-cell">
                                <button className="cd-action-btn edit" onClick={() => openRepaymentModal(adv.id, rep)}><Pencil size={12} /></button>
                                <button className="cd-action-btn delete" onClick={() => setDeleteConfirm({ type: 'repayment', id: rep.id, parentId: adv.id, label: 'Repayment' })}><Trash2 size={12} /></button>
                              </span>
                            </div>
                          ))
                        )}
                        <div className="cd-payment-summary">
                          <span>Total: <strong>₹{adv.amount?.toLocaleString('en-IN')}</strong></span>
                          <span>Repaid: <strong style={{ color: '#00b894' }}>₹{repaidTotal.toLocaleString('en-IN')}</strong></span>
                          <span>Pending: <strong className={balance > 0 ? 'cd-balance-due' : ''}>₹{balance.toLocaleString('en-IN')}</strong></span>
                        </div>
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                          <button className="btn btn-outline" onClick={() => openRepaymentModal(adv.id)}><Plus size={14} /> Add Repayment</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========== MODALS ========== */}

      {/* Advance Modal */}
      {showAdvanceModal && (
        <div className="modal-overlay" onClick={() => setShowAdvanceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2><Plus size={20} /> Add Advance</h2>
              <button className="modal-close-btn" onClick={() => setShowAdvanceModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row single"><div className="form-group">
                <label className="form-label">Amount <span className="required">*</span></label>
                <input type="number" className="form-input" placeholder="Enter amount" value={advanceForm.amount} onChange={e => setAdvanceForm(p => ({ ...p, amount: e.target.value }))} />
              </div></div>
              <div className="form-row single"><div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" rows={2} placeholder="Reason for advance" value={advanceForm.reason} onChange={e => setAdvanceForm(p => ({ ...p, reason: e.target.value }))} />
              </div></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Date</label>
                  <input type="date" className="form-input" value={advanceForm.date} onChange={e => setAdvanceForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Time</label>
                  <input type="time" className="form-input" value={advanceForm.time} onChange={e => setAdvanceForm(p => ({ ...p, time: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAdvanceModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveAdvance} disabled={savingAdvance}>
                {savingAdvance ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {showRepaymentModal && (
        <div className="modal-overlay" onClick={() => setShowRepaymentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>{editingRepayment ? <Pencil size={20} /> : <Plus size={20} />} {editingRepayment ? 'Edit Repayment' : 'Add Repayment'}</h2>
              <button className="modal-close-btn" onClick={() => setShowRepaymentModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row single"><div className="form-group">
                <label className="form-label">Amount <span className="required">*</span></label>
                <input type="number" className="form-input" placeholder="Enter amount" value={repaymentForm.amount} onChange={e => setRepaymentForm(p => ({ ...p, amount: e.target.value }))} />
              </div></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Date</label>
                  <input type="date" className="form-input" value={repaymentForm.date} onChange={e => setRepaymentForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Time</label>
                  <input type="time" className="form-input" value={repaymentForm.time} onChange={e => setRepaymentForm(p => ({ ...p, time: e.target.value }))} /></div>
              </div>
              <div className="form-row single"><div className="form-group">
                <label className="form-label">Mode of Payment</label>
                <select className="form-select" value={repaymentForm.mode} onChange={e => setRepaymentForm(p => ({ ...p, mode: e.target.value }))}>
                  <option value="">Select mode</option>
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div></div>
              <div className="form-row single"><div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="form-textarea" rows={2} placeholder="Any remarks..." value={repaymentForm.remarks} onChange={e => setRepaymentForm(p => ({ ...p, remarks: e.target.value }))} />
              </div></div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowRepaymentModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveRepayment} disabled={savingRepayment}>
                {savingRepayment ? <><div className="spinner" /> Saving...</> : <><Save size={16} /> {editingRepayment ? 'Update' : 'Save'}</>}
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
            <h3>Delete {deleteConfirm.label}</h3>
            <p>Are you sure? This cannot be undone.</p>
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
  );
}
