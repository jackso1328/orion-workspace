import { WhiteboardObject, Point } from './types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function screenToWorld(clientX: number, clientY: number, camera: {x: number, y: number, z: number}): Point {
  return {
    x: (clientX - camera.x) / camera.z,
    y: (clientY - camera.y) / camera.z
  };
}

export function getBoundingBox(obj: WhiteboardObject) {
  return {
    minX: Math.min(obj.x, obj.x + obj.width),
    minY: Math.min(obj.y, obj.y + obj.height),
    maxX: Math.max(obj.x, obj.x + obj.width),
    maxY: Math.max(obj.y, obj.y + obj.height)
  };
}

export function isPointInObject(p: Point, obj: WhiteboardObject): boolean {
  const bb = getBoundingBox(obj);
  
  if (obj.type === 'freehand') {
    // Basic bounding box check for freehand. 
    return p.x >= bb.minX && p.x <= bb.maxX && p.y >= bb.minY && p.y <= bb.maxY;
  }
  
  // Expand hit area slightly for lines
  if (obj.type === 'line' || obj.type === 'arrow' || Math.abs(obj.width) <= 2 || Math.abs(obj.height) <= 2) {
    const pad = 10;
    return p.x >= bb.minX - pad && p.x <= bb.maxX + pad && p.y >= bb.minY - pad && p.y <= bb.maxY + pad;
  }
  
  return p.x >= bb.minX && p.x <= bb.maxX && p.y >= bb.minY && p.y <= bb.maxY;
}

export function isRectIntersecting(
  r1: { minX: number; minY: number; maxX: number; maxY: number },
  r2: { minX: number; minY: number; maxX: number; maxY: number }
) {
  return !(r2.minX > r1.maxX || 
           r2.maxX < r1.minX || 
           r2.minY > r1.maxY ||
           r2.maxY < r1.minY);
}

export function getStickyColor(variant: string) {
  const colors: Record<string, { bg: string, border: string }> = {
    idea: { bg: '#fef08a', border: '#eab308' }, // Yellow
    question: { bg: '#bae6fd', border: '#0ea5e9' }, // Blue
    problem: { bg: '#fecaca', border: '#ef4444' }, // Red
    decision: { bg: '#bbf7d0', border: '#22c55e' }, // Green
    todo: { bg: '#e9d5ff', border: '#a855f7' }, // Purple
    reference: { bg: '#f1f5f9', border: '#94a3b8' }, // Gray
  };
  return colors[variant] || colors.idea;
}
