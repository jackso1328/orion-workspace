import { useState, useRef, useEffect } from 'react';
import { StickyNote } from 'lucide-react';
import { useQuickNotesStore } from '../store/useQuickNotesStore';
import QuickNoteEditor from './QuickNoteEditor';



function useIdleAnimation(isPaused: boolean, timeout: number = 45000) {
  const [isIdleAnimate, setIsIdleAnimate] = useState(false);
  const timerRef = useRef<number | null>(null);
  const animClearRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) {
      setIsIdleAnimate(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (animClearRef.current) window.clearTimeout(animClearRef.current);
      return;
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return;

    const resetTimer = () => {
      setIsIdleAnimate(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (animClearRef.current) window.clearTimeout(animClearRef.current);
      
      timerRef.current = window.setTimeout(() => {
        setIsIdleAnimate(true);
        animClearRef.current = window.setTimeout(() => {
          setIsIdleAnimate(false);
        }, 1500);
      }, timeout);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'focusin'];
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    
    resetTimer();

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (animClearRef.current) window.clearTimeout(animClearRef.current);
    };
  }, [isPaused, timeout]);

  return isIdleAnimate;
}

import { useLocation } from 'react-router-dom';

function getContextLabel(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Home';
  const name = parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
}

export default function QuickNotesDock() {
  const location = useLocation();
  const notes = useQuickNotesStore(state => state.notes);
  const createNote = useQuickNotesStore(state => state.createNote);
  const [hovered, setHovered] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const isIdleAnimate = useIdleAnimation(hovered || activeNoteId !== null, 40000);

  const topThree = [...notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
    
  const STACK_COLORS = ['#f5f0fa', '#efe8f7', '#e9e0f4']; // top, middle, bottom sheets

  const sheets = [0, 1, 2].map(i => ({
    color: STACK_COLORS[i],
    hasContent: !!topThree[i]?.content,
  }));

  const VISIBLE_WIDTH = 12;
  const SHEET_HEIGHT  = 64;
  const SHEET_WIDTH   = 88;
  const OFFSET_Y      = 6;

  const totalHeight = SHEET_HEIGHT + OFFSET_Y * 2;

  const handleOpenNotes = () => {
    if (topThree.length > 0) {
      setActiveNoteId(topThree[0].id);
    } else {
      const newId = createNote({
        context: {
          route: location.pathname + location.search,
          label: getContextLabel(location.pathname)
        }
      });
      setActiveNoteId(newId);
    }
  };

  const handleClose = () => {
    setActiveNoteId(null);
    dockRef.current?.focus();
  };

  return (
    <>
    <style>{`
      @keyframes idlePopSheet0 {
        0%, 100% { transform: translateX(calc(88px - var(--peek))) rotate(0deg); }
        40% { transform: translateX(calc(88px - var(--peek) - 6px)) rotate(-2deg); }
        70% { transform: translateX(calc(88px - var(--peek) + 2px)) rotate(1deg); }
      }
      @keyframes idlePopSheet1 {
        0%, 100% { transform: translateX(calc(88px - var(--peek))) rotate(-2deg); }
        40% { transform: translateX(calc(88px - var(--peek) - 8px)) rotate(-5deg); }
        70% { transform: translateX(calc(88px - var(--peek) + 2px)) rotate(-1deg); }
      }
      @keyframes idlePopSheet2 {
        0%, 100% { transform: translateX(calc(88px - var(--peek))) rotate(-4deg); }
        40% { transform: translateX(calc(88px - var(--peek) - 10px)) rotate(-8deg); }
        70% { transform: translateX(calc(88px - var(--peek) + 2px)) rotate(-2deg); }
      }
    `}</style>
    <div
      ref={dockRef}
      aria-label="Quick Notes — click to open"
      role="button"
      tabIndex={0}
      title="Quick Notes"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleOpenNotes}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenNotes();
        }
      }}
      style={{
        position:   'fixed',
        right:      0,
        top:        '50%',
        transform:  'translateY(-50%)',
        zIndex:     200,
        width:      VISIBLE_WIDTH,
        height:     totalHeight,
        cursor:     'pointer',
        userSelect: 'none',
      }}
    >
      {[2, 1, 0].map((sheetIdx) => {
        const sheet  = sheets[sheetIdx];
        const peek   = hovered ? VISIBLE_WIDTH + 14 + sheetIdx * 4 : VISIBLE_WIDTH + sheetIdx * 2;
        const yBase  = sheetIdx * OFFSET_Y;
        const rotation = sheetIdx === 0 ? 0 : sheetIdx === 1 ? -2 : -4;

        return (
          <div
            key={sheetIdx}
            style={{
              position:        'absolute',
              right:           0,
              top:             yBase,
              width:           SHEET_WIDTH,
              height:          SHEET_HEIGHT,
              transform:       `translateX(${SHEET_WIDTH - peek}px) rotate(${rotation}deg)`,
              transformOrigin: 'right center',
              transition:      'transform 220ms cubic-bezier(0.19, 1, 0.22, 1), box-shadow 200ms ease',
              animation:       isIdleAnimate && !hovered ? `idlePopSheet${sheetIdx} 1.2s cubic-bezier(0.25, 1, 0.5, 1)` : 'none',
              // @ts-ignore
              '--peek':        `${peek}px`,
              backgroundColor: sheet.color,
              borderRadius:    '10px 0 0 10px',
              boxShadow:       hovered
                ? `-4px 2px 14px rgba(0,0,0,0.13), -1px 0 0 rgba(0,0,0,0.05)`
                : `-2px 1px 6px rgba(0,0,0,0.06), -1px 0 0 rgba(0,0,0,0.03)`,
              border:          '1px solid rgba(0,0,0,0.06)',
              borderRight:     'none',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'flex-start',
              paddingLeft:     10,
              gap:             6,
            }}
          >
            {sheetIdx === 0 && (
              <StickyNote
                size={16}
                style={{
                  color:      'var(--accent-violet, #8b5cf6)',
                  opacity:    hovered ? 1 : 0.7,
                  transition: 'opacity 200ms ease',
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{
              flex:       1,
              display:    'flex',
              flexDirection: 'column',
              gap:        6,
              paddingRight: 8,
            }}>
              {[0, 1, 2].map(line => (
                <div
                  key={line}
                  style={{
                    height:          1,
                    backgroundColor: sheet.hasContent && sheetIdx === 0
                      ? 'rgba(139, 92, 246, 0.25)'
                      : 'rgba(0,0,0,0.07)',
                    borderRadius:    1,
                    width:           line === 2 ? '55%' : '100%',
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {notes.length === 0 && (
        <div
          style={{
            position:   'absolute',
            right:      0,
            top:        '50%',
            transform:  `translateY(-50%) translateX(${hovered ? VISIBLE_WIDTH + 14 : VISIBLE_WIDTH + 60}px)`,
            transition: 'transform 250ms cubic-bezier(0.19, 1, 0.22, 1), opacity 200ms ease',
            opacity:    0,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontSize:   '0.7rem',
            color:      'var(--text-muted)',
          }}
        >
          Quick Notes
        </div>
      )}
    </div>
    
    {activeNoteId && (
      <QuickNoteEditor
        noteId={activeNoteId}
        onClose={handleClose}
        onNewNote={() => {
          const newId = createNote({
            context: {
              route: location.pathname + location.search,
              label: getContextLabel(location.pathname)
            }
          });
          setActiveNoteId(newId);
        }}
      />
    )}
    </>
  );
}
