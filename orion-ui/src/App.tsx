import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./AppShell";
import TodayModule from "./components/TodayModule";
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
import ProjectsModule from "./components/ProjectsModule";
import DeveloperWorkspace from "./components/DeveloperWorkspace";
import GoalsModule from "./components/GoalsModule";
import WhiteboardModule from "./components/WhiteboardModule";
import QuestionBankModule from "./components/QuestionBankModule";
import QuizModule from "./components/QuizModule";
import SettingsModule from "./components/SettingsModule";
import ComingSoon from "./components/ComingSoon";
import ResearchWorkspace from "./components/ResearchWorkspace";
import InboxModule from "./components/InboxModule";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* WORKSPACE */}
        <Route path="inbox" element={<InboxModule />} />
        <Route path="dashboard" element={<TodayModule />} />
        <Route path="orion" element={<OrionModule />} />
        <Route path="calendar" element={<CalendarModule />} />
        <Route path="planner" element={<StudyPlanner />} />
        <Route path="pomodoro" element={<PomodoroModule />} />
        <Route path="progress" element={<Navigate to="/dashboard" replace />} />

        {/* LEARNING & PROFESSIONAL */}
        <Route path="courses" element={<CourseManagement />} />
        <Route path="projects" element={<ProjectsModule />} />
        <Route path="developer" element={<DeveloperWorkspace />} />
        <Route path="goals" element={<GoalsModule />} />
        <Route path="assignments" element={<AssignmentsModule />} />
        <Route path="exams" element={<ExamsModule />} />
        <Route path="quizzes" element={<QuizModule />} />
        <Route path="questionbank" element={<QuestionBankModule />} />
        <Route path="gradebook" element={<GradebookModule />} />
        <Route path="grading" element={<ComingSoon title="Grading System" />} />

        {/* KNOWLEDGE */}
        <Route path="notes" element={<NotesModule />} />
        <Route path="documents" element={<DocumentsModule />} />
        <Route path="whiteboard" element={<WhiteboardModule />} />
        <Route path="flashcards" element={<FlashcardsModule />} />
        <Route path="spacedrep" element={<Navigate to="/flashcards" replace />} />
        <Route path="library" element={<Navigate to="/documents" replace />} />

        {/* RESEARCH & DEV */}
        <Route path="research" element={<ResearchWorkspace />} />
        <Route path="writing" element={<Navigate to="/notes" replace />} />
        <Route path="settings" element={<SettingsModule />} />
      </Route>
    </Routes>
  );
}
export default App;
