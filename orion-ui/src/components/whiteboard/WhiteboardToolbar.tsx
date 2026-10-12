import { useState, useRef, useEffect } from 'react';
import { MousePointer2, Hand, Pen, Eraser, Type, Square, Circle, Triangle, Diamond, Minus, ArrowRight, StickyNote, Shapes, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { ToolType } from './types';

interface WhiteboardToolbarProps {
  tool: ToolType;
  setTool: (t: ToolType) => void;
  onUploadMedia?: (type: 'image' | 'video', dataUrl: string) => void;
}

export function WhiteboardToolbar({ tool, setTool, onUploadMedia }: WhiteboardToolbarProps) {
  const [shapePaletteOpen, setShapePaletteOpen] = useState(false);
  const [connectorPaletteOpen, setConnectorPaletteOpen] = useState(false);

  const shapeRef = useRef<HTMLDivElement>(null);
  const connectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShapePaletteOpen(false);
        setConnectorPaletteOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (shapeRef.current && !shapeRef.current.contains(e.target as Node)) {
        setShapePaletteOpen(false);
      }
      if (connectorRef.current && !connectorRef.current.contains(e.target as Node)) {
        setConnectorPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isShapeActive = ['rectangle', 'ellipse', 'diamond', 'triangle'].includes(tool);
  const isConnectorActive = ['line', 'arrow'].includes(tool);

  const shapes = [
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse (O)' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
  ] as const;

  const connectors = [
    { id: 'line', icon: Minus, label: 'Line (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
  ] as const;

  const ActiveShapeIcon = Shapes;
  const ActiveConnectorIcon = ArrowUpRight;

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '36px', height: '36px',
    borderRadius: '8px',
    background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
    color: isActive ? 'var(--accent-violet, #8b5cf6)' : 'var(--text-secondary, #64607a)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  const divider = <div style={{ width: '1px', height: '24px', background: 'var(--border-card, rgba(0,0,0,0.06))', margin: '6px 4px' }} />;

  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    display: 'flex',
    gap: '4px',
    background: 'var(--bg-secondary, #fff)',
    padding: '6px',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
    zIndex: 20,
    animation: 'toolbarPopoverIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
    transformOrigin: 'top center',
  };

  return (
    <>
      <style>{`
        @keyframes toolbarPopoverIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-popover { animation: none !important; }
        }
      `}</style>
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        background: 'var(--bg-secondary, #fff)',
        padding: '6px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
        zIndex: 10,
      }}>
        <button
          onClick={() => setTool('select')} title="Select (V)" aria-label="Select Tool"
          style={buttonStyle(tool === 'select')}
          onMouseEnter={(e) => { if (tool !== 'select') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { if (tool !== 'select') e.currentTarget.style.background = 'transparent'; }}
        >
          <MousePointer2 size={18} />
        </button>
        <button
          onClick={() => setTool('pan')} title="Pan (Space)" aria-label="Pan Tool"
          style={buttonStyle(tool === 'pan')}
          onMouseEnter={(e) => { if (tool !== 'pan') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { if (tool !== 'pan') e.currentTarget.style.background = 'transparent'; }}
        >
          <Hand size={18} />
        </button>

        {divider}

        <button
          onClick={() => setTool('freehand')} title="Draw (D)" aria-label="Draw Tool"
          style={buttonStyle(tool === 'freehand')}
          onMouseEnter={(e) => { if (tool !== 'freehand') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { if (tool !== 'freehand') e.currentTarget.style.background = 'transparent'; }}
        >
          <Pen size={18} />
        </button>
        
        <button
          onClick={() => setTool('eraser')} title="Eraser (E)" aria-label="Eraser Tool"
          style={buttonStyle(tool === 'eraser')}
          onMouseEnter={(e) => { if (tool !== 'eraser') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { if (tool !== 'eraser') e.currentTarget.style.background = 'transparent'; }}
        >
          <Eraser size={18} />
        </button>

        {divider}

        <button
          onClick={() => setTool('text')} title="Text (T)" aria-label="Text Tool"
          style={buttonStyle(tool === 'text')}
          onMouseEnter={(e) => { if (tool !== 'text') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { if (tool !== 'text') e.currentTarget.style.background = 'transparent'; }}
        >
          <Type size={18} />
        </button>
        
        <button
          onClick={() => setTool('sticky')} title="Sticky Note (S)" aria-label="Sticky Note Tool"
          style={buttonStyle(tool === 'sticky')}
          onMouseEnter={(e) => { if (tool !== 'sticky') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { if (tool !== 'sticky') e.currentTarget.style.background = 'transparent'; }}
        >
          <StickyNote size={18} />
        </button>

        {divider}
        
        <label
          title="Upload Media (Image/Video)" aria-label="Upload Media"
          style={{...buttonStyle(false), cursor: 'pointer', display: 'flex'}}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ImageIcon size={18} />
          <input type="file" accept="image/*,video/*" style={{display: 'none'}} onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadMedia) {
              if (file.type.startsWith('video/')) {
                const url = URL.createObjectURL(file);
                onUploadMedia('video', url);
              } else {
                const reader = new FileReader();
                reader.onload = (ev) => onUploadMedia('image', ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }
            e.target.value = '';
          }} />
        </label>

        {divider}

        {/* Shape Family */}
        <div ref={shapeRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              if (!isShapeActive) setTool('rectangle');
              setShapePaletteOpen(!shapePaletteOpen);
            }}
            title="Shapes"
            aria-label="Shapes Tool Family"
            style={buttonStyle(isShapeActive)}
            onMouseEnter={(e) => { if (!isShapeActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { if (!isShapeActive) e.currentTarget.style.background = 'transparent'; }}
            onDoubleClick={() => setShapePaletteOpen(true)}
            onContextMenu={(e) => { e.preventDefault(); setShapePaletteOpen(true); }}
          >
            <ActiveShapeIcon size={18} />
          </button>
          {shapePaletteOpen && (
            <div className="anim-popover" style={popoverStyle} role="menu" aria-label="Shape Palette">
              {shapes.map((s) => {
                const Icon = s.icon;
                const isActive = tool === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setTool(s.id as ToolType); setShapePaletteOpen(false); }}
                    title={s.label}
                    aria-label={`Select ${s.label}`}
                    style={buttonStyle(isActive)}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Connector Family */}
        <div ref={connectorRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              if (!isConnectorActive) setTool('arrow');
              setConnectorPaletteOpen(!connectorPaletteOpen);
            }}
            title="Connectors"
            aria-label="Connectors Tool Family"
            style={buttonStyle(isConnectorActive)}
            onMouseEnter={(e) => { if (!isConnectorActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { if (!isConnectorActive) e.currentTarget.style.background = 'transparent'; }}
            onDoubleClick={() => setConnectorPaletteOpen(true)}
            onContextMenu={(e) => { e.preventDefault(); setConnectorPaletteOpen(true); }}
          >
            <ActiveConnectorIcon size={18} />
          </button>
          {connectorPaletteOpen && (
            <div className="anim-popover" style={popoverStyle} role="menu" aria-label="Connector Palette">
              {connectors.map((c) => {
                const Icon = c.icon;
                const isActive = tool === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setTool(c.id as ToolType); setConnectorPaletteOpen(false); }}
                    title={c.label}
                    aria-label={`Select ${c.label}`}
                    style={buttonStyle(isActive)}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
      </div>
    </>
  );
}
