import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Calendar, CheckSquare, Clock, 
  GraduationCap, FileText, ClipboardList, HelpCircle, 
  PenTool, Folder,  Layers, 
  Orbit, Sparkles
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES } from "../config/modes";
import ModeSelector from "./ModeSelector";

const ROUTE_REGISTRY: Array<{path: string, label: string, icon: any, global?: boolean, bottom?: boolean}> = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, global: true },
  { path: "/orion", label: "Talk to Orion", icon: Sparkles, global: true },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/planner", label: "Study Planner", icon: CheckSquare },
  { path: "/pomodoro", label: "Pomodoro Timer", icon: Clock },
  { path: "/courses", label: "Courses", icon: GraduationCap },
  { path: "/assignments", label: "Assignments", icon: ClipboardList },
  { path: "/exams", label: "Exams", icon: FileText },
  { path: "/quizzes", label: "Quizzes", icon: HelpCircle },
  { path: "/gradebook", label: "Gradebook", icon: FileText },
  { path: "/notes", label: "Notes System", icon: PenTool },
  { path: "/documents", label: "Document Reader", icon: Folder },
  { path: "/flashcards", label: "Flashcards", icon: Layers },
];

export default function Sidebar() {
  const activeModeId = useOrionStore(state => state.activeMode);
  const activeMode = ORION_MODES[activeModeId] || ORION_MODES['study'];

  const globalRoutes = ROUTE_REGISTRY.filter(r => r.global && !r.bottom);
  const primaryRoutes = ROUTE_REGISTRY.filter(r => !r.global && activeMode.primaryRoutes.includes(r.path));
  const secondaryRoutes = ROUTE_REGISTRY.filter(r => !r.global && !activeMode.primaryRoutes.includes(r.path));
  const bottomRoute = ROUTE_REGISTRY.find(r => r.bottom);

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
              <NavLink key={r.path} to={r.path} className="nav-item" title={r.label}>
                <Icon size={18} /> <span>{r.label}</span>
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
              <NavLink key={r.path} to={r.path} className="nav-item" title={r.label}>
                <Icon size={18} /> <span>{r.label}</span>
              </NavLink>
            );
          })}
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








