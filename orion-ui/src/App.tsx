import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./AppShell";
import Workspace from "./components/Workspace";
import OrionModule from "./components/OrionModule";
import CalendarModule from "./components/CalendarModule";
import StudyPlanner from "./components/StudyPlanner";
import NotesModule from "./components/NotesModule";
import DocumentsModule from "./components/DocumentsModule";
import PomodoroModule from "./components/PomodoroModule";
import CourseManagement from "./components/CourseManagement";
import AssignmentsModule from "./components/AssignmentsModule";
import GradebookModule from "./components/GradebookModule";
import ExamsModule from "./components/ExamsModule";
import FlashcardsModule from "./components/FlashcardsModule";
import QuizModule from "./components/QuizModule";

const Placeholder = ({ title }: { title: string }) => (
  <div className="placeholder-view">
    <h2>{title}</h2>
    <p>Module shell initialized. Core functionality coming soon.</p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* WORKSPACE */}
        <Route path="dashboard" element={<Workspace />} />
        <Route path="orion" element={<OrionModule />} />
        <Route path="calendar" element={<CalendarModule />} />
        <Route path="planner" element={<StudyPlanner />} />
        <Route path="goals" element={<Placeholder title="Learning Goals" />} />
        <Route path="pomodoro" element={<PomodoroModule />} />
        <Route path="progress" element={<Placeholder title="Progress Tracking" />} />

        {/* LEARNING */}
        <Route path="courses" element={<CourseManagement />} />
        <Route path="assignments" element={<AssignmentsModule />} />
        <Route path="exams" element={<ExamsModule />} />
        <Route path="quizzes" element={<QuizModule />} />
        <Route path="questionbank" element={<Placeholder title="Question Bank" />} />
        <Route path="grading" element={<Placeholder title="Grading System" />} />
        <Route path="gradebook" element={<GradebookModule />} />

        {/* KNOWLEDGE */}
        <Route path="notes" element={<NotesModule />} />
        <Route path="documents" element={<DocumentsModule />} />
        <Route path="whiteboard" element={<Placeholder title="Digital Whiteboard" />} />
        <Route path="flashcards" element={<FlashcardsModule />} />
        <Route path="spacedrep" element={<Navigate to="/flashcards" replace />} />
        <Route path="library" element={<Placeholder title="Resource Library" />} />

        {/* RESEARCH & DEV */}
        <Route path="research" element={<Placeholder title="Research Workspace" />} />
        <Route path="writing" element={<Placeholder title="Writing Workspace" />} />
        <Route path="challenges" element={<Placeholder title="Programming Challenges" />} />
        <Route path="portfolio" element={<Placeholder title="Developer Portfolio" />} />

        <Route path="settings" element={<Placeholder title="Settings" />} />
      </Route>
    </Routes>
  );
}
export default App;

