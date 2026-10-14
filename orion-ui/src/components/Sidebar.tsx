import { NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Settings, LayoutDashboard, Briefcase, TerminalSquare, Target, Palette, BookOpen, Calendar, CheckSquare, Clock, Search, Inbox,
  GraduationCap, FileText, ClipboardList, HelpCircle, 
  PenTool, Folder,  Layers, 
  Orbit, Sparkles, Microscope,
  BarChart, Map, Quote, FlaskConical, Database, Code2, Bug, AppWindow, Network, Notebook, Users, MessageSquare, Timer, Contact
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

  { path: "/study-analytics", label: "Study Analytics", icon: BarChart, section: 'primary' },
  { path: "/syllabus-tracker", label: "Syllabus Tracker", icon: Map, section: 'primary' },
  { path: "/citations", label: "Citation Manager", icon: Quote, section: 'primary' },
  { path: "/hypotheses", label: "Hypotheses", icon: FlaskConical, section: 'primary' },
  { path: "/data-logs", label: "Data Logs", icon: Database, section: 'primary' },
  { path: "/snippets", label: "Code Snippets", icon: Code2, section: 'primary' },
  { path: "/issues", label: "Issue Tracker", icon: Bug, section: 'primary' },
  { path: "/api-docs", label: "API Docs", icon: AppWindow, section: 'primary' },
  { path: "/architecture", label: "Architecture", icon: Network, section: 'primary' },
  { path: "/lesson-plans", label: "Lesson Plans", icon: Notebook, section: 'primary' },
  { path: "/students", label: "Student Roster", icon: Users, section: 'primary' },
  { path: "/communications", label: "Communications", icon: MessageSquare, section: 'primary' },
  { path: "/meetings", label: "Meetings", icon: Users, section: 'primary' },
  { path: "/time-logs", label: "Time Tracking", icon: Timer, section: 'primary' },
  { path: "/contacts", label: "Network", icon: Contact, section: 'primary' },
  { path: "/settings", label: "Settings", icon: Settings, section: 'system' }
];

export default function Sidebar() {
  const { inbox, sidebarCollapsedGroups, toggleSidebarGroup } = useOrionStore();
  const unprocessedCount = inbox.filter(i => !i.processedAt).length;
  const activeModeId = useOrionStore(state => state.activeMode);
  const activeMode = ORION_MODES[activeModeId] || ORION_MODES['study'];

  const bottomRoute = ROUTE_REGISTRY.find(r => r.section === 'system');
  const location = useLocation();

  useEffect(() => {
    if (!activeMode.navigationGroups) return;
    const activeGroup = activeMode.navigationGroups.find(g => g.routes.includes(location.pathname));
    if (activeGroup && sidebarCollapsedGroups.includes(activeGroup.id)) {
      toggleSidebarGroup(activeGroup.id);
    }
  }, [location.pathname, activeMode.navigationGroups]);

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
        {activeMode.navigationGroups?.map(group => {
           const isCollapsed = sidebarCollapsedGroups.includes(group.id);
           
           return (
             <div className="sidebar-section" key={group.id}>
               <div 
                 className="sidebar-label" 
                 onClick={() => group.collapsible && toggleSidebarGroup(group.id)}
                 style={{ 
                   display: 'flex', 
                   justifyContent: 'space-between', 
                   cursor: group.collapsible ? 'pointer' : 'default', 
                   userSelect: 'none',
                   transition: 'opacity 0.2s',
                   opacity: isCollapsed ? 0.6 : 1
                 }}
               >
                 <span>{group.label}</span>
                 {group.collapsible && (
                   <span style={{ fontSize: '0.65rem', opacity: 0.6, transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s ease-in-out' }}>
                     ▼
                   </span>
                 )}
               </div>
               
               <div style={{
                 display: 'grid',
                 gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                 transition: 'grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                 overflow: 'hidden'
               }}>
                 <nav className="sidebar-nav" style={{ minHeight: 0 }}>
                   {group.routes.map(path => {
                     const r = ROUTE_REGISTRY.find(route => route.path === path);
                     if (!r) return null;
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
             </div>
           );
        })}


        <div className="sidebar-section bottom" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
          <nav className="sidebar-nav">
            <button className="nav-item" onClick={() => useOrionStore.getState().setSearchOpen(true)} style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }} title="Search (Cmd+K)">
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
