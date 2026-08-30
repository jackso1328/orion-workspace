import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { OrionModeId } from '../config/modes';
import { Plan, PlanItem, PlanStatus } from '../domain/planning/types';
import { validatePlanItems } from '../domain/planning/validation';
import { InboxItem } from '../domain/inbox/types';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // ISO string
  startTime?: string; // ISO string for Planner
  endTime?: string; // ISO string for Planner
  estimatedMinutes?: number;
  pomodorosCompleted?: number;
  courseId?: string;
  projectId?: string;
  documentIds: string[];
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
  color: string;
}

export interface Project {
  id: string;
  title: string;
  status: 'Active' | 'Completed' | 'Archived';
  tags: string[];
  color: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  metric: string;
  target: number;
  current: number;
  deadline?: string;
}


export interface Citation { id: string; title: string; authors: string[]; year: number; url?: string; notes?: string; }
export interface Hypothesis { id: string; title: string; description: string; status: 'Draft' | 'Testing' | 'Validated' | 'Rejected'; }
export interface DataLog { id: string; date: string; experiment: string; observations: string; }
export interface Issue { id: string; title: string; status: 'Open' | 'InProgress' | 'Resolved'; priority: 'Low' | 'Medium' | 'High'; projectId?: string; }
export interface LessonPlan { id: string; title: string; courseId: string; date: string; content: string; }
export interface Student { id: string; name: string; email: string; courseIds: string[]; performanceScore?: number; }
export interface Communication { id: string; subject: string; body: string; date: string; recipients: string[]; }
export interface Meeting { id: string; title: string; date: string; attendees: string[]; notes: string; }
export interface TimeLog { id: string; date: string; durationMinutes: number; taskId?: string; description: string; }
export interface Contact { id: string; name: string; role: string; email: string; notes?: string; }

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
}

