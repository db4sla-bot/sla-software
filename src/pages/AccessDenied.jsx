import { ShieldX, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(225, 112, 85, 0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', color: 'var(--danger)'
        }}>
          <ShieldX size={40} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          You do not have permission to access this page.<br />
          Please contact your administrator for access.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/')}
          style={{ margin: '0 auto' }}
        >
          <ArrowLeft size={16} /> Go to Dashboard
        </button>
      </div>
    </div>
  );
}
