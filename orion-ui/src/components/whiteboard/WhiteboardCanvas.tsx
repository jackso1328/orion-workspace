import React, { useRef, useState, useEffect } from 'react';
import { Camera, ToolType, WhiteboardObject, Point, ShapeObject, TextObject, FreehandObject, StickyObject, ImageObject, ArrowObject } from './types';
import { screenToWorld, isPointInObject, generateId, getStickyColor, isRectIntersecting, getBoundingBox } from './utils';

import { ContextualToolbar } from './ContextualToolbar';

interface WhiteboardCanvasProps {
  objects: Record<string, WhiteboardObject>;
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  tool: ToolType;
  setTool: React.Dispatch<React.SetStateAction<ToolType>>;
  selection: Set<string>;
  setSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  updateObject: (id: string, partial: Partial<WhiteboardObject>) => void;
  updateObjects: (updates: Record<string, Partial<WhiteboardObject>>) => void;
  addObject: (obj: WhiteboardObject) => void;
  deleteObjects: (ids: string[]) => void;
  duplicateObjects: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  startHistoryTransaction: () => void;
  commitHistoryTransaction: () => void;
}

export function WhiteboardCanvas({
  objects, camera, setCamera, tool, setTool, selection, setSelection,
  updateObject, updateObjects, addObject, deleteObjects, duplicateObjects, undo, redo, saveHistory,
  startHistoryTransaction, commitHistoryTransaction
}: WhiteboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);
  
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  // draggingObj can now also be a resize handle: 'nw', 'ne', 'sw', 'se'
  const [draggingObj, setDraggingObj] = useState<{ 
    id: string, handle?: string, startX: number, startY: number, 
    objStartX: number, objStartY: number, objStartW?: number, objStartH?: number,
    multiStart?: Record<string, { x: number, y: number }>
  } | null>(null);
  const [editingText, setEditingText] = useState<{ id: string, text: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingText) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selection.size > 0) deleteObjects(Array.from(selection));
      }
      if (e.key === 'Escape') {
        if (selection.size > 0) setSelection(new Set());
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo(); else undo();
        e.preventDefault();
      }
      if (e.key === ' ') setIsPanning(true);
      if (e.key === 'v') setTool('select');
      if (e.key === 'h') setTool('pan');
      if (e.key === 'd') setTool('freehand');
      if (e.key === 'e') setTool('eraser');
      if (e.key === 't') setTool('text');
      if (e.key === 'r') setTool('rectangle');
      if (e.key === 'o') setTool('ellipse');
      if (e.key === 'l') setTool('line');
      if (e.key === 's') setTool('sticky');
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selection, deleteObjects, undo, redo, editingText, setTool]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (editingText) return;
      if (e.clipboardData && e.clipboardData.items) {
        for (const item of e.clipboardData.items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  addObject({
                    id: generateId(), type: 'image',
                    x: -camera.x / camera.z + 100, y: -camera.y / camera.z + 100,
                    width: 300, height: 300, rotation: 0, zIndex: Object.keys(objects).length, locked: false,
                    dataUrl: event.target.result as string
                  });
                }
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addObject, camera, editingText, objects]);

  const getPointerPos = (e: React.PointerEvent | React.WheelEvent) => {
    if (!containerRef.current) return { x: e.clientX, y: e.clientY };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getObjectAt = (pt: Point) => {
    const objList = Object.values(objects).sort((a, b) => a.zIndex - b.zIndex);
    for (let i = objList.length - 1; i >= 0; i--) {
      if (isPointInObject(pt, objList[i])) return objList[i].id;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingText) {
      if (editingText.text.trim()) {
        saveHistory();
        updateObject(editingText.id, { text: editingText.text });
      } else {
        deleteObjects([editingText.id]);
      }
      setEditingText(null);
    }

    const { x, y } = getPointerPos(e);
    const pt = screenToWorld(x, y, camera);

    if (e.button === 1 || isPanning || tool === 'pan') {
      setDraggingObj({ id: 'pan', startX: x, startY: y, objStartX: camera.x, objStartY: camera.y });
      return;
    }

    if (tool === 'eraser') {
      setIsErasing(true);
      const hitId = getObjectAt(pt);
      if (hitId) deleteObjects([hitId]);
      return;
    }

    if (tool === 'select') {
      // Check handles first
      if (selection.size === 1) {
        const selId = Array.from(selection)[0];
        const obj = objects[selId];
        if (obj && obj.type !== 'freehand' && !obj.locked) {
          const handleSize = 8 / camera.z;
          const handles = {
            nw: { x: obj.x, y: obj.y },
            ne: { x: obj.x + obj.width, y: obj.y },
            sw: { x: obj.x, y: obj.y + obj.height },
            se: { x: obj.x + obj.width, y: obj.y + obj.height },
          };
          for (const [pos, hpt] of Object.entries(handles)) {
            if (pt.x >= hpt.x - handleSize && pt.x <= hpt.x + handleSize &&
                pt.y >= hpt.y - handleSize && pt.y <= hpt.y + handleSize) {
              startHistoryTransaction();
              setDraggingObj({
                id: selId, handle: pos, startX: x, startY: y,
                objStartX: obj.x, objStartY: obj.y, objStartW: obj.width, objStartH: obj.height
              });
              return;
            }
          }
        }
      }

      const hitId = getObjectAt(pt);
      if (hitId) {
        let newSel = selection;
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            newSel = new Set(selection);
            if (newSel.has(hitId)) newSel.delete(hitId);
            else newSel.add(hitId);
            setSelection(newSel);
            return;
        } else {
            if (!selection.has(hitId)) {
                newSel = new Set([hitId]);
                setSelection(newSel);
            }
        }
        
        startHistoryTransaction();
        const multiStart: Record<string, { x: number, y: number }> = {};
        newSel.forEach(id => {
            if (objects[id] && !objects[id].locked) {
                multiStart[id] = { x: objects[id].x, y: objects[id].y };
            }
        });
        
        setDraggingObj({ 
            id: newSel.size > 1 ? 'multi' : hitId, 
            startX: x, startY: y, 
            objStartX: objects[hitId].x, objStartY: objects[hitId].y,
            multiStart
        });
      } else {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            setSelection(new Set());
        }
        setSelectionBox({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y });
      }
      return;
    }

    if (tool === 'freehand') {
      setIsDrawing(true);
      setCurrentStroke([pt]);
      return;
    }

    // Create objects
    const id = generateId();
    if (tool === 'text' || tool === 'sticky') {
      addObject({
        id, type: tool, x: pt.x, y: pt.y, width: 200, height: tool === 'text' ? 50 : 200,
        rotation: 0, zIndex: Object.keys(objects).length, locked: false, text: '',
        ...(tool === 'text' ? { fontSize: 24, color: '#000', align: 'left' } : { colorVariant: 'idea' })
      } as any);
      setEditingText({ id, text: '' });
      return;
    }

    if (['rectangle', 'ellipse', 'diamond', 'line'].includes(tool)) {
      setSelection(new Set([id]));
      addObject({
        id, type: tool, x: pt.x, y: pt.y, width: 1, height: 1,
        rotation: 0, zIndex: Object.keys(objects).length, locked: false,
        strokeColor: '#000', strokeWidth: 2, fillColor: 'transparent',
        ...(tool === 'arrow' || tool === 'line' ? { start: {x:0, y:0}, end: {x:0, y:0} } : {})
      } as any);
      // Immediately start resizing it
      setDraggingObj({ id, handle: 'se', startX: x, startY: y, objStartX: pt.x, objStartY: pt.y, objStartW: 1, objStartH: 1 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = getPointerPos(e);
    const pt = screenToWorld(x, y, camera);

    if (isErasing) {
      const hitId = getObjectAt(pt);
      if (hitId) deleteObjects([hitId]);
      return;
    }

    if (selectionBox) {
      setSelectionBox({ ...selectionBox, endX: pt.x, endY: pt.y });
      // update selection dynamically
      const minX = Math.min(selectionBox.startX, pt.x);
      const maxX = Math.max(selectionBox.startX, pt.x);
      const minY = Math.min(selectionBox.startY, pt.y);
      const maxY = Math.max(selectionBox.startY, pt.y);
      const boxRect = { minX, minY, maxX, maxY };
      
      const newSel = new Set<string>();
      Object.values(objects).forEach(obj => {
        if (isRectIntersecting(boxRect, getBoundingBox(obj))) newSel.add(obj.id);
      });
      setSelection(newSel);
      return;
    }

    if (draggingObj?.id === 'pan') {
      setCamera(c => ({ ...c, x: draggingObj.objStartX + (x - draggingObj.startX), y: draggingObj.objStartY + (y - draggingObj.startY) }));
      return;
    }

    if (draggingObj && tool === 'select' || (draggingObj?.handle && ['rectangle', 'ellipse', 'diamond', 'line'].includes(tool))) {
      const dx = (x - draggingObj.startX) / camera.z;
      const dy = (y - draggingObj.startY) / camera.z;
      
      if (draggingObj.handle) {
        // Resizing
        let newX = draggingObj.objStartX;
        let newY = draggingObj.objStartY;
        let newW = draggingObj.objStartW || 0;
        let newH = draggingObj.objStartH || 0;

        const isLine = ['line', 'arrow'].includes(objects[draggingObj.id]?.type);
        if (draggingObj.handle.includes('e')) newW = isLine ? newW + dx : Math.max(1, newW + dx);
        if (draggingObj.handle.includes('w')) {
          const w = isLine ? newW - dx : Math.max(1, newW - dx);
          newX += newW - w;
          newW = w;
        }
        if (draggingObj.handle.includes('s')) newH = isLine ? newH + dy : Math.max(1, newH + dy);
        if (draggingObj.handle.includes('n')) {
          const h = isLine ? newH - dy : Math.max(1, newH - dy);
          newY += newH - h;
          newH = h;
        }
        
        updateObject(draggingObj.id, { x: newX, y: newY, width: newW, height: newH });
      } else if (draggingObj.multiStart) {
        // Moving single or multiple objects
        const updates: Record<string, Partial<WhiteboardObject>> = {};
        for (const [id, startPos] of Object.entries(draggingObj.multiStart)) {
            updates[id] = { x: startPos.x + dx, y: startPos.y + dy };
        }
        updateObjects(updates);
      }
      return;
    }

    if (isDrawing && tool === 'freehand') {
      setCurrentStroke(prev => [...prev, pt]);
    }
  };

  const handlePointerUp = () => {
    setIsErasing(false);
    if (selectionBox) setSelectionBox(null);
    if (draggingObj) {
      if (draggingObj.id !== 'pan') commitHistoryTransaction();
      if (['rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(tool) && draggingObj.handle) {
         const obj = objects[draggingObj.id];
         if (obj && ['line', 'arrow'].includes(obj.type) && Math.abs(obj.width) < 5 && Math.abs(obj.height) < 5) {
           deleteObjects([draggingObj.id]);
         }
         setTool('select');
      }
      setDraggingObj(null);
    }
    if (isDrawing) {
      if (currentStroke.length > 1) {
        const minX = Math.min(...currentStroke.map(p => p.x));
        const maxX = Math.max(...currentStroke.map(p => p.x));
        const minY = Math.min(...currentStroke.map(p => p.y));
        const maxY = Math.max(...currentStroke.map(p => p.y));
        
        addObject({
          id: generateId(), type: 'freehand',
          x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY),
          rotation: 0, zIndex: Object.keys(objects).length, locked: false,
          points: currentStroke.map(p => ({ x: p.x - minX, y: p.y - minY })),
          strokeColor: '#000', strokeWidth: 4
        });
      }
      setIsDrawing(false);
      setCurrentStroke([]);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = Math.exp(-e.deltaY * 0.01);
      setCamera(c => {
        const newZ = Math.min(Math.max(c.z * zoomFactor, 0.1), 5);
        const { x: cx, y: cy } = getPointerPos(e);
        const newX = cx - (cx - c.x) * (newZ / c.z);
        const newY = cy - (cy - c.y) * (newZ / c.z);
        return { x: newX, y: newY, z: newZ };
      });
    } else {
      setCamera(c => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
    }
  };

  return (
    <div ref={containerRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onWheel={handleWheel}
      style={{ width: '100%', height: '100%', background: '#f8f9fa', overflow: 'hidden', touchAction: 'none',
        cursor: isPanning || tool === 'pan' ? 'grab' : tool === 'text' ? 'text' : tool === 'eraser' ? 'crosshair' : tool !== 'select' ? 'crosshair' : 'default', position: 'relative' }}>
      <svg style={{ width: '100%', height: '100%', transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`, transformOrigin: '0 0' }}>
        {Object.values(objects).map(obj => (
          <g key={obj.id} transform={`translate(${obj.x}, ${obj.y}) rotate(${obj.rotation})`} onDoubleClick={() => { if (!obj.locked && (obj.type === 'text' || obj.type === 'sticky')) setEditingText({ id: obj.id, text: (obj as TextObject).text }); }}>
            {obj.type === 'rectangle' && <rect width={Math.max(1, obj.width)} height={Math.max(1, obj.height)} rx={8} fill={(obj as ShapeObject).fillColor || 'none'} stroke={(obj as ShapeObject).strokeColor} strokeWidth={(obj as ShapeObject).strokeWidth} />}
            {obj.type === 'ellipse' && <ellipse cx={obj.width/2} cy={obj.height/2} rx={Math.max(1, obj.width/2)} ry={Math.max(1, obj.height/2)} fill={(obj as ShapeObject).fillColor || 'none'} stroke={(obj as ShapeObject).strokeColor} strokeWidth={(obj as ShapeObject).strokeWidth} />}
            {obj.type === 'diamond' && <polygon points={`${obj.width/2},0 ${obj.width},${obj.height/2} ${obj.width/2},${obj.height} 0,${obj.height/2}`} fill={(obj as ShapeObject).fillColor || 'none'} stroke={(obj as ShapeObject).strokeColor} strokeWidth={(obj as ShapeObject).strokeWidth} />}
            {obj.type === 'line' && <line x1={0} y1={0} x2={obj.width} y2={obj.height} stroke={(obj as ArrowObject).strokeColor} strokeWidth={(obj as ArrowObject).strokeWidth} />}
            {obj.type === 'arrow' && (
              <g>
                <line x1={0} y1={0} x2={obj.width} y2={obj.height} stroke={(obj as ArrowObject).strokeColor} strokeWidth={(obj as ArrowObject).strokeWidth} />
                <polygon 
                  points={`0,0 -12,6 -12,-6`} 
                  fill={(obj as ArrowObject).strokeColor}
                  transform={`translate(${obj.width}, ${obj.height}) rotate(${Math.atan2(obj.height, obj.width) * 180 / Math.PI})`}
                />
              </g>
            )}
            {obj.type === 'freehand' && (
              <polyline points={(obj as FreehandObject).points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={(obj as FreehandObject).strokeColor} strokeWidth={(obj as FreehandObject).strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {obj.type === 'sticky' && (
              <g>
                <rect width={Math.max(10, obj.width)} height={Math.max(10, obj.height)} rx={4} fill={getStickyColor((obj as StickyObject).colorVariant).bg} stroke={getStickyColor((obj as StickyObject).colorVariant).border} strokeWidth={1} />
                <foreignObject x={10} y={10} width={Math.max(1, obj.width - 20)} height={Math.max(1, obj.height - 20)}>
                  <div style={{ width: '100%', height: '100%', fontSize: '18px', fontFamily: 'var(--font-sans)', color: '#1e293b', overflowWrap: 'break-word', overflow: 'hidden' }}>
                    {editingText?.id !== obj.id && (obj as StickyObject).text}
                  </div>
                </foreignObject>
              </g>
            )}
            {obj.type === 'text' && editingText?.id !== obj.id && (
              <text x={0} y={24} fontSize={(obj as TextObject).fontSize} fill={(obj as TextObject).color} fontFamily="var(--font-sans)">
                {(obj as TextObject).text}
              </text>
            )}
            {obj.type === 'image' && <image href={(obj as ImageObject).dataUrl} width={obj.width} height={obj.height} preserveAspectRatio="none" />}
            
            {selection.has(obj.id) && selection.size === 1 && (
              <g>
                <rect 
                   x={Math.min(0, obj.width) - 2} 
                   y={Math.min(0, obj.height) - 2} 
                   width={Math.abs(obj.width) + 4} 
                   height={Math.abs(obj.height) + 4} 
                   fill="none" stroke="#8b5cf6" strokeWidth={2 / camera.z} strokeDasharray="4 4" pointerEvents="none" />
                {selection.size === 1 && obj.type !== 'freehand' && !obj.locked && ['nw','ne','sw','se'].map(handle => {
                   const hx = handle.includes('w') ? Math.min(0, obj.width) - 6/camera.z : Math.max(0, obj.width) - 2/camera.z;
                   const hy = handle.includes('n') ? Math.min(0, obj.height) - 6/camera.z : Math.max(0, obj.height) - 2/camera.z;
                   return <rect key={handle} x={hx} y={hy} width={8/camera.z} height={8/camera.z} fill="#fff" stroke="#8b5cf6" strokeWidth={2/camera.z} style={{ cursor: `${handle}-resize` }} />;
                })}
              </g>
            )}
          </g>
        ))}
        {isDrawing && currentStroke.length > 0 && <polyline points={currentStroke.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
        {selectionBox && (
           <rect 
             x={Math.min(selectionBox.startX, selectionBox.endX)} 
             y={Math.min(selectionBox.startY, selectionBox.endY)} 
             width={Math.abs(selectionBox.endX - selectionBox.startX)} 
             height={Math.abs(selectionBox.endY - selectionBox.startY)} 
             fill="rgba(139, 92, 246, 0.1)" stroke="#8b5cf6" strokeWidth={1/camera.z} />
        )}
        {selection.size > 1 && (() => {
           let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
           selection.forEach(id => {
               const obj = objects[id];
               if (obj) {
                   const bb = getBoundingBox(obj);
                   if (bb.minX < minX) minX = bb.minX;
                   if (bb.minY < minY) minY = bb.minY;
                   if (bb.maxX > maxX) maxX = bb.maxX;
                   if (bb.maxY > maxY) maxY = bb.maxY;
               }
           });
           if (minX === Infinity) return null;
           return (
               <rect 
                 x={minX - 4} y={minY - 4} 
                 width={maxX - minX + 8} height={maxY - minY + 8} 
                 fill="rgba(139, 92, 246, 0.05)" stroke="#8b5cf6" strokeWidth={2 / camera.z} 
                 strokeDasharray="4 4" pointerEvents="none" 
               />
           );
        })()}
      </svg>
      <ContextualToolbar
        objects={objects}
        selection={selection}
        camera={camera}
        updateObject={updateObject}
        updateObjects={updateObjects}
        deleteObjects={deleteObjects}
        duplicateObjects={duplicateObjects}
        saveHistory={saveHistory}
        isEditingText={!!editingText}
      />
      {editingText && (
        <textarea
          autoFocus value={editingText.text} onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
          style={{
            position: 'absolute', left: objects[editingText.id].x * camera.z + camera.x, top: objects[editingText.id].y * camera.z + camera.y,
            width: objects[editingText.id].width * camera.z, height: objects[editingText.id].height * camera.z,
            fontSize: (objects[editingText.id].type === 'text' ? (objects[editingText.id] as TextObject).fontSize : 18) * camera.z,
            fontFamily: 'var(--font-sans)', background: 'transparent', border: '2px solid #8b5cf6', outline: 'none', resize: 'none',
            color: objects[editingText.id].type === 'sticky' ? '#1e293b' : '#000',
            padding: objects[editingText.id].type === 'sticky' ? `${10 * camera.z}px` : 0, boxSizing: 'border-box'
          }} />
      )}
    </div>
  );
}
