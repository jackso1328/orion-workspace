
import { Link } from 'react-router-dom';
import { useOrionStore } from '../store/useOrionStore';
import { OrionContextModuleId } from '../config/modes';
import { CheckSquare, Folder, GraduationCap, ClipboardList, FileText, HelpCircle, Layers, ArrowRight } from 'lucide-react';

interface Props {
  modules: OrionContextModuleId[];
  theme: string;
}

export default function ContextualWorkspaceStrip({ modules, theme }: Props) {
  const { tasks, documents, courses, assignments, exams, quizzes, flashcards } = useOrionStore();

  const getModuleData = (id: OrionContextModuleId) => {
    switch (id) {
      case 'tasks':
        return { label: 'Tasks', count: tasks.length, icon: CheckSquare, route: null };
      case 'documents':
        return { label: 'Documents', count: documents.length, icon: Folder, route: '/documents' };
      case 'courses':
        return { label: 'Courses', count: courses.length, icon: GraduationCap, route: '/courses' };
      case 'assignments':
        return { label: 'Assignments', count: assignments.length, icon: ClipboardList, route: '/assignments' };
      case 'exams':
        return { label: 'Exams', count: exams.length, icon: FileText, route: '/exams' };
      case 'quizzes':
        return { label: 'Quizzes', count: quizzes.length, icon: HelpCircle, route: '/quizzes' };
      case 'flashcards':
        return { label: 'Flashcards', count: flashcards.length, icon: Layers, route: '/flashcards' };
      default:
        return null;
    }
  };

  if (!modules || modules.length === 0) return null;

  return (
    <div className={`workspace-strip theme-${theme}`} >
      {modules.map(moduleId => {
        const data = getModuleData(moduleId);
        if (!data) return null;
        const Icon = data.icon;

        const content = (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            padding: '1.25rem', 
            background: 'rgba(255, 255, 255, 0.6)', 
            borderRadius: '16px', 
            border: '1px solid rgba(255,255,255,0.8)',
            width: '100%',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          className="workspace-strip-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              <Icon size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.label}</span>
            </div>
            
            {data.count > 0 ? (
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1625' }}>
                {data.count}
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                No {data.label.toLowerCase()} yet.
              </div>
            )}
            
            {data.route && (
              <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', opacity: 0.4 }}>
                <ArrowRight size={16} />
              </div>
            )}
          </div>
        );

        if (data.route) {
          return (
            <Link key={moduleId} to={data.route} style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
              {content}
            </Link>
          );
        }

        return <div key={moduleId} style={{ display: 'flex' }}>{content}</div>;
      })}
    </div>
  );
}

