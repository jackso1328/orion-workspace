import { MousePointer2, Hand, Pen, Eraser, Type, Square, Circle, Triangle, Minus, ArrowRight, StickyNote } from 'lucide-react';
import { ToolType } from './types';

interface WhiteboardToolbarProps {
  tool: ToolType;
  setTool: (t: ToolType) => void;
}

export function WhiteboardToolbar({ tool, setTool }: WhiteboardToolbarProps) {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'pan', icon: Hand, label: 'Pan (Space)' },
    { id: 'freehand', icon: Pen, label: 'Draw (D)' },
    { id: 'eraser', icon: Eraser, label: 'Eraser (E)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse (O)' },
    { id: 'diamond', icon: Triangle, label: 'Diamond' },
    { id: 'line', icon: Minus, label: 'Line (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '4px',
      background: 'var(--bg-secondary, #fff)',
      padding: '6px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
      zIndex: 10,
    }}>
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = tool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id as ToolType)}
            title={t.label}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px',
              borderRadius: '8px',
              background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              color: isActive ? 'var(--accent-violet, #8b5cf6)' : 'var(--text-secondary, #64607a)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget.style.background = 'rgba(0,0,0,0.04)');
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget.style.background = 'transparent');
            }}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
