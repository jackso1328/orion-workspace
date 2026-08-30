import { NavLink } from "react-router-dom";
import { Settings, LayoutDashboard, Briefcase, TerminalSquare, Target, Palette, BookOpen, Calendar, CheckSquare, Clock, Search, Inbox,
  GraduationCap, FileText, ClipboardList, HelpCircle, 
  PenTool, Folder,  Layers, 
  Orbit, Sparkles, Microscope
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES } from "../config/modes";
import ModeSelector from "./ModeSelector";

const ROUTE_REGISTRY: Array<{path: string, label: string, icon: any, section: 'global' | 'knowledge' | 'system' | 'primary' | 'none'}> = [
  { path: "/inbox", label: "Inbox", icon: Inbox, section: 'global' },
  { path: "/dashboard", label: "Today", icon: LayoutDashboard, section: 'global' },
  { path: "/orion", label: "Talk to Orion", icon: Sparkles, section: 'global' },
  { path: "/notes", label: "Notes", icon: PenTool, section: 'knowledge' },
  { path: "/documents", label: "Documents", icon: Folder, section: 'knowledge' },
  { path: "/calendar", label: "Calendar", icon: Calendar, section: 'primary' },
  { path: "/planner", label: "Study Planner", icon: CheckSquare, section: 'primary' },
  { path: "/pomodoro", label: "Pomodoro Timer", icon: Clock, section: 'primary' },
  { path: "/courses", label: "Courses", icon: GraduationCap, section: 'primary' },
  { path: "/assignments", label: "Assignments", icon: ClipboardList, section: 'primary' },
  { path: "/exams", label: "Exams", icon: FileText, section: 'primary' },
  { path: "/quizzes", label: "Quizzes", icon: HelpCircle, section: 'primary' },
  { path: "/questionbank", label: "Question Bank", icon: BookOpen, section: 'primary' },
  { path: "/gradebook", label: "Gradebook", icon: FileText, section: 'primary' },
  { path: "/flashcards", label: "Flashcards", icon: Layers, section: 'primary' },
  { path: "/research", label: "Research Workspace", icon: Microscope, section: 'primary' },
  { path: "/projects", label: "Projects", icon: Briefcase, section: 'primary' },
  { path: "/developer", label: "Developer Workspace", icon: TerminalSquare, section: 'primary' },
  { path: "/goals", label: "Goals & OKRs", icon: Target, section: 'primary' },
  { path: "/whiteboard", label: "Whiteboard", icon: Palette, section: 'knowledge' },
  { path: "/settings", label: "Settings", icon: Settings, section: 'system' }
];

export default function Sidebar() {
  const { inbox } = useOrionStore();
  const unprocessedCount = inbox.filter(i => !i.processedAt).length;
  const activeModeId = useOrionStore(state => state.activeMode);
  const activeMode = ORION_MODES[activeModeId] || ORION_MODES['study'];

  const globalRoutes = ROUTE_REGISTRY.filter(r => r.section === 'global');
  const knowledgeRoutes = ROUTE_REGISTRY.filter(r => r.section === 'knowledge');
  const primaryRoutes = ROUTE_REGISTRY.filter(r => r.section === 'primary' && activeMode.primaryRoutes.includes(r.path));
  const bottomRoute = ROUTE_REGISTRY.find(r => r.section === 'system');

  return (
    <aside className="app-sidebar" >
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Orbit className="brand-icon" size={28} />
          <h3>ORION</h3>
        </div>
        <div className="brand-subtitle">Personal OS</div>
      </div>
      
      <ModeSelector />

      <div className="sidebar-scroll-area">
        <div className="sidebar-section">
          <h4 className="sidebar-label">WORKSPACE</h4>
          <nav className="sidebar-nav">
            {globalRoutes.map(r => {
              const Icon = r.icon;
              return (
                <NavLink key={r.path} to={r.path} className="nav-item" title={r.label}>
                  <Icon size={18} /> <span>{r.label}</span>
                  {r.path === '/inbox' && unprocessedCount > 0 && <span className="sidebar-badge">{unprocessedCount}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {primaryRoutes.length > 0 && (
          <div className="sidebar-section">
            <h4 className="sidebar-label">{activeMode.name.toUpperCase()}</h4>
            <nav className="sidebar-nav">
              {primaryRoutes.map(r => {
                const Icon = r.icon;
                return (
                  <NavLink key={r.path} to={r.path} className="nav-item" title={r.label}>
                    <Icon size={18} /> <span>{r.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        <div className="sidebar-section">
          <h4 className="sidebar-label">KNOWLEDGE</h4>
          <nav className="sidebar-nav">
            {knowledgeRoutes.map(r => {
              const Icon = r.icon;
              return (
                <NavLink key={r.path} to={r.path} className="nav-item" title={r.label}>
                  <Icon size={18} /> <span>{r.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-section bottom" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
          <nav className="sidebar-nav">
            <button className="nav-item" onClick={() => useOrionStore.getState().setSearchOpen(true)} style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left' }} title="Search (Cmd+K)">
              <Search size={18} /> <span>Search</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '2px 4px', borderRadius: '4px' }}>⌘K</span>
            </button>
          </nav>
        </div>

        {bottomRoute && (
          <div className="sidebar-section bottom">
            <nav className="sidebar-nav">
              <NavLink to={bottomRoute.path} className="nav-item" title={bottomRoute.label}>
                <bottomRoute.icon size={18} /> <span>{bottomRoute.label}</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}




