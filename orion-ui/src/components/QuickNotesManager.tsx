import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { useQuickNotesStore, QuickNote } from '../store/useQuickNotesStore';
import { useOrionStore } from '../store/useOrionStore';
import { ChevronDown, ChevronRight, CheckSquare, Square, Trash2, FolderPlus, X, Search, MapPin } from 'lucide-react';
import QuickNoteEditor from './QuickNoteEditor';

// Matches PAPER_COLORS in QuickNoteEditor
const PAPER_COLORS: Record<string, string> = {
  cream:  '#fdfaf4',
  yellow: '#fefce8',
  blue:   '#eff6ff',
  green:  '#f0fdf4',
  pink:   '#fdf2f8',
  purple: '#faf5ff',
  orange: '#fff7ed',
  gray:   '#f8fafc',
};

function getLocalDateString(dateStr: string) {
  const d = new Date(dateStr);
  return startOfDay(d).toISOString();
}

function getHumanDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

export default function QuickNotesManager() {
  const notes = useQuickNotesStore(state => state.notes);
  const groups = useQuickNotesStore(state => state.groups);
  const deleteNote = useQuickNotesStore(state => state.deleteNote);
  const createNote = useQuickNotesStore(state => state.createNote);
  const createGroup = useQuickNotesStore(state => state.createGroup);
  const deleteGroup = useQuickNotesStore(state => state.deleteGroup);
  const removeNoteFromGroup = useQuickNotesStore(state => state.removeNoteFromGroup);

  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.quickNoteId) {
      setEditingNoteId(location.state.quickNoteId);
      // Clear the state so refreshing doesn't keep opening it
      navigate(location.pathname, { replace: true, state: { ...location.state, quickNoteId: undefined } });
    }
  }, [location.state, location.pathname, navigate]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(n => n.content.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  // Reconcile selection state when filter changes
  useEffect(() => {
    if (searchQuery.trim() && selectedNotes.size > 0) {
      const visibleIds = new Set(filteredNotes.map(n => n.id));
      const next = new Set<string>();
      selectedNotes.forEach(id => {
        if (visibleIds.has(id)) next.add(id);
      });
      if (next.size !== selectedNotes.size) {
        setSelectedNotes(next);
      }
    }
  }, [searchQuery, filteredNotes, selectedNotes]);

  // Group notes by local date
  const dateGroups = useMemo(() => {
    const map = new Map<string, QuickNote[]>();
    filteredNotes.forEach(note => {
      const d = getLocalDateString(note.createdAt);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(note);
    });
    
    // Sort dates newest first
    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    
    return sortedDates.map(dateKey => {
      const dateNotes = map.get(dateKey)!;
      // Sort notes within date by newest first
      dateNotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      
      return {
        dateKey,
        label: getHumanDate(dateKey),
        notes: dateNotes
      };
    });
  }, [filteredNotes]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedNotes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNotes(next);
  };

  const toggleSelectAllDate = (dateNotes: QuickNote[]) => {
    const allSelected = dateNotes.every(n => selectedNotes.has(n.id));
    const next = new Set(selectedNotes);
    if (allSelected) {
      dateNotes.forEach(n => next.delete(n.id));
    } else {
      dateNotes.forEach(n => next.add(n.id));
    }
    setSelectedNotes(next);
  };

  const toggleGroupCollapse = (groupId: string) => {
    const next = new Set(collapsedGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setCollapsedGroups(next);
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
    const next = new Set(selectedNotes);
    next.delete(id);
    setSelectedNotes(next);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedNotes.size} selected notes?`)) {
      selectedNotes.forEach(id => deleteNote(id));
      setSelectedNotes(new Set());
    }
  };

  const handleDeleteDate = (dateNotes: QuickNote[], label: string) => {
    if (window.confirm(`Delete all ${dateNotes.length} notes from ${label}?`)) {
      dateNotes.forEach(n => deleteNote(n.id));
      // Remove from selection
      const next = new Set(selectedNotes);
      dateNotes.forEach(n => next.delete(n.id));
      setSelectedNotes(next);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupTitle.trim() || selectedNotes.size === 0) return;
    createGroup(newGroupTitle.trim(), Array.from(selectedNotes));
    setNewGroupTitle('');
    setShowGroupDialog(false);
    setSelectedNotes(new Set());
  };

  if (notes.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No quick notes yet.</h3>
        <p>Capture a thought from the Quick Notes paper stack on the right edge.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      
      {/* Search Bar */}
      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search quick notes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Search quick notes"
          style={{
            width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
            border: '1px solid var(--border-color)', background: 'var(--bg-panel)',
            color: 'var(--text-primary)', fontSize: '0.95rem'
          }}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            style={{ 
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' 
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {filteredNotes.length === 0 && searchQuery.trim() !== '' && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No quick notes match your search.</p>
        </div>
      )}
      {/* Top Action Bar for Multi-select */}
      {selectedNotes.size > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--bg-panel)', padding: '12px 20px',
          borderRadius: '8px', border: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontWeight: 500 }}>{selectedNotes.size} selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowGroupDialog(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg-active)', border: 'none', padding: '6px 12px',
                borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)'
              }}
            >
              <FolderPlus size={16} /> Group
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: 'none', padding: '6px 12px',
                borderRadius: '6px', cursor: 'pointer', color: 'var(--danger-color, #ef4444)'
              }}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Group Dialog */}
      {showGroupDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.2)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-panel)', padding: '24px', borderRadius: '12px',
            width: '400px', border: '1px solid var(--border-color)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Create heading</h3>
            <input
              type="text"
              autoFocus
              value={newGroupTitle}
              onChange={e => setNewGroupTitle(e.target.value)}
              placeholder="e.g. Hemoglobin Research"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px',
                border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                color: 'var(--text-primary)', marginBottom: '20px'
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setShowGroupDialog(false); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowGroupDialog(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleCreateGroup} style={{ background: 'var(--accent-color, #8b5cf6)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Date Groups */}
      {dateGroups.map(({ dateKey, label, notes: dateNotes }) => {
        // Find which groups exist for this date
        const dateNoteIds = new Set(dateNotes.map(n => n.id));
        const activeGroupsForDate = groups.filter(g => g.noteIds.some(id => dateNoteIds.has(id)));
        
        // Notes that are in a group
        const groupedNoteIds = new Set(activeGroupsForDate.flatMap(g => g.noteIds));
        
        // Notes that are NOT in a group
        const ungroupedNotes = dateNotes.filter(n => !groupedNoteIds.has(n.id));

        const allSelected = dateNotes.every(n => selectedNotes.has(n.id));

        return (
          <div key={dateKey} style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 600 }}>{label}</h2>
                <button
                  onClick={() => toggleSelectAllDate(dateNotes)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.85rem'
                  }}
                >
                  {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  Select all
                </button>
              </div>
              <button
                onClick={() => handleDeleteDate(dateNotes, label)}
                title="Delete all notes from this date"
                aria-label="Delete all notes from this date"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Render Groups */}
            {activeGroupsForDate.map(group => {
              const isCollapsed = collapsedGroups.has(group.id);
              // Only get notes that actually exist and belong to this date
              const groupNotes = group.noteIds
                .map(id => dateNotes.find(n => n.id === id))
                .filter((n): n is QuickNote => n !== undefined)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                
              if (groupNotes.length === 0) return null; // Safe rendering if invalid

              return (
                <div key={group.id} style={{ marginBottom: '16px', marginLeft: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <button
                      onClick={() => toggleGroupCollapse(group.id)}
                      aria-label={isCollapsed ? "Expand group" : "Collapse group"}
                      aria-expanded={!isCollapsed}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-primary)' }}
                    >
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <span style={{ fontWeight: 500 }}>{group.title}</span>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      title="Ungroup (keep notes)"
                      aria-label="Ungroup (keep notes)"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 'auto' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '26px' }}>
                      {groupNotes.map(note => (
                        <NoteListItem
                          key={note.id}
                          note={note}
                          isSelected={selectedNotes.has(note.id)}
                          onSelect={() => toggleSelection(note.id)}
                          onClick={() => setEditingNoteId(note.id)}
                          onRemoveFromGroup={() => removeNoteFromGroup(group.id, note.id)}
                          onDelete={() => handleDeleteNote(note.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Ungrouped Notes */}
            {ungroupedNotes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '8px' }}>
                {activeGroupsForDate.length > 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Ungrouped</div>
                )}
                {ungroupedNotes.map(note => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isSelected={selectedNotes.has(note.id)}
                    onSelect={() => toggleSelection(note.id)}
                    onClick={() => setEditingNoteId(note.id)}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                ))}
              </div>
            )}

          </div>
        );
      })}
      
      {/* Existing Quick Note Editor overlay */}
      {editingNoteId && (
        <QuickNoteEditor
          noteId={editingNoteId}
          onClose={() => setEditingNoteId(null)}
          onNewNote={() => {
            const newId = createNote();
            setEditingNoteId(newId);
          }}
        />
      )}
    </div>
  );
}

function NoteListItem({ note, isSelected, onSelect, onClick, onRemoveFromGroup, onDelete }: { note: QuickNote, isSelected: boolean, onSelect: () => void, onClick: () => void, onRemoveFromGroup?: () => void, onDelete: () => void }) {
  const bgColor = PAPER_COLORS[note.color] ?? PAPER_COLORS.cream;
  const timeStr = format(new Date(note.createdAt), 'hh:mm a');
  const [taskCreated, setTaskCreated] = useState(false);
  const addTask = useOrionStore(state => state.addTask);

  const handleConvertToTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (taskCreated) return;
    const text = note.content.trim();
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
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <button
        onClick={onSelect}
        aria-label={isSelected ? "Deselect note" : "Select note"}
        style={{
          marginTop: '6px', background: 'transparent', border: 'none', cursor: 'pointer',
          color: isSelected ? 'var(--accent-color, #8b5cf6)' : 'var(--text-muted)'
        }}
      >
        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>
      
      <div
        role="button"
        tabIndex={0}
        aria-label="Open note"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        onClick={onClick}
        style={{
          flex: 1, backgroundColor: bgColor, borderRadius: '8px', padding: '12px 16px',
          border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.02)', display: 'flex', gap: '16px',
          alignItems: 'center', transition: 'transform 100ms ease',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseOut={e => e.currentTarget.style.transform = 'none'}
      >
        <span style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap', fontWeight: 500, minWidth: '70px' }}>
          {timeStr}
        </span>
        <span style={{ flex: 1, color: 'rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.95rem' }}>
          {note.content || <em style={{ opacity: 0.5 }}>Empty note</em>}
        </span>
        {note.context && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '120px'
          }} title={`Captured in ${note.context.label}`}>
            <MapPin size={12} />
            {note.context.label}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
        <button
          onClick={handleConvertToTask}
          title="Convert to Task"
          aria-label="Convert to Task"
          style={{
            marginTop: '6px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: taskCreated ? 'var(--success-color, #10b981)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <CheckSquare size={16} />
          {taskCreated && <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Task Created</span>}
        </button>
        {onRemoveFromGroup && (
          <button
            onClick={onRemoveFromGroup}
            title="Remove from group"
            aria-label="Remove from group"
            style={{
              marginTop: '6px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            <X size={16} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete note"
          aria-label="Delete note"
          style={{
            marginTop: '6px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
