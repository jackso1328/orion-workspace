import React from 'react';
import { Camera, WhiteboardObject, ShapeObject, TextObject, StickyObject, ArrowObject } from './types';
import { getBoundingBox } from './utils';
import { Trash2, Copy, Lock, Unlock } from 'lucide-react';

interface ContextualToolbarProps {
  objects: Record<string, WhiteboardObject>;
  selection: Set<string>;
  camera: Camera;
  updateObject: (id: string, partial: Partial<WhiteboardObject>) => void;
  updateObjects: (updates: Record<string, Partial<WhiteboardObject>>) => void;
  deleteObjects: (ids: string[]) => void;
  duplicateObjects: (ids: string[]) => void;
  saveHistory: () => void;
  isEditingText: boolean;
}

export function ContextualToolbar({
  objects, selection, camera, updateObject, updateObjects, deleteObjects, duplicateObjects, saveHistory, isEditingText
}: ContextualToolbarProps) {
  if (selection.size === 0 || isEditingText) return null;

  // Calculate bounding box of selection
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const selectedObjs: WhiteboardObject[] = [];
  selection.forEach(id => {
    const obj = objects[id];
    if (obj) {
      selectedObjs.push(obj);
      const bb = getBoundingBox(obj);
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
  });

  if (selectedObjs.length === 0) return null;

  // Map world bounds to screen coords
  const screenMinX = minX * camera.z + camera.x;
  const screenMinY = minY * camera.z + camera.y;
  
  // Position the toolbar slightly above the selection, or below if too close to top
  let top = screenMinY - 60;
  if (top < 20) {
      const screenMaxY = maxY * camera.z + camera.y;
      top = screenMaxY + 20;
  }
  
  let left = screenMinX;
  if (left < 20) left = 20;

  const isMulti = selectedObjs.length > 1;
  const obj = selectedObjs[0];
  const allLocked = selectedObjs.every(o => o.locked);

  const handleToggleLock = () => {
    saveHistory();
    const updates: Record<string, Partial<WhiteboardObject>> = {};
    selectedObjs.forEach(o => updates[o.id] = { locked: !allLocked });
    updateObjects(updates);
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', borderRadius: '6px',
    padding: '6px 8px', cursor: 'pointer', color: 'var(--text-primary)',
    gap: '6px', fontSize: '0.8rem', fontWeight: 500,
  };
  
  const iconBtnStyle: React.CSSProperties = {
    ...btnStyle, padding: '6px'
  };

  const divider = <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />;

  return (
    <div style={{
      position: 'absolute',
      top, left,
      transform: 'translateY(-100%)',
      background: 'var(--bg-secondary, #fff)',
      border: '1px solid var(--border-card, rgba(0,0,0,0.06))',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderRadius: '8px',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      zIndex: 100,
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
      pointerEvents: 'auto',
    }}
    onPointerDown={(e) => e.stopPropagation()} // Prevent selection from clearing
    >
      {!isMulti && obj.type === 'text' && (
        <>
          <select 
            value={(obj as TextObject).fontSize} 
            onChange={(e) => { saveHistory(); updateObject(obj.id, { fontSize: parseInt(e.target.value) }); }}
            style={{ ...btnStyle, appearance: 'auto' }}
          >
            {[12,14,16,20,24,32,48,64].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          <input 
            type="color" 
            value={(obj as TextObject).color} 
            onChange={(e) => { updateObject(obj.id, { color: e.target.value }); }}
            onBlur={() => saveHistory()}
            style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          />
          {divider}
        </>
      )}

      {!isMulti && ['rectangle', 'ellipse', 'diamond'].includes(obj.type) && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0 4px' }}>
            <span>Fill</span>
            <input 
              type="color" 
              value={(obj as ShapeObject).fillColor || '#ffffff'} 
              onChange={(e) => { updateObject(obj.id, { fillColor: e.target.value }); }}
              onBlur={() => saveHistory()}
              style={{ width: 20, height: 20, padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0 4px' }}>
            <span>Border</span>
            <input 
              type="color" 
              value={(obj as ShapeObject).strokeColor || '#000000'} 
              onChange={(e) => { updateObject(obj.id, { strokeColor: e.target.value }); }}
              onBlur={() => saveHistory()}
              style={{ width: 20, height: 20, padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
          </div>
          <select 
            value={(obj as ShapeObject).strokeWidth} 
            onChange={(e) => { saveHistory(); updateObject(obj.id, { strokeWidth: parseInt(e.target.value) }); }}
            style={{ ...btnStyle, appearance: 'auto' }}
          >
            {[1,2,4,8].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          {divider}
        </>
      )}

      {!isMulti && ['line', 'arrow', 'freehand'].includes(obj.type) && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0 4px' }}>
            <span>Stroke</span>
            <input 
              type="color" 
              value={(obj as ArrowObject).strokeColor || '#000000'} 
              onChange={(e) => { updateObject(obj.id, { strokeColor: e.target.value }); }}
              onBlur={() => saveHistory()}
              style={{ width: 20, height: 20, padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
          </div>
          <select 
            value={(obj as ArrowObject).strokeWidth} 
            onChange={(e) => { saveHistory(); updateObject(obj.id, { strokeWidth: parseInt(e.target.value) }); }}
            style={{ ...btnStyle, appearance: 'auto' }}
          >
            {[1,2,4,8].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          {divider}
        </>
      )}

      {!isMulti && obj.type === 'sticky' && (
        <>
          <select 
            value={(obj as StickyObject).colorVariant} 
            onChange={(e) => { saveHistory(); updateObject(obj.id, { colorVariant: e.target.value as any }); }}
            style={{ ...btnStyle, appearance: 'auto' }}
          >
            <option value="idea">Idea</option>
            <option value="question">Question</option>
            <option value="problem">Problem</option>
            <option value="decision">Decision</option>
            <option value="todo">Todo</option>
            <option value="reference">Reference</option>
          </select>
          {divider}
        </>
      )}

      <button style={iconBtnStyle} onClick={handleToggleLock} title={allLocked ? 'Unlock' : 'Lock'}>
        {allLocked ? <Unlock size={16} /> : <Lock size={16} />}
      </button>
      
      <button style={iconBtnStyle} onClick={() => duplicateObjects(Array.from(selection))} title="Duplicate">
        <Copy size={16} />
      </button>
      
      <button style={{ ...iconBtnStyle, color: '#ef4444' }} onClick={() => deleteObjects(Array.from(selection))} title="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}
