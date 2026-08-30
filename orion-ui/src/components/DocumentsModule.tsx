import { useState } from "react";
import { Folder, Search, FileText, Trash2, File as FileIcon, Info } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { format } from "date-fns";

export default function DocumentsModule() {
  const documents = useOrionStore(state => state.documents).filter(d => d.type !== 'md');
  const deleteDocument = useOrionStore(state => state.deleteDocument);

  const [searchQuery, setSearchQuery] = useState("");

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIconForType = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText size={24} color="#ef4444" />;
      case 'docx': return <FileText size={24} color="#3b82f6" />;
      case 'txt': return <FileText size={24} color="#64748b" />;
      default: return <FileIcon size={24} color="var(--accent-teal)" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="documents-module" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <header className="documents-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Document Library
          </h1>
          <p className="subtitle" style={{ color: 'var(--text-muted)', margin: 0 }}>
            Manage your study materials, papers, and reference documents.
          </p>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', marginBottom: '2rem' }}>
        <Info size={20} color="var(--accent-purple)" />
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          Native file importing and in-app document rendering (PDF, DOCX) is currently in development. Only previously synchronized documents are displayed.
        </p>
      </div>

      <div className="documents-search" style={{ position: 'relative', marginBottom: '2rem', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search documents by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
        />
      </div>

      <div className="documents-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', overflowY: 'auto' }}>
        {filteredDocuments.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-card)' }}>
            <Folder size={48} color="var(--border-card)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No documents found</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Document importing is currently unavailable.</p>
          </div>
        ) : (
          filteredDocuments.map(doc => (
            <div key={doc.id} className="document-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s' }} 
                 onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)'; }}
                 onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div className="doc-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div className="doc-icon" style={{ padding: '0.75rem', background: 'var(--bg-sidebar)', borderRadius: '8px' }}>
                  {getIconForType(doc.type)}
                </div>
                <div className="doc-info" style={{ flex: 1, overflow: 'hidden' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }} title={doc.filename}>
                    {doc.filename}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>{doc.type.toUpperCase()}</span>
                    <span>•</span>
                    <span>{formatBytes(doc.sizeBytes)}</span>
                  </div>
                </div>
              </div>
              <div className="doc-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Added {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                </span>
                <div className="doc-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="icon-btn" title="Delete" onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


