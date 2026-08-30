import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";

export default function AppShell() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="pane-workspace">
        <Outlet />
      </main>
    </div>
  );
}
