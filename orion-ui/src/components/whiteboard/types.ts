export type Point = { x: number; y: number };

export type BaseObject = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
};

export type ShapeObject = BaseObject & {
  type: 'rectangle' | 'ellipse' | 'diamond';
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
};

export type TextObject = BaseObject & {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
};

export type StickyObject = BaseObject & {
  type: 'sticky';
  text: string;
  colorVariant: 'idea' | 'question' | 'problem' | 'decision' | 'todo' | 'reference';
};

export type ArrowObject = BaseObject & {
  type: 'arrow' | 'line';
  start: Point; // relative to x,y
  end: Point;   // relative to x,y
  strokeColor: string;
  strokeWidth: number;
  label?: string;
};

export type FreehandObject = BaseObject & {
  type: 'freehand';
  points: Point[]; // relative to x,y
  strokeColor: string;
  strokeWidth: number;
};

export type ImageObject = BaseObject & {
  type: 'image';
  dataUrl: string;
};

export type WhiteboardObject =
  | ShapeObject
  | TextObject
  | StickyObject
  | ArrowObject
  | FreehandObject
  | ImageObject;

export type ToolType = 
  | 'select' 
  | 'pan' 
  | 'freehand' 
  | 'eraser' 
  | 'text' 
  | 'rectangle' 
  | 'ellipse' 
  | 'diamond' 
  | 'arrow' 
  | 'line' 
  | 'sticky' 
  | 'image';

export type Camera = {
  x: number;
  y: number;
  z: number;
};

export type Page = {
  id: string;
  name: string;
  objects: Record<string, WhiteboardObject>;
};

export type WhiteboardDocument = {
  pages: Page[];
  currentPageId: string;
};
