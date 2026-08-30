import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Calendar, CheckSquare, Clock, TrendingUp, Target,
  GraduationCap, FileText, ClipboardList, HelpCircle, FileCheck, BookOpen,
  PenTool, Folder, Monitor, Layers, Repeat, Library,
  Microscope, Edit3, Code, Briefcase, Settings, Orbit, Sparkles
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES } from "../config/modes";
import ModeSelector from "./ModeSelector";

const ROUTE_REGISTRY = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, global: true },
  { path: "/orion", label: "Talk to Orion", icon: Sparkles, global: true },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/planner", label: "Study Planner", icon: CheckSquare },
  { path: "/goals", label: "Learning Goals", icon: Target },
  { path: "/pomodoro", label: "Pomodoro Timer", icon: Clock },
  { path: "/progress", label: "Progress Tracking", icon: TrendingUp },
  { path: "/courses", label: "Courses", icon: GraduationCap },
  { path: "/assignments", label: "Assignments", icon: ClipboardList },
  { path: "/exams", label: "Exams", icon: FileText },
  { path: "/quizzes", label: "Quizzes", icon: HelpCircle },
  { path: "/questionbank", label: "Question Bank", icon: BookOpen },
  { path: "/grading", label: "Grading System", icon: FileCheck },
  { path: "/gradebook", label: "Gradebook", icon: FileText },
  { path: "/notes", label: "Notes System", icon: PenTool },
  { path: "/documents", label: "Document Reader", icon: Folder },
  { path: "/whiteboard", label: "Digital Whiteboard", icon: Monitor },
  { path: "/flashcards", label: "Flashcards", icon: Layers },
  { path: "/spacedrep", label: "Spaced Repetition", icon: Repeat },
  { path: "/library", label: "Resource Library", icon: Library },
  { path: "/research", label: "Research Workspace", icon: Microscope },
  { path: "/writing", label: "Writing Workspace", icon: Edit3 },
  { path: "/challenges", label: "Programming Challenges", icon: Code },
  { path: "/portfolio", label: "Developer Portfolio", icon: Briefcase },
  { path: "/settings", label: "Settings", icon: Settings, global: true, bottom: true }
];

export default function Sidebar() {
  const activeModeId = useOrionStore(state => state.activeMode);
  const activeMode = ORION_MODES[activeModeId] || ORION_MODES['study'];

  const globalRoutes = ROUTE_REGISTRY.filter(r => r.global && !r.bottom);
  const primaryRoutes = ROUTE_REGISTRY.filter(r => !r.global && activeMode.primaryRoutes.includes(r.path));
  const secondaryRoutes = ROUTE_REGISTRY.filter(r => !r.global && !activeMode.primaryRoutes.includes(r.path));
  const bottomRoute = ROUTE_REGISTRY.find(r => r.bottom);

  return (
    <aside className="app-sidebar" style={{ overflowY: 'auto' }}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Orbit className="brand-icon" size={28} />
          <h3>ORION</h3>
        </div>
        <div className="brand-subtitle">Personal OS</div>
      </div>
      
      <ModeSelector />

      <div className="sidebar-section">
        <h4 className="sidebar-label">WORKSPACE</h4>
        <nav className="sidebar-nav">
          {globalRoutes.map(r => {
            const Icon = r.icon;
            return (
              <NavLink key={r.path} to={r.path} className="nav-item">
                <Icon size={18} /> {r.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-label">{activeMode.name.toUpperCase()} (PRIMARY)</h4>
        <nav className="sidebar-nav">
          {primaryRoutes.map(r => {
            const Icon = r.icon;
            return (
              <NavLink key={r.path} to={r.path} className="nav-item">
                <Icon size={18} /> {r.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-label">AVAILABLE TOOLS</h4>
        <nav className="sidebar-nav">
          {secondaryRoutes.map(r => {
            const Icon = r.icon;
            return (
              <NavLink key={r.path} to={r.path} className="nav-item">
                <Icon size={18} /> {r.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {bottomRoute && (
        <div className="sidebar-section bottom">
          <nav className="sidebar-nav">
            <NavLink to={bottomRoute.path} className="nav-item">
              <bottomRoute.icon size={18} /> {bottomRoute.label}
            </NavLink>
          </nav>
        </div>
      )}
    </aside>
  );
}
