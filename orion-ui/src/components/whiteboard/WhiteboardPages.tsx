import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Page, WhiteboardObject } from './types';
import { ConfirmModal } from '../ConfirmModal';


interface WhiteboardPagesProps {
  pages: Page[];
  currentPageId: string;
  onAddPage: () => void;
  onSwitchPage: (id: string) => void;
  onRenamePage: (id: string, name: string) => void;
  onDeletePage: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onReorderPage: (id: string, direction: 'left' | 'right') => void;
}

function PageThumbnail({ objects }: { objects: Record<string, WhiteboardObject> }) {
  const objList = Object.values(objects);
  if (objList.length === 0) {
    return <svg viewBox="0 0 100 60" style={{ width: '100%', height: '40px', background: 'var(--bg-primary, #f8f9fa)', borderRadius: '4px', marginBottom: '6px' }} />;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  objList.forEach(obj => {
    const minx = Math.min(obj.x, obj.x + obj.width);
    const miny = Math.min(obj.y, obj.y + obj.height);
    const maxx = Math.max(obj.x, obj.x + obj.width);
    const maxy = Math.max(obj.y, obj.y + obj.height);
    if (minx < minX) minX = minx;
    if (miny < minY) minY = miny;
    if (maxx > maxX) maxX = maxx;
    if (maxy > maxY) maxY = maxy;
  });
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const padding = Math.max(width, height) * 0.1;
  
  return (
    <svg viewBox={`${minX - padding} ${minY - padding} ${width + padding*2} ${height + padding*2}`} 
         style={{ width: '100%', height: '40px', background: 'var(--bg-primary, #f8f9fa)', borderRadius: '4px', marginBottom: '6px' }}>
      {objList.map(obj => {
         let fill = '#e2e8f0';
         if (obj.type === 'text') fill = '#94a3b8';
         if (obj.type === 'sticky') fill = '#fef08a';
         if (obj.type === 'image') fill = '#cbd5e1';
         const w = Math.max(10, Math.abs(obj.width));
         const h = Math.max(10, Math.abs(obj.height));
         return <rect key={obj.id} x={Math.min(obj.x, obj.x + obj.width)} y={Math.min(obj.y, obj.y + obj.height)} width={w} height={h} fill={fill} rx={Math.min(w, h) * 0.1} />;
      })}
    </svg>
  );
}

export function WhiteboardPages({
  pages, currentPageId, onAddPage, onSwitchPage, onRenamePage, onDeletePage, onDuplicatePage, onReorderPage
}: WhiteboardPagesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setContextMenu(null);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      onRenamePage(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: '8px',
      padding: '8px 12px',
      background: 'var(--bg-secondary, #fff)',
      borderTop: '1px solid var(--border-card, rgba(0,0,0,0.06))',
      overflowX: 'auto', flexShrink: 0,
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      {pages.map((page) => {
        const isActive = page.id === currentPageId;
        const isEditing = editingId === page.id;

        return (
          <div
            key={page.id}
            onClick={() => !isEditing && onSwitchPage(page.id)}
            onContextMenu={(e) => handleContextMenu(e, page.id)}
            onDoubleClick={() => handleStartRename(page.id, page.name)}
            onMouseEnter={() => setHoveredPageId(page.id)}
            onMouseLeave={() => setHoveredPageId(null)}
            style={{
              position: 'relative',
              padding: '6px', borderRadius: '8px',
              fontSize: '0.8rem', fontWeight: isActive ? 600 : 400,
              background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              color: isActive ? 'var(--accent-violet, #8b5cf6)' : 'var(--text-secondary, #64607a)',
              border: isActive ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
              transition: 'all 0.15s ease',
              width: '100px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <PageThumbnail objects={page.objects} />
            {hoveredPageId === page.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (Object.keys(page.objects).length > 0) {
                    setConfirmDialog({
                      message: 'Clear all objects and delete this page?',
                      onConfirm: () => onDeletePage(page.id)
                    });
                  } else {
                    onDeletePage(page.id);
                  }
                }}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  background: 'rgba(239, 68, 68, 0.9)', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer',
                  padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Delete page"
              >
                <Trash2 size={12} />
              </button>
            )}
            {isEditing ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'transparent', border: '1px solid var(--border-card, rgba(0,0,0,0.1))', outline: 'none',
                  fontSize: '0.8rem', fontWeight: 600, color: 'inherit',
                  width: '100%',
                  fontFamily: 'inherit',
                  textAlign: 'center'
                }}
              />
            ) : (
              <div style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {page.name}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onAddPage}
        style={{
          padding: '24px 16px', borderRadius: '8px',
          fontSize: '1.2rem', fontWeight: 500,
          background: 'transparent', border: '1px dashed var(--border-card, rgba(0,0,0,0.1))',
          color: 'var(--text-muted, #a09bb5)', cursor: 'pointer',
          fontFamily: 'inherit',
          height: '75px'
        }}
      >
        +
      </button>

      <ConfirmModal
        isOpen={!!confirmDialog}
        message={confirmDialog?.message || ''}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
      {contextMenu && (
        <div
          style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y - 180,
            background: 'var(--bg-secondary, #fff)', borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
            padding: '4px', zIndex: 9999, minWidth: '140px',
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem label="Rename" onClick={() => {
            const p = pages.find(p => p.id === contextMenu.id);
            if (p) handleStartRename(p.id, p.name);
          }} />
          <ContextMenuItem label="Duplicate" onClick={() => {
            onDuplicatePage(contextMenu.id);
            setContextMenu(null);
          }} />
          {pages.findIndex(p => p.id === contextMenu.id) > 0 && (
            <ContextMenuItem label="Move Left" onClick={() => {
              onReorderPage(contextMenu.id, 'left');
              setContextMenu(null);
            }} />
          )}
          {pages.findIndex(p => p.id === contextMenu.id) < pages.length - 1 && (
            <ContextMenuItem label="Move Right" onClick={() => {
              onReorderPage(contextMenu.id, 'right');
              setContextMenu(null);
            }} />
          )}
          <ContextMenuItem label="Delete" danger onClick={() => {
            const p = pages.find(p => p.id === contextMenu.id);
            if (p && Object.keys(p.objects).length > 0) {
                setConfirmDialog({
                  message: 'Clear all objects and delete this page?',
                  onConfirm: () => onDeletePage(contextMenu.id)
                });
            } else {
                onDeletePage(contextMenu.id);
            }
            setContextMenu(null);
          }} />
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '6px 12px', borderRadius: '6px',
        background: 'transparent', border: 'none',
        color: danger ? '#ef4444' : 'var(--text-primary, #1a1625)',
        fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.04)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  );
}
