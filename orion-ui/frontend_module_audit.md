# Orion Frontend Module Audit

This audit evaluates the implementation status of all modules exposed in the Orion sidebar navigation.

| Route | Module | Classification | Existing Data | Existing UI | Recommended Action |
|------|------|------|------|------|------|
| `/dashboard` | Dashboard | A — FUNCTIONAL | `tasks`, `documents`, `scratchpad` | `Workspace.tsx` | Preserve. |
| `/orion` | Talk to Orion | A — FUNCTIONAL | N/A | `OrionModule.tsx` | Preserve. |
| `/calendar` | Calendar | A — FUNCTIONAL | `tasks`, `exams`, `assignments` | `CalendarModule.tsx` | Preserve. |
| `/planner` | Study Planner | A — FUNCTIONAL | `tasks` | `StudyPlanner.tsx` | Preserve. |
| `/goals` | Learning Goals | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/pomodoro` | Pomodoro Timer | A — FUNCTIONAL | `pomodoroSettings`, `tasks` | `PomodoroModule.tsx` | Preserve. |
| `/progress` | Progress Tracking | D — UNSUPPORTED | Derived, no model | Placeholder | Defer. |
| `/courses` | Courses | A — FUNCTIONAL | `courses` | `CourseManagement.tsx` | Preserve. |
| `/assignments` | Assignments | A — FUNCTIONAL | `assignments` | `AssignmentsModule.tsx` | Preserve. |
| `/exams` | Exams | A — FUNCTIONAL | `exams` | `ExamsModule.tsx` | Preserve. |
| `/quizzes` | Quizzes | A — FUNCTIONAL | `quizzes` | `QuizModule.tsx` | Preserve. |
| `/questionbank` | Question Bank | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/grading` | Grading System | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/gradebook` | Gradebook | A — FUNCTIONAL | `assignments`, `exams`, `quizzes` | `GradebookModule.tsx`| Preserve. |
| `/notes` | Notes System | A — FUNCTIONAL | `documents` (type: `md`) | `NotesModule.tsx` | Preserve. |
| `/documents` | Document Reader | C — PLACEHOLDER | `documents` (type: `pdf`, `docx`, etc) | Placeholder | **Implement**. Store supports Document objects. |
| `/whiteboard` | Digital Whiteboard | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/flashcards` | Flashcards | A — FUNCTIONAL | `flashcardDecks`, `flashcards` | `FlashcardsModule.tsx`| Preserve. (Includes spaced repetition UI) |
| `/spacedrep` | Spaced Repetition | D — UNSUPPORTED | N/A | Placeholder | Defer/Remove. Redundant with `/flashcards`. |
| `/library` | Resource Library | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/research` | Research Workspace | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/writing` | Writing Workspace | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/challenges`| Programming Challenges | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/portfolio` | Developer Portfolio | D — UNSUPPORTED | None | Placeholder | Defer. |
| `/settings` | Settings | C — PLACEHOLDER | `pomodoroSettings` | Placeholder | Defer. |

## Implementation Strategy

1. **Document Reader (`/documents`)**: The store already defines a `Document` interface and `documents` array. I will implement `DocumentsModule.tsx` to handle non-markdown document metadata/uploading.

All other placeholders are deferred.
