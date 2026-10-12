import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import CommandPalette from "./components/CommandPalette";
import QuickNotesDock from "./components/QuickNotesDock";
import ModelDownloadModal from "./components/ModelDownloadModal";
import PermanentAiStatusBadge from "./components/PermanentAiStatusBadge";
import { useOrionStore } from "./store/useOrionStore";

export default function AppShell() {
  const location = useLocation();
  const checkAiSystemStatus = useOrionStore((state) => state.checkAiSystemStatus);

  useEffect(() => {
    checkAiSystemStatus();
  }, [checkAiSystemStatus]);

  // The AI experience lives at /orion — hide Quick Notes and floating badges there
  const isAiRoute = location.pathname === '/orion' || location.pathname.startsWith('/orion/');

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <CommandPalette />
      <main className="pane-workspace">
        <Outlet />
        {/* Floating fallback badge for small screens / standalone view (hidden on AI route) */}
        {!isAiRoute && <PermanentAiStatusBadge variant="floating" />}
      </main>
      {/* Global Quick Notes dock — hidden in AI experience */}
      {!isAiRoute && <QuickNotesDock />}
      {/* Model Download / Setup Modal */}
      <ModelDownloadModal />
    </div>
  );
}
