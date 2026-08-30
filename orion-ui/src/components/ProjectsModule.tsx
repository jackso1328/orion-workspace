import React, { useState } from 'react';
import { useOrionStore } from '../store/useOrionStore';
import { Plus, GripVertical, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ProjectsModule() {
  const { projects, tasks, addProject, updateProject, addTask } = useOrionStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAddProject = () => {
    if (newTitle.trim()) {
      addProject({
        title: newTitle.trim(),
        status: 'Active',
        tags: [],
        color: 'var(--accent-teal)'
      });
      setNewTitle('');
      setIsAdding(false);
    }
  };

  const getProjectTasks = (projectId: string) => tasks.filter(t => t.projectId === projectId);

  return (
    <div className="module-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="module-header" style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Projects</h1>
          <p className="module-subtitle" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Manage your professional workflows and large-scale initiatives.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
          <Plus size={18} /> New Project
        </button>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: '1.5rem', paddingBottom: '1rem' }}>
        {['Active', 'Completed', 'Archived'].map(status => {
          const statusProjects = projects.filter(p => p.status === status);
          return (
            <div key={status} style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>{status}</span>
                <span style={{ color: 'var(--text-muted)' }}>{statusProjects.length}</span>
              </div>
              <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {status === 'Active' && isAdding && (
                  <div className="glass-panel" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Project Name..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddProject();
                        if (e.key === 'Escape') setIsAdding(false);
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem' }}
                    />
                  </div>
                )}
                {statusProjects.map(project => {
                  const projectTasks = getProjectTasks(project.id);
                  const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
                  const progress = projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : 0;

                  return (
                    <div key={project.id} className="glass-panel" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'grab' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>{project.title}</h4>
                        <GripVertical size={16} color="var(--text-muted)" />
                      </div>
                      
                      {projectTasks.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: progress + '%', background: project.color || 'var(--accent-primary)' }}></div>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="text-btn" 
                          onClick={() => {
                            const name = window.prompt("Task Title for " + project.title);
                            if (name) addTask({ title: name, priority: 'Medium', dueDate: '', projectId: project.id, documentIds: [] });
                          }}
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        >
                          + Add Task
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

