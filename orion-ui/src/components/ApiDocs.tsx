import { BoxSelect } from 'lucide-react';

export default function ApiDocs() {
  return (
    <div className="module-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="module-header" style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>API Documentation</h1>
          <p className="module-subtitle" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Centralized view of API endpoints and service contracts.</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '400px' }}>
          <BoxSelect size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3>Module Structure Initialized</h3>
          <p>The UI for API Documentation is currently being constructed in the next phase of the Personal OS architecture.</p>
        </div>
      </div>
    </div>
  );
}
