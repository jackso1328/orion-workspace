import { useState, useCallback, useRef, useEffect } from 'react';
import { WhiteboardDocument, WhiteboardObject, Page, Camera, ToolType } from './types';
import { generateId } from './utils';

const INITIAL_PAGE_ID = generateId();
const INITIAL_DOC: WhiteboardDocument = {
  pages: [{ id: INITIAL_PAGE_ID, name: 'Page 1', objects: {} }],
  currentPageId: INITIAL_PAGE_ID,
};

export function useWhiteboardState() {
  const [doc, setDoc] = useState<WhiteboardDocument>(() => {
    const saved = localStorage.getItem('orion-whiteboard-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Safely check structure and versioning
        if (parsed && parsed.version === 1 && Array.isArray(parsed.pages) && parsed.pages.length > 0 && parsed.currentPageId) {
          return {
            pages: parsed.pages,
            currentPageId: parsed.currentPageId
          };
        }
      } catch (e) {
        console.error('Failed to load whiteboard data', e);
      }
    }
    return INITIAL_DOC;
  });

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const [tool, setTool] = useState<ToolType>('select');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  const history = useRef<{ past: WhiteboardDocument[], future: WhiteboardDocument[] }>({ past: [], future: [] });

  // Autosave
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const dataToSave = {
          version: 1,
          pages: doc.pages,
          currentPageId: doc.currentPageId
        };
        localStorage.setItem('orion-whiteboard-data', JSON.stringify(dataToSave));
        setSaveStatus('saved');
      } catch (e) {
        console.error('Whiteboard autosave failed:', e);
        setSaveStatus('error');
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timer);
  }, [doc]);

  const pendingHistoryState = useRef<WhiteboardDocument | null>(null);

  const saveHistory = useCallback(() => {
    history.current.past.push(JSON.parse(JSON.stringify(doc)));
    if (history.current.past.length > 50) history.current.past.shift();
    history.current.future = [];
  }, [doc]);

  const startHistoryTransaction = useCallback(() => {
    pendingHistoryState.current = JSON.parse(JSON.stringify(doc));
  }, [doc]);

  const commitHistoryTransaction = useCallback(() => {
    if (pendingHistoryState.current) {
      if (JSON.stringify(pendingHistoryState.current) !== JSON.stringify(doc)) {
        history.current.past.push(pendingHistoryState.current);
        if (history.current.past.length > 50) history.current.past.shift();
        history.current.future = [];
      }
      pendingHistoryState.current = null;
    }
  }, [doc]);

  const undo = useCallback(() => {
    if (history.current.past.length === 0) return;
    const previous = history.current.past.pop()!;
    history.current.future.push(JSON.parse(JSON.stringify(doc)));
    setDoc(previous);
    setSelection(new Set());
  }, [doc]);

  const redo = useCallback(() => {
    if (history.current.future.length === 0) return;
    const next = history.current.future.pop()!;
    history.current.past.push(JSON.parse(JSON.stringify(doc)));
    setDoc(next);
    setSelection(new Set());
  }, [doc]);

  const currentPage = doc.pages.find(p => p.id === doc.currentPageId) || doc.pages[0];

  const updateObject = useCallback((id: string, partial: Partial<WhiteboardObject>) => {
    setDoc(prev => {
      const pageIndex = prev.pages.findIndex(p => p.id === prev.currentPageId);
      if (pageIndex === -1) return prev;
      
      const newPages = [...prev.pages];
      const newPage = { ...newPages[pageIndex] };
      const newObjects = { ...newPage.objects };
      
      if (!newObjects[id]) return prev;
      
      newObjects[id] = { ...newObjects[id], ...partial } as WhiteboardObject;
      newPage.objects = newObjects;
      newPages[pageIndex] = newPage;
      
      return { ...prev, pages: newPages };
    });
  }, []);

  const updateObjects = useCallback((updates: Record<string, Partial<WhiteboardObject>>) => {
    setDoc(prev => {
      const pageIndex = prev.pages.findIndex(p => p.id === prev.currentPageId);
      if (pageIndex === -1) return prev;
      
      const newPages = [...prev.pages];
      const newPage = { ...newPages[pageIndex] };
      const newObjects = { ...newPage.objects };
      
      let changed = false;
      for (const [id, partial] of Object.entries(updates)) {
        if (newObjects[id]) {
          newObjects[id] = { ...newObjects[id], ...partial } as WhiteboardObject;
          changed = true;
        }
      }
      
      if (!changed) return prev;
      newPage.objects = newObjects;
      newPages[pageIndex] = newPage;
      return { ...prev, pages: newPages };
    });
  }, []);

  const addObject = useCallback((obj: WhiteboardObject) => {
    saveHistory();
    setDoc(prev => {
      const pageIndex = prev.pages.findIndex(p => p.id === prev.currentPageId);
      if (pageIndex === -1) return prev;
      
      const newPages = [...prev.pages];
      const newPage = { ...newPages[pageIndex] };
      newPage.objects = { ...newPage.objects, [obj.id]: obj };
      newPages[pageIndex] = newPage;
      
      return { ...prev, pages: newPages };
    });
    // Remove auto-switch to select tool so users can draw multiple shapes/use tools repeatedly
    if (tool === 'text') {
      setSelection(new Set([obj.id]));
      setTool('select');
    }
  }, [saveHistory, tool]);

  const deleteObjects = useCallback((ids: string[]) => {
    saveHistory();
    setDoc(prev => {
      const pageIndex = prev.pages.findIndex(p => p.id === prev.currentPageId);
      if (pageIndex === -1) return prev;
      
      const newPages = [...prev.pages];
      const newPage = { ...newPages[pageIndex] };
      const newObjects = { ...newPage.objects };
      ids.forEach(id => delete newObjects[id]);
      newPage.objects = newObjects;
      newPages[pageIndex] = newPage;
      
      return { ...prev, pages: newPages };
    });
    setSelection(new Set());
  }, [saveHistory]);

  const duplicateObjects = useCallback((ids: string[]) => {
    saveHistory();
    setDoc(prev => {
      const pageIndex = prev.pages.findIndex(p => p.id === prev.currentPageId);
      if (pageIndex === -1) return prev;
      
      const newPages = [...prev.pages];
      const newPage = { ...newPages[pageIndex] };
      const newObjects = { ...newPage.objects };
      
      const newSelection = new Set<string>();
      ids.forEach(id => {
        const obj = newObjects[id];
        if (obj) {
          const newId = generateId();
          newObjects[newId] = JSON.parse(JSON.stringify({
            ...obj,
            id: newId,
            x: obj.x + 20,
            y: obj.y + 20
          }));
          newSelection.add(newId);
        }
      });
      
      newPage.objects = newObjects;
      newPages[pageIndex] = newPage;
      setSelection(newSelection);
      
      return { ...prev, pages: newPages };
    });
  }, [saveHistory]);

  const addPage = useCallback(() => {
    saveHistory();
    const newPageId = generateId();
    setDoc(prev => ({
      ...prev,
      pages: [...prev.pages, { id: newPageId, name: `Page ${prev.pages.length + 1}`, objects: {} }],
      currentPageId: newPageId
    }));
  }, [saveHistory]);

  const deletePage = useCallback((id: string) => {
    saveHistory();
    setDoc(prev => {
      let newPages = prev.pages.filter(p => p.id !== id);
      if (newPages.length === 0) {
        newPages = [{ id: generateId(), name: `Page 1`, objects: {} }];
      }
      const newCurrentId = prev.currentPageId === id ? newPages[0].id : prev.currentPageId;
      return { ...prev, pages: newPages, currentPageId: newCurrentId };
    });
  }, [saveHistory]);

  const pageCameras = useRef<Record<string, Camera>>({});

  // Continuously sync current camera to the current page
  useEffect(() => {
    pageCameras.current[doc.currentPageId] = camera;
  }, [camera, doc.currentPageId]);

  const switchPage = useCallback((id: string) => {
    setDoc(prev => ({ ...prev, currentPageId: id }));
    setSelection(new Set());
    if (pageCameras.current[id]) {
      setCamera(pageCameras.current[id]);
    } else {
      setCamera({ x: 0, y: 0, z: 1 }); // Default camera for unvisited/new pages
    }
  }, []);

  const duplicatePage = useCallback((id: string) => {
    saveHistory();
    setDoc(prev => {
      const pageToCopy = prev.pages.find(p => p.id === id);
      if (!pageToCopy) return prev;
      
      const newPageId = generateId();
      const newObjects: Record<string, WhiteboardObject> = {};
      Object.values(pageToCopy.objects).forEach(obj => {
        const newId = generateId();
        newObjects[newId] = JSON.parse(JSON.stringify({ ...obj, id: newId }));
      });
      
      const newPage: Page = {
        id: newPageId,
        name: `${pageToCopy.name} (copy)`,
        objects: newObjects
      };
      
      return {
        ...prev,
        pages: [...prev.pages, newPage],
        currentPageId: newPageId
      };
    });
  }, [saveHistory]);

  const reorderPage = useCallback((id: string, direction: 'left' | 'right') => {
    saveHistory();
    setDoc(prev => {
      const idx = prev.pages.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      if (direction === 'left' && idx === 0) return prev;
      if (direction === 'right' && idx === prev.pages.length - 1) return prev;
      
      const newPages = [...prev.pages];
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      const temp = newPages[idx];
      newPages[idx] = newPages[targetIdx];
      newPages[targetIdx] = temp;
      
      return { ...prev, pages: newPages };
    });
  }, [saveHistory]);

  const renamePage = useCallback((id: string, name: string) => {
    saveHistory();
    setDoc(prev => {
      const newPages = prev.pages.map(p => p.id === id ? { ...p, name } : p);
      return { ...prev, pages: newPages };
    });
  }, [saveHistory]);

  return {
    doc,
    setDoc,
    camera,
    setCamera,
    tool,
    setTool,
    selection,
    setSelection,
    currentPage,
    updateObject,
    updateObjects,
    addObject,
    deleteObjects,
    duplicateObjects,
    undo,
    redo,
    addPage,
    deletePage,
    switchPage,
    duplicatePage,
    renamePage,
    reorderPage,
    saveHistory,
    startHistoryTransaction,
    commitHistoryTransaction,
    saveStatus
  };
}
