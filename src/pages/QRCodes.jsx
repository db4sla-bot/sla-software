import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  QrCode, Plus, Search, X, Check, Trash2,
  AlertTriangle, CalendarClock, Download
} from 'lucide-react';
import QRCode from 'qrcode';
import { db } from '../firebase.js';
import {
  collection, addDoc, deleteDoc, doc,
  getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import '../css/QRCodes.css';

/* ---- Tiny component that renders a QR code onto a canvas ---- */
function QRCanvas({ value, size = 180 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && value) {
      QRCode.toCanvas(ref.current, value, {
        width: size, margin: 2,
        color: { dark: '#2d3436', light: '#ffffff' }
      }).catch(() => {});
    }
  }, [value, size]);
  return <canvas ref={ref} />;
}

export default function QRCodes() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [formLabel, setFormLabel] = useState('');
  const [formMedia, setFormMedia] = useState('');
  const [saving, setSaving] = useState(false);
  const previewRef = useRef(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  /* ---- Fetch ---- */
  useEffect(() => { fetchQRCodes(); }, []);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'qrcodes'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setQrCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error('Error fetching QR codes:', err); }
    finally { setLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Preview ---- */
  useEffect(() => {
    if (formMedia.trim() && previewRef.current) {
      QRCode.toCanvas(previewRef.current, formMedia.trim(), {
        width: 200, margin: 2,
        color: { dark: '#2d3436', light: '#ffffff' }
      }).catch(() => {});
    }
  }, [formMedia]);

  /* ---- Save (just label + media, no image) ---- */
  const handleSave = async () => {
    if (!formLabel.trim()) { showToast('Enter display label', 'error'); return; }
    if (!formMedia.trim()) { showToast('Enter media content', 'error'); return; }
    try {
      setSaving(true);
      await addDoc(collection(db, 'qrcodes'), {
        displayLabel: formLabel.trim(),
        media: formMedia.trim(),
        createdAt: serverTimestamp()
      });
      showToast('QR Code saved!');
      setShowModal(false);
      setFormLabel('');
      setFormMedia('');
      fetchQRCodes();
    } catch (err) { console.error(err); showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'qrcodes', id));
      showToast('QR Code deleted!');
      setDeleteConfirm(null);
      fetchQRCodes();
    } catch (err) { showToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  };

  /* ---- Download ---- */
  const handleDownload = async (item) => {
    try {
      const dataUrl = await QRCode.toDataURL(item.media, {
        width: 600, margin: 2,
        color: { dark: '#2d3436', light: '#ffffff' }
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${item.displayLabel}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { showToast('Failed to download', 'error'); }
  };

  /* ---- Filter ---- */
  const filtered = useMemo(() => {
    if (!searchTerm) return qrCodes;
    const t = searchTerm.toLowerCase();
    return qrCodes.filter(q =>
      q.displayLabel?.toLowerCase().includes(t) ||
      q.media?.toLowerCase().includes(t)
    );
  }, [qrCodes, searchTerm]);

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
          <h1 className="page-title">QR Codes</h1>
          <p className="page-subtitle">Generate and manage QR codes</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setFormLabel(''); setFormMedia(''); setShowModal(true); }}>
            <Plus size={16} /> Add QR Code
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="qr-stats-bar">
        <div className="qr-stat-card">
          <div className="qr-stat-icon" style={{ background: 'rgba(108,92,231,0.1)', color: '#6c5ce7' }}><QrCode size={22} /></div>
          <div className="qr-stat-info"><h4>{qrCodes.length}</h4><p>Total QR Codes</p></div>
        </div>
        <div className="qr-stat-card">
          <div className="qr-stat-icon" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894' }}><QrCode size={22} /></div>
          <div className="qr-stat-info"><h4>{filtered.length}</h4><p>Showing Results</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="qr-toolbar">
        <h3>All QR Codes ({filtered.length})</h3>
        <div className="qr-search">
          <Search size={15} color="var(--text-muted)" />
          <input type="text" placeholder="Search QR codes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="qr-empty">
          <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 28, height: 28, margin: '0 auto' }} />
          <p style={{ marginTop: 12 }}>Loading QR codes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="qr-empty">
          <QrCode size={40} />
          <h4>{searchTerm ? 'No matching QR codes' : 'No QR codes yet'}</h4>
          <p>{searchTerm ? 'Try adjusting your search' : 'Click "Add QR Code" to generate your first QR code'}</p>
        </div>
      ) : (
        <div className="qr-grid">
          {filtered.map(item => (
            <div className="qr-card" key={item.id}>
              <div className="qr-card-image">
                <QRCanvas value={item.media} size={180} />
              </div>
              <div className="qr-card-body">
                <div className="qr-card-label"><span className="qr-card-label-dot" />{item.displayLabel}</div>
                <div className="qr-card-media" title={item.media}>{item.media}</div>
                <div className="qr-card-date"><CalendarClock size={12} />{formatDate(item.createdAt)}</div>
                <div className="qr-card-actions">
                  <button className="qr-btn download-btn" onClick={() => handleDownload(item)}><Download size={14} /> Download</button>
                  <button className="qr-btn delete-btn" onClick={() => setDeleteConfirm(item)}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== ADD QR MODAL ========== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2><Plus size={20} /> Generate QR Code</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">QR Code Details</div>
              <div className="form-row single"><div className="form-group">
                <label className="form-label">Display Label <span className="required">*</span></label>
                <input className="form-input" placeholder="e.g. Google Review, Website, Instagram" value={formLabel} onChange={e => setFormLabel(e.target.value)} />
              </div></div>
              <div className="form-row single"><div className="form-group">
                <label className="form-label">Media (URL / Content) <span className="required">*</span></label>
                <textarea className="form-textarea" rows={3} placeholder="Enter URL or text content for QR code" value={formMedia} onChange={e => setFormMedia(e.target.value)} />
              </div></div>
              {formMedia.trim() && (
                <div className="qr-preview-container"><canvas ref={previewRef} /></div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" /> Saving...</> : <><QrCode size={16} /> Generate & Save</>}
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
            <h3>Delete QR Code</h3>
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
