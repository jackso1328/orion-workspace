import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./components/Sidebar";
import GlobalSearch from "./components/GlobalSearch";

export default function AppShell() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleQuickCapture = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        navigate('/inbox');
      }
    };
    window.addEventListener('keydown', handleQuickCapture);
    return () => window.removeEventListener('keydown', handleQuickCapture);
  }, [navigate]);
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <GlobalSearch />
      <main className="pane-workspace">
        <Outlet />
      </main>
    </div>
  );
}


