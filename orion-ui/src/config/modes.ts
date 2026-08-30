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

export interface OrionMode {
  id: OrionModeId;
  name: string;
  description: string;
  iconName: string;
  primaryRoutes: string[];
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
    primaryRoutes: ['/calendar', '/planner', '/courses', '/assignments', '/exams', '/quizzes', '/flashcards'],
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
    primaryRoutes: ['/calendar', '/research'],
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
    primaryRoutes: ['/calendar', '/projects', '/developer'],
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
    primaryRoutes: ['/calendar', '/courses', '/assignments', '/quizzes', '/gradebook'],
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
    primaryRoutes: ['/calendar', '/pomodoro', '/projects', '/goals'],
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






