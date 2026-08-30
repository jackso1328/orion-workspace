import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Calendar, CheckSquare, Clock, TrendingUp, Target,
  GraduationCap, FileText, ClipboardList, HelpCircle, FileCheck, BookOpen,
  PenTool, Folder, Monitor, Layers, Repeat, Library,
  Microscope, Edit3, Code, Briefcase, Settings, Orbit, Sparkles
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="app-sidebar" style={{ overflowY: 'auto' }}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Orbit className="brand-icon" size={28} />
          <h3>ORION</h3>
        </div>
        <div className="brand-subtitle">Personal OS</div>
      </div>
      
      <div className="sidebar-section">
        <h4 className="sidebar-label">WORKSPACE</h4>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="nav-item"><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink to="/orion" className="nav-item"><Sparkles size={18} /> Talk to Orion</NavLink>
          <NavLink to="/calendar" className="nav-item"><Calendar size={18} /> Calendar</NavLink>
          <NavLink to="/planner" className="nav-item"><CheckSquare size={18} /> Study Planner</NavLink>
          <NavLink to="/goals" className="nav-item"><Target size={18} /> Learning Goals</NavLink>
          <NavLink to="/pomodoro" className="nav-item"><Clock size={18} /> Pomodoro Timer</NavLink>
          <NavLink to="/progress" className="nav-item"><TrendingUp size={18} /> Progress Tracking</NavLink>
        </nav>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-label">LEARNING</h4>
        <nav className="sidebar-nav">
          <NavLink to="/courses" className="nav-item"><GraduationCap size={18} /> Courses</NavLink>
          <NavLink to="/assignments" className="nav-item"><ClipboardList size={18} /> Assignments</NavLink>
          <NavLink to="/exams" className="nav-item"><FileText size={18} /> Exams</NavLink>
          <NavLink to="/quizzes" className="nav-item"><HelpCircle size={18} /> Quizzes</NavLink>
          <NavLink to="/questionbank" className="nav-item"><BookOpen size={18} /> Question Bank</NavLink>
          <NavLink to="/grading" className="nav-item"><FileCheck size={18} /> Grading System</NavLink>
          <NavLink to="/gradebook" className="nav-item"><FileText size={18} /> Gradebook</NavLink>
        </nav>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-label">KNOWLEDGE</h4>
        <nav className="sidebar-nav">
          <NavLink to="/notes" className="nav-item"><PenTool size={18} /> Notes System</NavLink>
          <NavLink to="/documents" className="nav-item"><Folder size={18} /> Document Reader</NavLink>
          <NavLink to="/whiteboard" className="nav-item"><Monitor size={18} /> Digital Whiteboard</NavLink>
          <NavLink to="/flashcards" className="nav-item"><Layers size={18} /> Flashcards</NavLink>
          <NavLink to="/spacedrep" className="nav-item"><Repeat size={18} /> Spaced Repetition</NavLink>
          <NavLink to="/library" className="nav-item"><Library size={18} /> Resource Library</NavLink>
        </nav>
      </div>

      <div className="sidebar-section">
        <h4 className="sidebar-label">RESEARCH & DEV</h4>
        <nav className="sidebar-nav">
          <NavLink to="/research" className="nav-item"><Microscope size={18} /> Research Workspace</NavLink>
          <NavLink to="/writing" className="nav-item"><Edit3 size={18} /> Writing Workspace</NavLink>
          <NavLink to="/challenges" className="nav-item"><Code size={18} /> Programming Challenges</NavLink>
          <NavLink to="/portfolio" className="nav-item"><Briefcase size={18} /> Developer Portfolio</NavLink>
        </nav>
      </div>

      <div className="sidebar-section bottom">
        <nav className="sidebar-nav">
          <NavLink to="/settings" className="nav-item">
            <Settings size={18} /> Settings
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}
