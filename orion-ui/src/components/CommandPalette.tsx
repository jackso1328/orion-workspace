import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES } from "../config/modes";
import { Search, Folder, CheckSquare, PenTool, Book, ClipboardList, FileText, HelpCircle, Layers, X, Inbox, Clock, Flame, Navigation, Target, Briefcase } from "lucide-react";

interface PaletteResult { type: string; id: string; title: string; icon: any; path?: string; action?: string; }

export default function CommandPalette() {
  const { isSearchOpen, setSearchOpen, tasks, documents, courses, assignments, exams, quizzes, flashcards, projects, goals, activeMode, addInboxItem } = useOrionStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let matches: PaletteResult[] = [];
    
    const modeConfig = ORION_MODES[activeMode];
    const primaryRoutes = modeConfig.primaryRoutes;
    
    if (q === "") {
      matches.push({ type: "Action", id: "act-inbox", title: "Capture to Inbox", icon: Inbox, action: "capture" });
      matches.push({ type: "Action", id: "act-task", title: "Open Tasks", icon: CheckSquare, path: "/dashboard" });
      matches.push({ type: "Action", id: "act-orion", title: "Ask Orion", icon: Flame, path: "/orion" });
      
      const navOptions = [
        { type: "Navigation", id: "nav-today", title: "Today", icon: Navigation, path: "/dashboard" },
        { type: "Navigation", id: "nav-calendar", title: "Calendar", icon: Navigation, path: "/calendar" },
        { type: "Navigation", id: "nav-pomodoro", title: "Pomodoro", icon: Navigation, path: "/pomodoro" },
        { type: "Navigation", id: "nav-notes", title: "Notes", icon: Navigation, path: "/notes" },
        { type: "Navigation", id: "nav-documents", title: "Documents", icon: Navigation, path: "/documents" },
      ];
      
      const prioritizedNav = navOptions.filter(nav => primaryRoutes.includes(nav.path as any));
      const otherNav = navOptions.filter(nav => !primaryRoutes.includes(nav.path as any));
      
      matches = [...matches, ...prioritizedNav, ...otherNav].slice(0, 8);
      return matches;
    }

    if ("capture to inbox".includes(q) || q.includes("capture") || q.includes("inbox")) matches.push({ type: "Action", id: "act-inbox", title: "Capture to Inbox", icon: Inbox, action: "capture" });
    if (q.includes("task") || "new task".includes(q)) matches.push({ type: "Action", id: "act-task", title: "Open Tasks", icon: CheckSquare, path: "/dashboard" });
    if (q.includes("note") || "new note".includes(q)) matches.push({ type: "Action", id: "act-note", title: "Open Notes", icon: PenTool, path: "/notes" });
    if (q.includes("pomodoro") || q.includes("focus") || q.includes("timer")) matches.push({ type: "Action", id: "act-pomodoro", title: "Start Pomodoro", icon: Clock, path: "/pomodoro" });
    if (q.includes("orion") || q.includes("ask") || q.includes("chat")) matches.push({ type: "Action", id: "act-orion", title: "Ask Orion", icon: Flame, path: "/orion" });

    tasks.forEach(t => { if (t.title.toLowerCase().includes(q)) matches.push({ type: "Task", id: t.id, title: t.title, icon: CheckSquare, path: "/dashboard" }); });
    documents.forEach(d => { 
      if (d.filename.toLowerCase().includes(q) || (d.content && d.content.toLowerCase().includes(q))) {
        if (d.type === "md") {
          matches.push({ type: "Note", id: d.id, title: d.filename, icon: PenTool, path: "/notes" });
        } else {
          matches.push({ type: "Document", id: d.id, title: d.filename, icon: Folder, path: "/documents" });
        }
      }
    });
    courses.forEach(c => { if (c.title.toLowerCase().includes(q)) matches.push({ type: "Course", id: c.id, title: c.title, icon: Book, path: "/courses" }); });
    assignments.forEach(a => { if (a.title.toLowerCase().includes(q)) matches.push({ type: "Assignment", id: a.id, title: a.title, icon: ClipboardList, path: "/assignments" }); });
    exams.forEach(e => { if (e.title.toLowerCase().includes(q)) matches.push({ type: "Exam", id: e.id, title: e.title, icon: FileText, path: "/exams" }); });
    quizzes.forEach(qItem => { if (qItem.title.toLowerCase().includes(q)) matches.push({ type: "Quiz", id: qItem.id, title: qItem.title, icon: HelpCircle, path: "/quizzes" }); });
    flashcards.forEach(f => { if (f.front.toLowerCase().includes(q) || f.back.toLowerCase().includes(q)) matches.push({ type: "Flashcard", id: f.id, title: f.front, icon: Layers, path: "/flashcards" }); });
    
    if (projects) projects.forEach(p => { if (p.title.toLowerCase().includes(q)) matches.push({ type: "Project", id: p.id, title: p.title, icon: Briefcase, path: "/projects" }); });
    if (goals) goals.forEach(g => { if (g.title.toLowerCase().includes(q)) matches.push({ type: "Goal", id: g.id, title: g.title, icon: Target, path: "/goals" }); });

    return matches.slice(0, 50);
  }, [query, tasks, documents, courses, assignments, exams, quizzes, flashcards, projects, goals, activeMode]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const executeResult = (res: PaletteResult) => {
    if (res.action === "capture") {
      const captureText = query.replace(/^capture\s*/i, "").trim();
      if (captureText) {
        addInboxItem(captureText);
      } else {
        navigate("/inbox");
      }
      setSearchOpen(false);
      return;
    }
    if (res.path) {
      navigate(res.path);
      setSearchOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      if (results[selectedIndex]) {
        executeResult(results[selectedIndex]);
      } else if (query.trim()) {
        addInboxItem(query);
        setSearchOpen(false);
      }
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="global-search-overlay" onClick={() => setSearchOpen(false)}>
      <div className="global-search-modal" onClick={e => e.stopPropagation()}>
        <div className="global-search-input-wrapper">
          <Search size={20} className="search-icon" style={{ color: "var(--accent-primary)" }} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search, navigate, or capture... (Cmd+K)" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="global-search-input"
            aria-label="Command Palette Input"
          />
          <button className="icon-btn close-btn" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={20} /></button>
        </div>
        
        <div className="global-search-results">
          {results.length === 0 && query.trim() !== "" ? (
            <div className="global-search-empty">
              <p>Press <kbd>Enter</kbd> to capture to Inbox.</p>
            </div>
          ) : (
            results.map((res, idx) => {
              const Icon = res.icon;
              return (
                <div 
                  key={`${res.type}-${res.id}`} 
                  className={`global-search-result-item ${idx === selectedIndex ? "selected" : ""}`}
                  onClick={() => executeResult(res)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <Icon size={18} className="result-icon" />
                  <span className="result-title">{res.title}</span>
                  <span className="result-type" style={{ color: res.type === "Action" ? "var(--accent-primary)" : "var(--text-muted)" }}>{res.type}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}