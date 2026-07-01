import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Wrench, 
  FileEdit,
  CheckCircle,
  Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  salesDraft: number;
  salesConfirmed: number;
  salesDelivered: number;

  purchasesDraft: number;
  purchasesConfirmed: number;
  purchasesDelivered: number;

  mfgDraft: number;
  mfgConfirmed: number;
  mfgDelivered: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    salesDraft: 0, salesConfirmed: 0, salesDelivered: 0,
    purchasesDraft: 0, purchasesConfirmed: 0, purchasesDelivered: 0,
    mfgDraft: 0, mfgConfirmed: 0, mfgDelivered: 0
  });

  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [salesRes, purchRes, mfgRes] = await Promise.all([
        axios.get('/api/sales').catch(() => ({ data: [] })),
        axios.get('/api/purchases').catch(() => ({ data: [] })),
        axios.get('/api/manufacturing').catch(() => ({ data: [] }))
      ]);

      const sales = salesRes.data || [];
      const purchases = purchRes.data || [];
      const mfg = mfgRes.data || [];

      // Helper function to safely check statuses, mapping backend defaults where needed
      const countStatus = (arr: any[], ...statuses: string[]) => 
        arr.filter(item => statuses.some(s => item.status?.toLowerCase() === s.toLowerCase())).length;

      setStats({
        salesDraft: countStatus(sales, 'Draft', 'Pending'),
        salesConfirmed: countStatus(sales, 'Confirmed'),
        salesDelivered: countStatus(sales, 'Delivered', 'Completed'),

        purchasesDraft: countStatus(purchases, 'Draft', 'Pending'),
        purchasesConfirmed: countStatus(purchases, 'Confirmed'),
        purchasesDelivered: countStatus(purchases, 'Received'),

        mfgDraft: countStatus(mfg, 'Draft', 'Planned', 'Pending'),
        mfgConfirmed: countStatus(mfg, 'Confirmed', 'In Progress'),
        mfgDelivered: countStatus(mfg, 'Completed', 'Done')
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!user) return null;
  if (loading) {
    return (
      <div className="animate-fade-in" style={{ color: 'var(--primary)', padding: '3rem', textAlign: 'center' }}>
        Loading dashboard...
      </div>
    );
  }

  // Reusable card component
  const StatCard = ({ title, value, icon, link, colorVar }: { title: string, value: number, icon: React.ReactNode, link: string, colorVar: string }) => (
    <div className="card stat-card">
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        <Link to={link} style={{ display: 'inline-block', fontSize: '0.8rem', marginTop: '0.5rem', color: `var(${colorVar})`, fontWeight: 500 }}>
          View details &rarr;
        </Link>
      </div>
      <div className="stat-icon-wrapper" style={{ backgroundColor: `var(${colorVar}-bg, rgba(99,102,241,0.1))`, color: `var(${colorVar})` }}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.name}!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here's an overview of your ERP operations today.</p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShoppingBag size={20} color="var(--primary)" /> Sales Orders
      </h2>
      <div className="dashboard-stats-grid">
        <StatCard title="Draft Sales" value={stats.salesDraft} icon={<FileEdit size={24} />} link="/sales" colorVar="--primary" />
        <StatCard title="Confirmed Sales" value={stats.salesConfirmed} icon={<CheckCircle size={24} />} link="/sales" colorVar="--info" />
        <StatCard title="Delivered Sales" value={stats.salesDelivered} icon={<Truck size={24} />} link="/sales" colorVar="--success" />
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShoppingCart size={20} color="var(--warning)" /> Purchase Orders
      </h2>
      <div className="dashboard-stats-grid">
        <StatCard title="Draft Purchases" value={stats.purchasesDraft} icon={<FileEdit size={24} />} link="/purchases" colorVar="--warning" />
        <StatCard title="Confirmed Purchases" value={stats.purchasesConfirmed} icon={<CheckCircle size={24} />} link="/purchases" colorVar="--info" />
        <StatCard title="Received Purchases" value={stats.purchasesDelivered} icon={<Truck size={24} />} link="/purchases" colorVar="--success" />
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Wrench size={20} color="var(--danger)" /> Manufacturing Orders
      </h2>
      <div className="dashboard-stats-grid">
        <StatCard title="Draft Mfg" value={stats.mfgDraft} icon={<FileEdit size={24} />} link="/manufacturing" colorVar="--danger" />
        <StatCard title="Confirmed Mfg" value={stats.mfgConfirmed} icon={<CheckCircle size={24} />} link="/manufacturing" colorVar="--info" />
        <StatCard title="Completed Mfg" value={stats.mfgDelivered} icon={<Truck size={24} />} link="/manufacturing" colorVar="--success" />
      </div>

    </div>
  );
};
