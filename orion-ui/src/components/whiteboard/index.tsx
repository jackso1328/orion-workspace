import { useState } from 'react';
import { useWhiteboardState } from './useWhiteboardState';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { WhiteboardPages } from './WhiteboardPages';
import { Download, MoreHorizontal, X, FileImage, Archive, FileText } from 'lucide-react';

import { exportToPng, exportToSvg, exportToZip, exportToPptx, exportToPdf } from './exportUtils';

export default function WhiteboardModule() {
  const state = useWhiteboardState();
  const [showMenu, setShowMenu] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setShowExport(false);
    if (type === 'ZIP' || type === 'PPTX' || type === 'PDF') {
      setExportStatus(`Preparing ${state.doc.pages.length} pages...`);
      try {
        if (type === 'ZIP') {
          await exportToZip(state.doc.pages, (msg) => setExportStatus(msg));
        } else if (type === 'PPTX') {
          await exportToPptx(state.doc.pages, (msg) => setExportStatus(msg));
        } else if (type === 'PDF') {
          await exportToPdf(state.doc.pages, (msg) => setExportStatus(msg));
        }
        setExportStatus('Export complete');
      } catch (e) {
        setExportStatus('Export failed');
      }
      setTimeout(() => setExportStatus(null), 2500);
      return;
    }
    
    switch(type) {
      case 'PNG': exportToPng(state.currentPage.objects); break;
      case 'SVG': exportToSvg(state.currentPage.objects); break;
    }
  };

  return (
    <div className="module-container" style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      position: 'relative', zIndex: 1,
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '20px 32px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <h1 style={{
            fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.15rem 0',
            color: 'var(--text-primary, #1a1625)',
            fontFamily: 'var(--font-display, Outfit, sans-serif)',
          }}>Whiteboard</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64607a)', margin: 0 }}>
            Visual thinking and architecture canvas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #999)', fontWeight: 500 }}>
            {state.saveStatus === 'saving' ? 'Saving...' : state.saveStatus === 'error' ? 'Save Failed' : '✓ Saved'}
          </span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'rgba(139, 92, 246, 0.08)', border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
                borderRadius: '10px', padding: '6px 10px', cursor: 'pointer',
                color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: 'var(--bg-secondary, #fff)', borderRadius: '10px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid var(--border-card)',
                  padding: '4px', zIndex: 100, minWidth: '160px',
                }}
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => { setShowExport(true); setShowMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    borderRadius: '6px', background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Download size={14} /> Export...
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div style={{
        flex: 1, minHeight: 0,
        margin: '0 16px', borderRadius: '12px 12px 0 0',
        overflow: 'hidden', border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
        borderBottom: 'none',
        position: 'relative',
      }}>
        <WhiteboardToolbar tool={state.tool} setTool={state.setTool} />
        {exportStatus && (
          <div style={{
            position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-secondary, #fff)', color: 'var(--text-primary, #1a1625)',
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
            zIndex: 9999, transition: 'all 0.2s ease', fontFamily: 'var(--font-sans, Inter, sans-serif)'
          }}>
            {exportStatus}
          </div>
        )}
        <WhiteboardCanvas
          objects={state.currentPage.objects}
          camera={state.camera}
          setCamera={state.setCamera}
          tool={state.tool}
          setTool={state.setTool}
          selection={state.selection}
          setSelection={state.setSelection}
          updateObject={state.updateObject}
          updateObjects={state.updateObjects}
          addObject={state.addObject}
          deleteObjects={state.deleteObjects}
          undo={state.undo}
          redo={state.redo}
          saveHistory={state.saveHistory}
          startHistoryTransaction={state.startHistoryTransaction}
          commitHistoryTransaction={state.commitHistoryTransaction}
          duplicateObjects={state.duplicateObjects}
        />
      </div>

      {/* Page Strip */}
      <div style={{ margin: '0 16px', borderRadius: '0 0 12px 12px', overflow: 'hidden', border: '1px solid var(--border-card, rgba(0,0,0,0.06))', borderTop: 'none' }}>
        <WhiteboardPages
          pages={state.doc.pages}
          currentPageId={state.doc.currentPageId}
          onAddPage={state.addPage}
          onSwitchPage={state.switchPage}
          onRenamePage={state.renamePage}
          onDeletePage={state.deletePage}
          onDuplicatePage={state.duplicatePage}
          onReorderPage={state.reorderPage}
        />
      </div>

      {/* Export Modal */}
      {showExport && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowExport(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary, #fff)', borderRadius: '16px', padding: '2rem', width: '420px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: 'var(--font-sans, Inter, sans-serif)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #1a1625)' }}>
                <Download size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Export Whiteboard
              </h2>
              <button onClick={() => setShowExport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #999)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={() => handleExport('PNG')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FileImage size={16} /> PNG</button>
              <button onClick={() => handleExport('SVG')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FileImage size={16} /> SVG</button>
              <button onClick={() => handleExport('PDF')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FileText size={16} /> PDF</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleExport('ZIP')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Archive size={16} /> ZIP All Pages</button>
              <button onClick={() => handleExport('PPTX')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FileText size={16} /> PPTX (PowerPoint)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
