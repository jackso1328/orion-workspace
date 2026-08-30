import { Rocket, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon({ title, description }: { title: string, description?: string }) {
  const navigate = useNavigate();
  return (
    <div className="module-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', maxWidth: '500px', textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <Rocket size={48} color="var(--accent-primary)" />
        </div>
        <h2 style={{ fontSize: '1.8rem', margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>{title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          {description || 'This module is currently in active development and will be available in an upcoming update.'}
        </p>
        <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem' }}>
          <ArrowLeft size={18} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
}
