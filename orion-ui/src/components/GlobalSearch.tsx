import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrionStore } from "../store/useOrionStore";
import { Search, Folder, CheckSquare, PenTool, Book, ClipboardList, FileText, HelpCircle, Layers, X } from "lucide-react";

export default function GlobalSearch() {
  const { isSearchOpen, setSearchOpen, tasks, documents, courses, assignments, exams, quizzes, flashcards } = useOrionStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matches: any[] = [];

    tasks.forEach(t => { if (t.title.toLowerCase().includes(q)) matches.push({ type: 'Task', id: t.id, title: t.title, icon: CheckSquare, path: '/dashboard' }); });
    documents.forEach(d => { 
      if (d.filename.toLowerCase().includes(q) || d.content?.toLowerCase().includes(q)) {
        if (d.type === 'md') {
          matches.push({ type: 'Note', id: d.id, title: d.filename, icon: PenTool, path: '/notes' });
        } else {
          matches.push({ type: 'Document', id: d.id, title: d.filename, icon: Folder, path: '/documents' });
        }
      }
    });
    courses.forEach(c => { if (c.title.toLowerCase().includes(q)) matches.push({ type: 'Course', id: c.id, title: c.title, icon: Book, path: '/courses' }); });
    assignments.forEach(a => { if (a.title.toLowerCase().includes(q)) matches.push({ type: 'Assignment', id: a.id, title: a.title, icon: ClipboardList, path: '/assignments' }); });
    exams.forEach(e => { if (e.title.toLowerCase().includes(q)) matches.push({ type: 'Exam', id: e.id, title: e.title, icon: FileText, path: '/exams' }); });
    quizzes.forEach(qItem => { if (qItem.title.toLowerCase().includes(q)) matches.push({ type: 'Quiz', id: qItem.id, title: qItem.title, icon: HelpCircle, path: '/quizzes' }); });
    flashcards.forEach(f => { if (f.front.toLowerCase().includes(q) || f.back.toLowerCase().includes(q)) matches.push({ type: 'Flashcard', id: f.id, title: f.front, icon: Layers, path: '/flashcards' }); });

    return matches.slice(0, 50);
  }, [query, tasks, documents, courses, assignments, exams, quizzes, flashcards]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) {
        navigate(results[selectedIndex].path);
        setSearchOpen(false);
      }
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="global-search-overlay" onClick={() => setSearchOpen(false)}>
      <div className="global-search-modal" onClick={e => e.stopPropagation()}>
        <div className="global-search-input-wrapper">
          <Search size={20} className="search-icon" style={{ color: 'var(--accent-primary)' }} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search anything... (Cmd+K)" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="global-search-input"
            aria-label="Global search input"
          />
          <button className="icon-btn close-btn" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={20} /></button>
        </div>
        
        <div className="global-search-results">
          {query.trim() === "" ? (
            <div className="global-search-empty">
              <p>Type to search across tasks, documents, notes, courses, and more.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="global-search-empty">
              <p>No results found for "{query}".</p>
            </div>
          ) : (
            results.map((res, idx) => {
              const Icon = res.icon;
              return (
                <div 
                  key={`-`} 
                  className={`global-search-result-item ${idx === selectedIndex ? "selected" : ""}`}
                  onClick={() => { navigate(res.path); setSearchOpen(false); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      navigate(res.path);
                      setSearchOpen(false);
                    }
                  }}
                >
                  <Icon size={18} className="result-icon" />
                  <span className="result-title">{res.title}</span>
                  <span className="result-type">{res.type}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


