import { useState } from 'react';
import { useOrionStore } from '../store/useOrionStore';
import { Code, Terminal, Play, Plus, Trash2, Maximize2 } from 'lucide-react';

export default function DeveloperWorkspace() {
  const { snippets, addSnippet, deleteSnippet } = useOrionStore();
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState('typescript');

  const activeSnippet = snippets.find(s => s.id === activeSnippetId);

  const handleAdd = () => {
    if (newTitle.trim()) {
      addSnippet({
        title: newTitle.trim(),
        language: newLang,
        code: '// Write your code here...',
        tags: []
      });
      setNewTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="module-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="module-header" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Developer Workspace</h1>
        <p className="module-subtitle">Code snippets and active sprint tasks.</p>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '1rem', paddingBottom: '1rem' }}>
        {/* Sidebar: Snippet Library */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Code size={18} /> Library</span>
            <button className="icon-btn" onClick={() => setIsAdding(!isAdding)}><Plus size={18} /></button>
          </div>
          <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isAdding && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <input autoFocus type="text" placeholder="Filename..." value={newTitle} onChange={e => setNewTitle(e.target.value)} className="form-input" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }} />
                <select value={newLang} onChange={e => setNewLang(e.target.value)} className="form-select" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="rust">Rust</option>
                  <option value="json">JSON</option>
                  <option value="bash">Bash</option>
                </select>
                <button className="btn-primary" onClick={handleAdd} style={{ padding: '0.5rem', borderRadius: '4px' }}>Add Snippet</button>
              </div>
            )}
            
            {snippets.length === 0 && !isAdding ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No snippets found.</div>
            ) : (
              snippets.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => setActiveSnippetId(s.id)}
                  style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', background: activeSnippetId === s.id ? 'var(--bg-tertiary)' : 'transparent', border: activeSnippetId === s.id ? '1px solid var(--accent-primary)' : '1px solid transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.language}</span>
                  </div>
                  {activeSnippetId === s.id && (
                    <button className="icon-btn text-error" onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id); setActiveSnippetId(null); }}><Trash2 size={16} /></button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main: Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{activeSnippet ? activeSnippet.title : 'No snippet selected'}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="icon-btn"><Play size={16} /></button>
              <button className="icon-btn"><Maximize2 size={16} /></button>
            </div>
          </div>
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            {activeSnippet ? (
              <textarea
                value={activeSnippet.code}
                onChange={(e) => useOrionStore.getState().updateSnippet(activeSnippet.id, { code: e.target.value })}
                style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'Consolas, monospace', fontSize: '0.95rem', resize: 'none', outline: 'none' }}
                spellCheck={false}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Terminal size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>Select a snippet or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

