import {
  LayoutDashboard,
  TrendingUp,
  Users,
  IndianRupee,
  CalendarCheck,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import '../CSS/Dashboard.css';

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
          <p className="page-subtitle">Welcome back! Here's your business overview.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="dashboard-stat-card">
              <div className="dashboard-stat-info">
                <p>{stat.title}</p>
                <h2>{stat.value}</h2>
                <div className={`dashboard-stat-trend ${stat.isUp ? 'up' : 'down'}`}>
                  {stat.isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {stat.change}
                </div>
              </div>
              <div className="dashboard-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-main-grid">
        <div className="dashboard-main-card">
          <h3>Revenue Overview</h3>
          <p>Monthly revenue trend will appear here</p>
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.2, marginTop: '40px' }}>
            <TrendingUp size={48} style={{ marginBottom: '16px' }} />
            <p>Chart data will appear here</p>
          </div>
        </div>
        <div className="dashboard-main-card">
          <h3>Recent Leads</h3>
          <p>Latest lead activities will appear here</p>
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.2, marginTop: '40px' }}>
            <Users size={48} style={{ marginBottom: '16px' }} />
            <p>Lead data will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