export interface Whiteboard {
  id: string;
  title: string;
  data: string; // JSON
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  nextReviewDate: string;
  interval: number;
  easeFactor: number;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  color: string;
}
export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Submitted' | 'Graded';
  grade?: number;
  maxGrade: number;
}
export interface CourseLesson {
  id: string;
  title: string;
  isCompleted: boolean;
  type: 'video' | 'text' | 'quiz';
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface ExamTopic {
  name: string;
  completed: boolean;
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  date: string;
  durationMinutes: number;
  topics: ExamTopic[];
  targetScore?: number;
  achievedScore?: number;
}


export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface QuizAttempt {
  attemptId: string;
  completedAt: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string>;
}

export interface Quiz {
  id: string;
  title: string;
  courseId?: string;
  deckId?: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  timeLimit?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  progress: number;
  category: string;
  color: string;
  modules: CourseModule[];
}
export interface Document {
  id: string;
  filename: string;
  type: 'pdf' | 'docx' | 'txt' | 'md';
  sizeBytes: number;
  uploadedAt: string;
  courseId?: string;
  content?: string; // Rich text content for notes
}

export interface OrionState {
  inbox: InboxItem[];
  addInboxItem: (content: string) => void;
  removeInboxItem: (id: string) => void;
  markInboxItemProcessed: (id: string) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  activeMode: OrionModeId;
  setActiveMode: (mode: OrionModeId) => void;
  tasks: Task[];
  projects: Project[];
  addProject: (p: Omit<Project, 'id'>) => void;
  updateProject: (id: string, u: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  goals: Goal[];
  addGoal: (g: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, u: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  snippets: Snippet[];
  addSnippet: (s: Omit<Snippet, 'id'>) => void;
  updateSnippet: (id: string, u: Partial<Snippet>) => void;
  deleteSnippet: (id: string) => void;
  whiteboards: Whiteboard[];
  addWhiteboard: (w: Omit<Whiteboard, 'id'>) => void;
  updateWhiteboard: (id: string, u: Partial<Whiteboard>) => void;
  deleteWhiteboard: (id: string) => void;
  documents: Document[];
  scratchpad: string;
  pomodoroSettings: { pomodoro: number; shortBreak: number; longBreak: number; };
  courses: Course[];
  assignments: Assignment[];
  flashcardDecks: FlashcardDeck[];
  flashcards: Flashcard[];
  exams: Exam[];
    citations: Citation[];
    hypotheses: Hypothesis[];
    dataLogs: DataLog[];
    issues: Issue[];
    lessonPlans: LessonPlan[];
    students: Student[];
    communications: Communication[];
    meetings: Meeting[];
    timeLogs: TimeLog[];
    contacts: Contact[];


  quizzes: Quiz[];
  addQuiz: (quiz: Omit<Quiz, 'id' | 'attempts'>) => void;
  updateQuiz: (id: string, updates: Partial<Quiz>) => void;
  deleteQuiz: (id: string) => void;
  recordQuizAttempt: (quizId: string, attempt: QuizAttempt) => void;

  
  // Exam Actions
  addExam: (exam: Omit<Exam, 'id'>) => void;
  updateExam: (id: string, updates: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  toggleExamTopic: (examId: string, topicIndex: number) => void;
  
  // Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'color'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompletion: (id: string) => void;
  updateScratchpad: (content: string) => void;
  updatePomodoroSettings: (settings: Partial<OrionState['pomodoroSettings']>) => void;
  addDocument: (doc: Omit<Document, 'uploadedAt'> & { id?: string }) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  addCourse: (course: Omit<Course, 'id' | 'progress'>) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  addFlashcardDeck: (deck: Omit<FlashcardDeck, 'id'>) => void;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'nextReviewDate' | 'interval' | 'easeFactor'>) => void;
  updateFlashcardReview: (id: string, quality: number) => void;

  // Planning
  plans: Plan[];
  addPlan: (items: Omit<PlanItem, 'id'>[]) => void;
  updatePlanStatus: (id: string, status: PlanStatus) => void;
  removePlan: (id: string) => void;
}

const ACCENT_COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#14b8a6", "#f59e0b", "#f43f5e"];

export const useOrionStore = create<OrionState>()(
  persist(
    (set) => ({
      isSearchOpen: false,
      setSearchOpen: (open) => set({ isSearchOpen: open }),
      activeMode: 'study',
      setActiveMode: (mode) => set({ activeMode: mode }),
      inbox: [],
      addInboxItem: (content) => set((state) => ({ inbox: [{ id: uuidv4(), content, createdAt: new Date().toISOString() }, ...state.inbox] })),
      removeInboxItem: (id) => set((state) => ({ inbox: state.inbox.filter((item) => item.id !== id) })),
      markInboxItemProcessed: (id) => set((state) => ({ inbox: state.inbox.map((item) => item.id === id ? { ...item, processedAt: new Date().toISOString() } : item) })),
      
      citations: [],
      hypotheses: [],
      dataLogs: [],
      issues: [],
      lessonPlans: [],
      students: [],
      communications: [],
      meetings: [],
      timeLogs: [],
      contacts: [],
      tasks: [],
      projects: [],
      addProject: (p) => set((s) => ({ projects: [{ ...p, id: uuidv4() }, ...s.projects] })),
      updateProject: (id, u) => set((s) => ({ projects: s.projects.map(x => x.id === id ? { ...x, ...u } : x) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter(x => x.id !== id) })),
      goals: [],
      addGoal: (g) => set((s) => ({ goals: [{ ...g, id: uuidv4() }, ...s.goals] })),
      updateGoal: (id, u) => set((s) => ({ goals: s.goals.map(x => x.id === id ? { ...x, ...u } : x) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter(x => x.id !== id) })),
      snippets: [],
      addSnippet: (sn) => set((s) => ({ snippets: [{ ...sn, id: uuidv4() }, ...s.snippets] })),
      updateSnippet: (id, u) => set((s) => ({ snippets: s.snippets.map(x => x.id === id ? { ...x, ...u } : x) })),
      deleteSnippet: (id) => set((s) => ({ snippets: s.snippets.filter(x => x.id !== id) })),
      whiteboards: [],
      addWhiteboard: (w) => set((s) => ({ whiteboards: [{ ...w, id: uuidv4() }, ...s.whiteboards] })),
      updateWhiteboard: (id, u) => set((s) => ({ whiteboards: s.whiteboards.map(x => x.id === id ? { ...x, ...u } : x) })),
      deleteWhiteboard: (id) => set((s) => ({ whiteboards: s.whiteboards.filter(x => x.id !== id) })),
      documents: [
        {
          id: "default-note",
          filename: "Getting Started with ORION",
          type: "md",
          sizeBytes: 1024,
          uploadedAt: new Date().toISOString(),
          content: "<h1>Welcome to ORION Notes</h1><p>Start typing or press '/' for commands.</p>"
        }
      ],
      scratchpad: "Idea: Integrate calendar API next week.",
      pomodoroSettings: { pomodoro: 25, shortBreak: 5, longBreak: 15 },
      flashcardDecks: [
        { id: 'deck-1', title: 'React Fundamentals', color: '#61dafb' },
        { id: 'deck-2', title: 'Data Structures', color: '#8b5cf6' }
      ],
      flashcards: [
        { id: 'card-1', deckId: 'deck-1', front: 'What is a closure?', back: 'A function that remembers its outer variables.', nextReviewDate: new Date().toISOString(), interval: 1, easeFactor: 2.5 },
        { id: 'card-2', deckId: 'deck-1', front: 'What does useEffect do?', back: 'Lets you perform side effects in function components.', nextReviewDate: new Date(Date.now() - 86400000).toISOString(), interval: 1, easeFactor: 2.5 }
      ],

      
      quizzes: [
        {
          id: 'quiz-1',
          title: 'Advanced React Hooks Quiz',
          courseId: 'course-1',
          questions: [
            {
              id: 'q1',
              type: 'multiple-choice',
              prompt: 'Which hook is best for managing complex state objects in React?',
              options: ['useState', 'useReducer', 'useContext', 'useMemo'],
              correctAnswer: '1',
              explanation: 'useReducer is often preferable to useState when you have complex state logic that involves multiple sub-values.'
            },
            {
              id: 'q2',
              type: 'true-false',
              prompt: 'useEffect always runs after every render by default.',
              correctAnswer: 'true',
              explanation: 'Without a dependency array, useEffect runs after every single render.'
            }
          ],
          attempts: []
        }
      ],
      exams: [
        {
          id: 'exam-1',
          title: 'Midterm Calculus',
          courseId: 'course-1',
          date: new Date(Date.now() + 86400000 * 3).toISOString(),
          durationMinutes: 120,
          topics: [
            { name: 'Derivatives', completed: true },
            { name: 'Integrals', completed: false },
            { name: 'Limits', completed: true },
            { name: 'Series', completed: false }
          ],
          targetScore: 90
        }
      ],
      assignments: [
        {
          id: 'assign-1',
          courseId: 'course-1',
          title: 'React Hooks Implementation',
          description: 'Build a custom useLocalStorage hook.',
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          status: 'Not Started',
          maxGrade: 100
        },
        {
          id: 'assign-2',
          courseId: 'course-1',
          title: 'Context API Quiz',
          description: 'Multiple choice quiz on React Context.',
          dueDate: new Date(Date.now() - 86400000).toISOString(),
          status: 'Graded',
          grade: 95,
          maxGrade: 100
        }
      ],
      courses: [
        {
          id: 'course-1',
          title: 'Advanced React Patterns',
          description: 'Master higher-order components, compound components, and hooks.',
          progress: 33,
          category: 'Computer Science',
          color: '#3b82f6',
          modules: [
            {
              id: 'mod-1',
              title: 'Component Architecture',
              lessons: [
                { id: 'les-1', title: 'State Colocation', isCompleted: true, type: 'video' },
                { id: 'les-2', title: 'Compound Components', isCompleted: false, type: 'text' }
              ]
            }
          ]
        }
      ],

      addTask: (taskData) => set((state) => ({
        tasks: [
          {
            ...taskData,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            status: 'Pending',
            color: ACCENT_COLORS[state.tasks.length % ACCENT_COLORS.length],
            documentIds: taskData.documentIds || [],
          },
          ...state.tasks
        ]
      })),

      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),

      toggleTaskCompletion: (id) => set((state) => ({
        tasks: state.tasks.map(t => {
          if (t.id === id) {
            const isCompleted = t.status === 'Completed';
            return {
              ...t,
              status: isCompleted ? 'Pending' : 'Completed',
              completedAt: isCompleted ? undefined : new Date().toISOString()
            };
          }
          return t;
        })
      })),

      updateScratchpad: (content) => set({ scratchpad: content }),

            addCourse: (courseData) => set((state) => ({
        courses: [
          {
            ...courseData,
            id: uuidv4(),
            progress: 0,
          },
          ...state.courses
        ]
      })),

      updateCourse: (id, updates) => set((state) => ({
        courses: state.courses.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
            addAssignment: (assignmentData) => set((state) => ({
        assignments: [
          {
            ...assignmentData,
            id: uuidv4(),
          },
          ...state.assignments
        ]
      })),

      updateAssignment: (id, updates) => set((state) => ({
        assignments: state.assignments.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
            addFlashcardDeck: (deckData) => set((state) => ({
        flashcardDecks: [{ ...deckData, id: uuidv4() }, ...state.flashcardDecks]
      })),

      addFlashcard: (cardData) => set((state) => ({
        flashcards: [
          {
            ...cardData,
            id: uuidv4(),
            nextReviewDate: new Date().toISOString(),
            interval: 1,
            easeFactor: 2.5
          },
          ...state.flashcards
        ]
      })),

      updateFlashcardReview: (id, quality) => set((state) => {
        return {
          flashcards: state.flashcards.map(card => {
            if (card.id === id) {
              // SuperMemo-2 algorithm simplified
              let easeFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
              if (easeFactor < 1.3) easeFactor = 1.3;
              
              let interval = card.interval;
              if (quality < 3) {
                interval = 1;
              } else if (card.interval === 1) {
                interval = 6;
              } else {
                interval = Math.round(card.interval * easeFactor);
              }
              
              return {
                ...card,
                easeFactor,
                interval,
                nextReviewDate: new Date(Date.now() + interval * 86400000).toISOString()
              };
            }
            return card;
          })
        };
      }),
      updatePomodoroSettings: (settings) => set((state) => ({
        pomodoroSettings: { ...state.pomodoroSettings, ...settings }
      })),

              
      addQuiz: (quiz) => set((state) => ({
        quizzes: [...state.quizzes, { ...quiz, id: Math.random().toString(36).substr(2, 9), attempts: [] }]
      })),
      updateQuiz: (id, updates) => set((state) => ({
        quizzes: state.quizzes.map(q => q.id === id ? { ...q, ...updates } : q)
      })),
      deleteQuiz: (id) => set((state) => ({
        quizzes: state.quizzes.filter(q => q.id !== id)
      })),
      recordQuizAttempt: (quizId, attempt) => set((state) => ({
        quizzes: state.quizzes.map(q => {
          if (q.id === quizId) {
            return { ...q, attempts: [...q.attempts, attempt] };
          }
          return q;
        })
      })),

      addExam: (exam) => set((state) => ({
          exams: [...state.exams, { ...exam, id: Math.random().toString(36).substr(2, 9) }]
        })),
        updateExam: (id, updates) => set((state) => ({
          exams: state.exams.map(e => e.id === id ? { ...e, ...updates } : e)
        })),
        deleteExam: (id) => set((state) => ({
          exams: state.exams.filter(e => e.id !== id)
        })),
        toggleExamTopic: (examId, topicIndex) => set((state) => ({
          exams: state.exams.map(e => {
            if (e.id === examId) {
              const newTopics = [...e.topics];
              newTopics[topicIndex].completed = !newTopics[topicIndex].completed;
              return { ...e, topics: newTopics };
            }
            return e;
          })
        })),
        
        addDocument: (docData) => set((state) => ({
        documents: [
          {
            ...docData,
            id: docData.id || uuidv4(),
            uploadedAt: new Date().toISOString(),
          },
          ...state.documents
        ]
      })),

      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map(d => d.id === id ? { ...d, ...updates } : d)
      })),

      deleteDocument: (id) => set((state) => ({
        documents: state.documents.filter(d => d.id !== id)
      })),

      // Planning state and mutations
      plans: [],

      addPlan: (items) => set((state) => {
        validatePlanItems(items, state.tasks);
        const now = new Date().toISOString();
        const newPlan = {
          id: uuidv4(),
          items: items.map(item => ({ ...item, id: uuidv4() })),
          status: 'proposed' as const,
          createdAt: now,
        };
        return { plans: [...state.plans, newPlan] };
      }),

      updatePlanStatus: (id, status) => set((state) => ({
        plans: state.plans.map(p => p.id === id ? { ...p, status } : p)
      })),

      removePlan: (id) => set((state) => ({
        plans: state.plans.filter(p => p.id !== id)
      })),

    }),
    {
      name: 'orion-storage',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState: any, currentState) => {
        if (persistedState) {
          const validModes: OrionModeId[] = ['study', 'research', 'developer', 'teaching', 'professional', 'custom'];
          if (persistedState.activeMode && !validModes.includes(persistedState.activeMode)) {
            persistedState.activeMode = 'study';
          }
        }
        return { ...currentState, ...persistedState };
      }
    }
  )
);
