import React, { useState, useRef, useEffect } from 'react';
import { useOrionStore } from '../store/useOrionStore';
import { CheckCircle2, Trash2, ArrowRight, Command, ListTodo, Zap, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function InboxModule() {
  const { inbox, addInboxItem, removeInboxItem, markInboxItemProcessed, addTask } = useOrionStore();
  const [content, setContent] = useState('');
  const [showProcessed, setShowProcessed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus input on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCapture();
    }
  };

  const handleCapture = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    addInboxItem(trimmed);
    setContent('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const unprocessed = inbox.filter(i => !i.processedAt);
  const processed = inbox.filter(i => i.processedAt);

  const handleConvertToTask = (item: any) => {
    addTask({
      title: item.content,
      description: '',
      priority: 'Medium',
      dueDate: '',
      documentIds: []
    });
    markInboxItemProcessed(item.id);
  };

  return (
    <div className="module-container inbox-module" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div className="module-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
          <Zap size={32} color="var(--accent-primary)" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Universal Inbox
        </h1>
        <p className="module-subtitle" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
          Capture any thought instantly. Decide where it goes later.
        </p>
      </div>

      <div className="module-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="inbox-capture-area glass-panel" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px', border: '1px solid var(--accent-purple)', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)' }}>
          <div style={{ padding: '0 1rem', color: 'var(--text-muted)' }}>
            <Command size={24} />
          </div>
          <textarea
            ref={inputRef}
            className="inbox-capture-input"
            placeholder="What's on your mind?..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)', 
              fontSize: '1.2rem', 
              outline: 'none', 
              resize: 'none', 
              padding: '1rem 0',
              fontFamily: 'inherit'
            }}
          />
          <button 
            className="btn-primary" 
            onClick={handleCapture} 
            disabled={!content.trim()}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, opacity: content.trim() ? 1 : 0.5 }}
          >
            Capture
          </button>
        </div>

        <div className="inbox-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {unprocessed.length === 0 ? (
            <div className="empty-state glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
              <ListTodo size={48} color="var(--border-card)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Your mind is clear</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>Capture an idea above, or press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>Cmd/Ctrl + Shift + Space</kbd> from anywhere.</p>
            </div>
          ) : (
            unprocessed.map(item => (
              <div key={item.id} className="inbox-item glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderRadius: '12px', transition: 'transform 0.2s', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflow: 'hidden' }}>
                  <div className="inbox-item-content" style={{ fontSize: '1.05rem', color: 'var(--text-primary)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {item.content}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Clock size={12} /> {format(new Date(item.createdAt), "h:mm a")}
                  </div>
                </div>
                <div className="inbox-item-actions" style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button className="icon-btn" onClick={() => handleConvertToTask(item)} title="Convert to Task" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', color: 'var(--accent-teal)', cursor: 'pointer' }}>
                    <ArrowRight size={18} />
                  </button>
                  <button className="icon-btn" onClick={() => markInboxItemProcessed(item.id)} title="Mark Processed" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', color: 'var(--success-color, #10b981)', cursor: 'pointer' }}>
                    <CheckCircle2 size={18} />
                  </button>
                  <button className="icon-btn text-error" onClick={() => removeInboxItem(item.id)} title="Delete" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', color: 'var(--danger-color, #ef4444)', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {processed.length > 0 && (
          <div className="inbox-processed-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <button 
                className="text-btn toggle-processed-btn" 
                onClick={() => setShowProcessed(!showProcessed)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
              >
                {showProcessed ? 'Hide Processed History' : `Show Processed History (${processed.length})`}
              </button>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>
            
            {showProcessed && (
              <div className="inbox-list processed-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.8 }}>
                {processed.map(item => (
                  <div key={item.id} className="inbox-item glass-panel processed" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflow: 'hidden' }}>
                      <div className="inbox-item-content" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                        {item.content}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Processed at {item.processedAt ? format(new Date(item.processedAt), "h:mm a, MMM d") : ''}
                      </div>
                    </div>
                    <div className="inbox-item-actions">
                      <button className="icon-btn text-error" onClick={() => removeInboxItem(item.id)} title="Delete" style={{ background: 'transparent', border: 'none', padding: '0.5rem', color: 'var(--danger-color, #ef4444)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

