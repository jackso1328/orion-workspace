import React, { useState } from 'react';
import { useOrionStore } from '../store/useOrionStore';
import { Target, Plus, TrendingUp, Trash2 } from 'lucide-react';

export default function GoalsModule() {
  const { goals, addGoal, deleteGoal, updateGoal } = useOrionStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMetric, setNewMetric] = useState('');
  const [newTarget, setNewTarget] = useState(100);

  const handleAdd = () => {
    if (newTitle.trim() && newMetric.trim()) {
      addGoal({
        title: newTitle.trim(),
        metric: newMetric.trim(),
        target: newTarget,
        current: 0
      });
      setNewTitle('');
      setNewMetric('');
      setNewTarget(100);
      setIsAdding(false);
    }
  };

  return (
    <div className="module-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="module-header" style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Goals & OKRs</h1>
          <p className="module-subtitle" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Track high-level metrics and professional objectives.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAdding(!isAdding)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
          <Plus size={18} /> New Goal
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {isAdding && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--accent-primary)', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Goal Title</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="form-input" placeholder="e.g. Publish 3 research papers" />
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Metric Unit</label>
              <input type="text" value={newMetric} onChange={e => setNewMetric(e.target.value)} className="form-input" placeholder="e.g. Papers" />
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Target</label>
              <input type="number" value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} className="form-input" />
            </div>
            <button className="btn-primary" onClick={handleAdd} style={{ padding: '0.75rem 1.5rem' }}>Save</button>
          </div>
        )}

        {goals.length === 0 && !isAdding ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Target size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No goals defined yet. Set your first OKR!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {goals.map(goal => {
              const progress = Math.round((goal.current / goal.target) * 100);
              return (
                <div key={goal.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                        <Target size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{goal.title}</h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{goal.current} / {goal.target} {goal.metric}</span>
                      </div>
                    </div>
                    <button className="icon-btn text-error" onClick={() => deleteGoal(goal.id)}><Trash2 size={16} /></button>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingUp size={14} /> Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: progress + '%', background: 'var(--accent-primary)', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="text-btn" onClick={() => updateGoal(goal.id, { current: Math.max(0, goal.current - 1) })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>-</button>
                    <button className="text-btn" onClick={() => updateGoal(goal.id, { current: Math.min(goal.target, goal.current + 1) })} style={{ flex: 1, padding: '0.5rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '6px' }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
