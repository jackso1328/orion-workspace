export type OrionModeId = 'study' | 'research' | 'developer' | 'teaching' | 'professional' | 'custom';

export type OrionModeTheme = 'study' | 'research' | 'developer' | 'teaching' | 'professional' | 'custom';

export type OrionContextModuleId =
  | 'tasks'
  | 'documents'
  | 'courses'
  | 'assignments'
  | 'exams'
  | 'quizzes'
  | 'flashcards';

export interface NavigationGroup {
  id: string;
  label: string;
  collapsible: boolean;
  routes: string[];
}

export const COMMON_WORKSPACE_ROUTES = ['/inbox', '/dashboard', '/orion'];
export const COMMON_KNOWLEDGE_ROUTES = ['/notes', '/documents', '/whiteboard'];

export interface OrionMode {
  id: OrionModeId;
  name: string;
  description: string;
  iconName: string;
  primaryRoutes: string[];
  navigationGroups: NavigationGroup[];
  presentation: {
    theme: OrionModeTheme;
    contextLabel: string;
    emphasizedModules: string[];
    workspace: {
      modules: OrionContextModuleId[];
    };
  };
}

export const ORION_MODES: Record<OrionModeId, OrionMode> = {
  study: {
    id: 'study',
    name: 'Study',
    description: 'Focus on coursework, exams, and spaced repetition.',
    iconName: 'Book',
    primaryRoutes: ['/calendar', '/planner', '/courses', '/assignments', '/exams', '/quizzes', '/flashcards', '/study-analytics', '/syllabus-tracker', '/pomodoro'],
    navigationGroups: [
      { id: 'workspace', label: 'WORKSPACE', collapsible: false, routes: COMMON_WORKSPACE_ROUTES },
      { id: 'plan-focus', label: 'PLAN & FOCUS', collapsible: true, routes: ['/calendar', '/planner', '/pomodoro'] },
      { id: 'coursework', label: 'COURSEWORK', collapsible: true, routes: ['/courses', '/assignments', '/syllabus-tracker'] },
      { id: 'assessment', label: 'ASSESSMENT', collapsible: true, routes: ['/exams', '/quizzes', '/flashcards', '/study-analytics'] },
      { id: 'knowledge', label: 'KNOWLEDGE', collapsible: true, routes: COMMON_KNOWLEDGE_ROUTES }
    ],
    presentation: {
      theme: 'study',
      contextLabel: 'Study Session',
      emphasizedModules: ['exam', 'assignment', 'task'],
      workspace: {
        modules: ['courses', 'assignments', 'exams', 'flashcards']
      }
    }
  },
  research: {
    id: 'research',
    name: 'Research',
    description: 'Focus on literature review, document reading, and writing.',
    iconName: 'Microscope',
    primaryRoutes: ['/calendar', '/research', '/documents', '/citations', '/hypotheses', '/whiteboard', '/data-logs'],
    navigationGroups: [
      { id: 'workspace', label: 'WORKSPACE', collapsible: false, routes: COMMON_WORKSPACE_ROUTES },
      { id: 'research-plan', label: 'PLANNING', collapsible: true, routes: ['/calendar'] },
      { id: 'investigation', label: 'INVESTIGATION', collapsible: true, routes: ['/research', '/hypotheses', '/data-logs'] },
      { id: 'sources', label: 'SOURCES & LITERATURE', collapsible: true, routes: ['/documents', '/citations', '/notes', '/whiteboard'] }
    ],
    presentation: {
      theme: 'research',
      contextLabel: 'Research Context',
      emphasizedModules: ['document', 'project', 'task'],
      workspace: {
        modules: ['documents', 'tasks']
      }
    }
  },
  developer: {
    id: 'developer',
    name: 'Developer',
    description: 'Focus on programming challenges, notes, and portfolio.',
    iconName: 'Code',
    primaryRoutes: ['/calendar', '/projects', '/developer', '/snippets', '/issues', '/api-docs', '/architecture', '/pomodoro'],
    navigationGroups: [
      { id: 'workspace', label: 'WORKSPACE', collapsible: false, routes: COMMON_WORKSPACE_ROUTES },
      { id: 'dev-focus', label: 'PLAN & FOCUS', collapsible: true, routes: ['/calendar', '/pomodoro', '/issues'] },
      { id: 'engineering', label: 'ENGINEERING', collapsible: true, routes: ['/projects', '/developer', '/architecture'] },
      { id: 'reference', label: 'REFERENCE & KNOWLEDGE', collapsible: true, routes: ['/api-docs', '/snippets', '/notes', '/documents', '/whiteboard'] }
    ],
    presentation: {
      theme: 'developer',
      contextLabel: 'Developer Workspace',
      emphasizedModules: ['project', 'task', 'exam'],
      workspace: {
        modules: ['tasks', 'documents']
      }
    }
  },
  teaching: {
    id: 'teaching',
    name: 'Teaching',
    description: 'Focus on grading, assignments, and course management.',
    iconName: 'GraduationCap',
    primaryRoutes: ['/calendar', '/courses', '/assignments', '/quizzes', '/gradebook', '/lesson-plans', '/students', '/communications'],
    navigationGroups: [
      { id: 'workspace', label: 'WORKSPACE', collapsible: false, routes: COMMON_WORKSPACE_ROUTES },
      { id: 'teaching-plan', label: 'PLANNING', collapsible: true, routes: ['/calendar', '/lesson-plans'] },
      { id: 'instruction', label: 'INSTRUCTION', collapsible: true, routes: ['/courses', '/students', '/communications'] },
      { id: 'evaluation', label: 'EVALUATION', collapsible: true, routes: ['/assignments', '/quizzes', '/gradebook'] },
      { id: 'knowledge', label: 'KNOWLEDGE', collapsible: true, routes: COMMON_KNOWLEDGE_ROUTES }
    ],
    presentation: {
      theme: 'teaching',
      contextLabel: 'Teaching View',
      emphasizedModules: ['assignment', 'exam', 'task'],
      workspace: {
        modules: ['courses', 'assignments', 'quizzes']
      }
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Focus on calendar, goals, and daily progress.',
    iconName: 'Briefcase',
    primaryRoutes: ['/calendar', '/pomodoro', '/projects', '/goals', '/meetings', '/time-logs', '/contacts'],
    navigationGroups: [
      { id: 'workspace', label: 'WORKSPACE', collapsible: false, routes: COMMON_WORKSPACE_ROUTES },
      { id: 'prof-focus', label: 'FOCUS & TIME', collapsible: true, routes: ['/calendar', '/pomodoro', '/time-logs'] },
      { id: 'management', label: 'MANAGEMENT', collapsible: true, routes: ['/projects', '/goals'] },
      { id: 'network', label: 'NETWORK', collapsible: true, routes: ['/meetings', '/contacts'] },
      { id: 'knowledge', label: 'KNOWLEDGE', collapsible: true, routes: COMMON_KNOWLEDGE_ROUTES }
    ],
    presentation: {
      theme: 'professional',
      contextLabel: 'Professional Day',
      emphasizedModules: ['project', 'task'],
      workspace: {
        modules: ['tasks', 'documents']
      }
    }
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'A customized, unrestricted workspace.',
    iconName: 'Layout',
    primaryRoutes: ['/calendar', '/planner', '/notes'],
    navigationGroups: [
      { id: 'workspace', label: 'WORKSPACE', collapsible: false, routes: COMMON_WORKSPACE_ROUTES },
      { id: 'plan', label: 'PLANNING', collapsible: true, routes: ['/calendar', '/planner'] },
      { id: 'knowledge', label: 'KNOWLEDGE', collapsible: true, routes: COMMON_KNOWLEDGE_ROUTES }
    ],
    presentation: {
      theme: 'custom',
      contextLabel: 'Orion Workspace',
      emphasizedModules: ['task'],
      workspace: {
        modules: ['tasks', 'documents', 'courses']
      }
    }
  }
};






