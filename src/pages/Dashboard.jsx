import {
  LayoutDashboard,
  TrendingUp,
  Users,
  IndianRupee,
  CalendarCheck,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const stats = [
  {
    title: 'Total Revenue',
    value: '₹4,52,800',
    change: '+12.5%',
    isUp: true,
    icon: IndianRupee,
    color: '#6c5ce7',
    bgColor: 'rgba(108, 92, 231, 0.1)',
  },
  {
    title: 'Total Leads',
    value: '284',
    change: '+8.2%',
    isUp: true,
    icon: TrendingUp,
    color: '#00cec9',
    bgColor: 'rgba(0, 206, 201, 0.1)',
  },
  {
    title: 'Total Customers',
    value: '156',
    change: '+5.1%',
    isUp: true,
    icon: Users,
    color: '#00b894',
    bgColor: 'rgba(0, 184, 148, 0.1)',
  },
  {
    title: 'Appointments',
    value: '32',
    change: '-2.4%',
    isUp: false,
    icon: CalendarCheck,
    color: '#e17055',
    bgColor: 'rgba(225, 112, 85, 0.1)',
  },
];

export default function Dashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here&apos;s your business overview.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} style={{
              background: 'var(--card-bg)',
              borderRadius: 'var(--card-radius)',
              padding: '22px',
              boxShadow: 'var(--card-shadow)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}>
              <div>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}>{stat.title}</p>
                <h3 style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  marginBottom: '6px',
                }}>{stat.value}</h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: stat.isUp ? 'var(--success)' : 'var(--danger)',
                }}>
                  {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>vs last month</span>
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: stat.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
                flexShrink: 0,
              }}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '20px',
      }}>
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--card-radius)',
          padding: '24px',
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border-color)',
          minHeight: '300px',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Revenue Overview</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monthly revenue trend will appear here</p>
        </div>
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--card-radius)',
          padding: '24px',
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--border-color)',
          minHeight: '300px',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Recent Leads</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest lead activities will appear here</p>
        </div>
      </div>
    </div>
  );
}
