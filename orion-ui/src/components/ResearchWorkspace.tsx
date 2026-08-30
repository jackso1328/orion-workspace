
import DocumentsModule from './DocumentsModule';
import NotesModule from './NotesModule';

export default function ResearchWorkspace() {
  return (
    <div className="module-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="module-header">
        <div className="module-title-group">
          <h1>Research Workspace</h1>
          <p className="module-subtitle">Read documents and synthesize knowledge side by side.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '1rem', padding: '0 1.5rem 1.5rem 1.5rem' }}>
        <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ transform: 'scale(0.95)', transformOrigin: 'top left', width: '105%', height: '105%' }}>
            <DocumentsModule />
          </div>
        </div>
        <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <NotesModule />
        </div>
      </div>
    </div>
  );
}
