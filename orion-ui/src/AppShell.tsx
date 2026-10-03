import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import CommandPalette from "./components/CommandPalette";
import QuickNotesDock from "./components/QuickNotesDock";

export default function AppShell() {
  const location = useLocation();

  // The AI experience lives at /orion — hide Quick Notes there
  const isAiRoute = location.pathname === '/orion' || location.pathname.startsWith('/orion/');

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <CommandPalette />
      <main className="pane-workspace">
        <Outlet />
      </main>
      {/* Global Quick Notes dock — hidden in AI experience */}
      {!isAiRoute && <QuickNotesDock />}
    </div>
  );
}
