import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// ─── Data Model ───────────────────────────────────────────────────────────────

import { QuickNoteTheme, QUICK_NOTE_THEMES } from '../components/QuickNoteArtwork';

export type QuickNoteColor =
  | 'cream'
  | 'yellow'
  | 'blue'
  | 'green'
  | 'pink'
  | 'purple'
  | 'orange'
  | 'gray';

export type QuickNoteBackground = QuickNoteTheme;

export interface QuickNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  color: QuickNoteColor;
  background: QuickNoteBackground;
  context?: {
    route: string;
    label: string;
  };
}

export interface QuickNoteGroup {
  id: string;
  title: string;
  createdAt: string;
  noteIds: string[];
}

const QUICK_NOTES_SCHEMA_VERSION = 1;

export interface QuickNotesState {
  version: number;
  notes: QuickNote[];
  groups: QuickNoteGroup[];
  
  createNote: (partial?: Partial<Pick<QuickNote, 'content' | 'color' | 'background' | 'context'>>) => string;
  updateNote: (id: string, partial: Partial<Pick<QuickNote, 'content' | 'color' | 'background'>>) => void;
  deleteNote: (id: string) => void;
  
  createGroup: (title: string, noteIds: string[]) => string;
  deleteGroup: (id: string) => void;
  removeNoteFromGroup: (groupId: string, noteId: string) => void;
  getRecentNotes: (limit?: number) => QuickNote[];
  getAllNotes: () => QuickNote[];
}

function isValidNote(n: unknown): boolean {
  if (!n || typeof n !== 'object') return false;
  const note = n as Record<string, unknown>;
  return (
    typeof note.id === 'string' &&
    typeof note.content === 'string' &&
    typeof note.createdAt === 'string' &&
    typeof note.updatedAt === 'string'
  );
}

function hydrateNote(raw: unknown): QuickNote {
  const note = raw as Record<string, unknown>;
  return {
    id:         note.id as string,
    content:    note.content as string,
    createdAt:  note.createdAt as string,
    updatedAt:  note.updatedAt as string,
    color:      (note.color as QuickNoteColor)           ?? 'cream',
    background: QUICK_NOTE_THEMES.includes(note.background as QuickNoteTheme) 
                  ? (note.background as QuickNoteTheme) 
                  : (note.background === 'plain' ? 'none' : 'stationery-minimal'),
    context:    note.context as QuickNote['context'],
  };
}

export const useQuickNotesStore = create<QuickNotesState>()(
  persist(
    (set, get) => ({
      version: QUICK_NOTES_SCHEMA_VERSION,
      notes: [],
      groups: [],

      createNote: (partial = {}) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        
        const validThemes = QUICK_NOTE_THEMES.filter(t => t !== 'none');
        const randomTheme = validThemes[Math.floor(Math.random() * validThemes.length)];

        const note: QuickNote = {
          id,
          content:    partial.content    ?? '',
          createdAt:  now,
          updatedAt:  now,
          color:      partial.color      ?? 'cream',
          background: partial.background ?? randomTheme,
          context:    partial.context,
        };
        set(state => ({ notes: [note, ...state.notes] }));
        return id;
      },

      updateNote: (id, partial) => {
        set(state => ({
          notes: state.notes.map(n =>
            n.id === id
              ? { ...n, ...partial, updatedAt: new Date().toISOString() }
              : n
          ),
        }));
      },

      deleteNote: (id) => {
        set(state => ({
          notes: state.notes.filter(n => n.id !== id),
          groups: state.groups.map(g => ({ ...g, noteIds: g.noteIds.filter(nid => nid !== id) })).filter(g => g.noteIds.length > 0)
        }));
      },

      createGroup: (title, noteIds) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        set(state => ({
          groups: [...state.groups, { id, title, createdAt: now, noteIds }]
        }));
        return id;
      },

      deleteGroup: (id) => {
        set(state => ({
          groups: state.groups.filter(g => g.id !== id)
        }));
      },

      removeNoteFromGroup: (groupId, noteId) => {
        set(state => ({
          groups: state.groups.map(g => {
            if (g.id !== groupId) return g;
            return { ...g, noteIds: g.noteIds.filter(id => id !== noteId) };
          }).filter(g => g.noteIds.length > 0) // auto-delete empty groups
        }));
      },

      getRecentNotes: (limit = 3) => {
        const { notes } = get();
        return [...notes]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, limit);
      },

      getAllNotes: () => {
        const { notes } = get();
        return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      },
    }),
    {
      name: 'orion-quick-notes',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted: unknown, current: QuickNotesState): QuickNotesState => {
        if (!persisted || typeof persisted !== 'object') return current;

        const p = persisted as Record<string, unknown>;
        const storedVersion = typeof p.version === 'number' ? p.version : 0;

        // Future breaking migrations: check storedVersion < QUICK_NOTES_SCHEMA_VERSION
        void storedVersion;

        const rawNotes: unknown[] = Array.isArray(p.notes) ? p.notes : [];
        const safeNotes: QuickNote[] = rawNotes
          .filter(isValidNote)
          .map(hydrateNote);

        const rawGroups: unknown[] = Array.isArray(p.groups) ? p.groups : [];
        const safeGroups: QuickNoteGroup[] = rawGroups.filter((g: any) => 
          typeof g === 'object' && g !== null && typeof g.id === 'string' && typeof g.title === 'string' && Array.isArray(g.noteIds)
        ) as QuickNoteGroup[];

        return {
          ...current,
          version: QUICK_NOTES_SCHEMA_VERSION,
          notes: safeNotes,
          groups: safeGroups,
        };
      },
    }
  )
);
