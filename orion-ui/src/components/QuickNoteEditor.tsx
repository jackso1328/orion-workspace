import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Palette, ExternalLink, CheckSquare, MapPin } from 'lucide-react';
import { useQuickNotesStore, QuickNoteColor } from '../store/useQuickNotesStore';
import { useOrionStore } from '../store/useOrionStore';
import QuickNoteArtwork from './QuickNoteArtwork';
import QuickNoteTimeDecoration from './QuickNoteTimeDecoration';

interface QuickNoteEditorProps {
  noteId: string;
  onClose: () => void;
  onNewNote: () => void;
}

const PAPER_COLORS: Record<QuickNoteColor, string> = {
  cream:  '#fdfaf4',
  yellow: '#fefce8',
  blue:   '#eff6ff',
  green:  '#f0fdf4',
  pink:   '#fdf2f8',
  purple: '#faf5ff',
  orange: '#fff7ed',
  gray:   '#f8fafc',
};

const ART_COLORS: Record<QuickNoteColor, string> = {
  cream:  '#b4a590',
  yellow: '#d1b95b',
  blue:   '#7c98b6',
  green:  '#84a88f',
  pink:   '#b6859e',
  purple: '#9d84b6',
  orange: '#c29074',
  gray:   '#94a3b8',
};


export default function QuickNoteEditor({ noteId, onClose, onNewNote }: QuickNoteEditorProps) {
  const navigate = useNavigate();
  const addTask = useOrionStore(state => state.addTask);
  
  const note = useQuickNotesStore(state => state.notes.find(n => n.id === noteId));
  const updateNote = useQuickNotesStore(state => state.updateNote);
  
  const [content, setContent] = useState(note?.content ?? '');
  const [showColors, setShowColors] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const latestContentRef = useRef(content);
  const lastSavedContentRef = useRef(note?.content ?? '');

  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  useEffect(() => {
    const currentNoteContent = note?.content ?? '';
    setContent(currentNoteContent);
    lastSavedContentRef.current = currentNoteContent;
    latestContentRef.current = currentNoteContent;
    setShowColors(false);
  }, [note?.id]);

  useEffect(() => {
    const currentNoteId = noteId;
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (latestContentRef.current !== lastSavedContentRef.current) {
        updateNote(currentNoteId, { content: latestContentRef.current });
      }
    };
  }, [noteId, updateNote]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [noteId]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (showColors) {
        setShowColors(false);
      } else {
        onClose();
      }
      return;
    }
    
    if (e.key === 'Tab') {
      if (!dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === dialogRef.current) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateNote(noteId, { content: val });
      lastSavedContentRef.current = val;
    }, 400);
  };

  const handleColorChange = (c: QuickNoteColor) => {
    updateNote(noteId, { color: c });
  };


  const handleOpenInNotes = () => {
    onClose();
    navigate('/notes', { state: { activeDocId: 'quick-notes', quickNoteId: noteId } });
  };

  const handleConvertToTask = () => {
    if (taskCreated) return;
    const text = latestContentRef.current.trim();
    if (!text) return;
    
    addTask({
      title: text.split('\n')[0].substring(0, 100) || 'Quick Note Task',
      description: text,
      priority: 'Medium',
      dueDate: '',
      documentIds: [],
    });
    
    setTaskCreated(true);
    setTimeout(() => setTaskCreated(false), 2000);
  };

  if (!note) return null;

  const bgColor = PAPER_COLORS[note.color] ?? PAPER_COLORS.cream;
  const artColor = ART_COLORS[note.color] ?? ART_COLORS.cream;

  return (
    <div
      onMouseDown={handleBackdropClick}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(26, 22, 37, 0.2)',
        backdropFilter: 'blur(2px)',
        zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Quick Note Editor"
        aria-modal="true"
        tabIndex={-1}
        style={{
          position: 'relative',
          width: '100%', maxWidth: '560px',
          height: '70vh',
          minHeight: 'min(400px, calc(100vh - 40px))',
          maxHeight: 'calc(100vh - 40px)',
          boxSizing: 'border-box',
          backgroundColor: bgColor,
          borderRadius: '2px 12px 12px 12px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15), 0 0 10px rgba(0,0,0,0.03)',
          display: 'flex', flexDirection: 'column',
          animation: 'quickNoteFadeIn 200ms cubic-bezier(0.19, 1, 0.22, 1) forwards',
          transformOrigin: 'center center',
          border: '1px solid rgba(0,0,0,0.06)',
          outline: 'none',
        }}
      >
        <style>{`@keyframes quickNoteFadeIn { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
        
        {/* Background Artwork */}
        <QuickNoteArtwork theme={note.background} color={artColor} />
        
        {/* Time of Day Decoration */}
        <div style={{ position: 'absolute', top: '16px', left: '24px', pointerEvents: 'none' }}>
          <QuickNoteTimeDecoration color={artColor} />
        </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            padding: '12px 16px',
            position: 'sticky',
            top: 0,
            background: 'inherit',
            zIndex: 10,
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setShowColors(!showColors); }}
                    title="Paper Color"
                    aria-label="Paper Color"
                    aria-expanded={showColors}
                    style={{
                      background: showColors ? 'rgba(0,0,0,0.08)' : 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseOver={e => !showColors && (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                    onMouseOut={e => !showColors && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Palette size={18} />
                  </button>
                  {showColors && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                      background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '8px', display: 'flex', gap: '8px',
                      flexWrap: 'wrap', width: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 20
                    }}>
                      {(Object.keys(PAPER_COLORS) as QuickNoteColor[]).map(c => (
                        <button
                          key={c}
                          aria-label={`Select ${c} color`}
                          onClick={() => handleColorChange(c)}
                          style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: PAPER_COLORS[c],
                            border: note.color === c ? '2px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer', padding: 0
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {note.context && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 8px',
                  background: 'rgba(0,0,0,0.04)', borderRadius: '4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: '120px', marginLeft: '4px'
                }} title={`Captured in ${note.context.label}`}>
                  <MapPin size={12} />
                  {note.context.label}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleConvertToTask}
                title="Convert to Task"
                aria-label="Convert to Task"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: taskCreated ? 'var(--success-color, #10b981)' : 'var(--text-secondary)', padding: '6px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  transition: 'background-color 150ms ease, color 150ms ease',
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <CheckSquare size={18} />
                {taskCreated && <span style={{ fontSize: '0.8rem', fontWeight: 500, paddingRight: '2px' }}>Created</span>}
              </button>

              <button
                onClick={handleOpenInNotes}
                title="Open in Notes"
                aria-label="Open in Notes"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 150ms ease',
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ExternalLink size={18} />
              </button>
              
              <button
                onClick={onNewNote}
                title="New Note"
                aria-label="New Note"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 150ms ease',
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Plus size={18} />
              </button>
              
              <button
                onClick={onClose}
                title="Close (Esc)"
                aria-label="Close Note"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 150ms ease',
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Start writing..."
          style={{
            flex: 1, width: '100%', resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', padding: '12px 32px 32px 32px',
            fontFamily: 'var(--font-sans)', fontSize: '1rem', lineHeight: 1.6,
            color: 'var(--text-primary)', position: 'relative', zIndex: 5
          }}
        />
      </div>
    </div>
  );
}
