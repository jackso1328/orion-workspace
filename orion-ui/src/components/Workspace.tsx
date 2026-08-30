import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES } from "../config/modes";
import TaskModal from "./TaskModal";
import ContextualWorkspaceStrip from "./ContextualWorkspaceStrip";
import { Clock, CheckSquare, Calendar, ChevronRight, Zap, Star, AlertCircle, CalendarClock, Target } from "lucide-react";
import { animate, stagger } from "animejs";
import { getTodaySchedule } from "../domain/today/selectors";

export default function Workspace() {
  const { tasks, exams, assignments, inbox, toggleTaskCompletion, deleteTask, activeMode } = useOrionStore();
  const modeConfig = ORION_MODES[activeMode];
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const hasAnimated = React.useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      animate(".today-card", {
        translateY: [30, 0],
        opacity: [0, 1],
        delay: stagger(100),
        ease: "outExpo",
        duration: 800,
      });
    }
  }, []);

  const {
    todayTasks,
    todayCompleted,
    todayExams,
    todayAssignments,
    priorities,
    nowItem,
    nextItem,
    timelineItems,
    allDayItems
  } = useMemo(() => getTodaySchedule({ tasks, exams, assignments, inbox, currentTime }), [tasks, exams, assignments, currentTime]);

  const handleToggleTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleTaskCompletion(id);
  };

  const handleRemoveTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteTask(id);
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const isTaskEmphasized = modeConfig.presentation.emphasizedModules.includes('task');
  const isScheduledEmphasized = modeConfig.presentation.emphasizedModules.includes('exam') || modeConfig.presentation.emphasizedModules.includes('assignment');

  return (
    <div className={`workspace-container theme-${modeConfig.presentation.theme}`}>
      <header className="workspace-header" style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          {getGreeting()}
        </h1>
        <p className="subtitle" style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{format(currentTime, "EEEE, MMMM d")}</span>
          <span style={{ fontSize: '0.8em', opacity: 0.5 }}>•</span>
          <span style={{ fontWeight: 600, letterSpacing: '0.5px' }} className="mode-context-label">{modeConfig.presentation.contextLabel}</span>
        </p>
            </header>

      <ContextualWorkspaceStrip modules={modeConfig.presentation.workspace.modules} theme={modeConfig.presentation.theme} />

      <div className="quick-stats today-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className={`stat-chip ${isTaskEmphasized ? 'emphasized' : ''}`} style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '16px', border: isTaskEmphasized ? '2px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isTaskEmphasized ? '#1a1625' : 'var(--text-muted)' }}>
            <Target size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Tasks Due</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#1a1625' }}>{todayTasks.length}</div>
        </div>
        
        <div className={`stat-chip ${isScheduledEmphasized ? 'emphasized' : ''}`} style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '16px', border: isScheduledEmphasized ? '2px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isScheduledEmphasized ? '#1a1625' : 'var(--text-muted)' }}>
            <Calendar size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Scheduled</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#1a1625' }}>{todayExams.length + todayAssignments.length}</div>
        </div>

        <div className="stat-chip" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <CheckSquare size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Completed Today</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#1a1625' }}>{todayCompleted.length}</div>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="workspace-left" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* NOW / NEXT FEATURED BLOCK */}
          <div className="workspace-card today-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '24px' }}>
            {nowItem ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', marginBottom: '1rem' }}>
                  <Clock size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>NOW</span>
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 1rem 0' }}>{nowItem.title}</h2>
                <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                  {format(nowItem.start, "h:mm a")} - {format(nowItem.end, "h:mm a")} • {nowItem.type === 'exam' ? 'Exam' : 'Task'}
                </div>
              </>
            ) : nextItem ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', marginBottom: '1rem' }}>
                  <ChevronRight size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>NEXT</span>
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 1rem 0' }}>{nextItem.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    onClick={() => setSelectedTaskId(nextItem.id)}
                    style={{ background: '#1a1625', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Open Task
                  </button>
                  <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(255,255,255,0.5)', color: '#333' }}>
                    {nextItem.priority} Priority
                  </span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <Zap size={32} color="#a09bb5" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1625' }}>Nothing active right now.</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>You're completely caught up.</p>
              </div>
            )}
          </div>

          {/* PRIORITIES (Tasks) */}
          <div className="workspace-card today-card">
            <div className="card-header" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Star size={20} /> Priorities</h2>
            </div>
            <div className="task-list">
              {priorities.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0", background: 'rgba(255,255,255,0.3)', borderRadius: '12px' }}>
                  You're clear for now. No tasks scheduled for today.
                </div>
              ) : (
                priorities.map((task) => {
                  const isEmphasized = modeConfig.presentation.emphasizedModules.includes('task');
                  return (
                    <div 
                      key={task.id} 
                      className={`task-item ${isEmphasized ? 'emphasized-module' : ''}`}
                      style={{ 
                        '--task-accent': task.color, 
                        padding: '1rem', 
                        marginBottom: '0.5rem', 
                        background: 'rgba(255,255,255,0.6)', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        border: isEmphasized ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                        boxShadow: isEmphasized ? '0 4px 12px rgba(0,0,0,0.03)' : 'none'
                      } as React.CSSProperties}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div 
                          className="checkbox"
                          style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${task.color}`, cursor: 'pointer' }}
                          onClick={(e) => handleToggleTask(e, task.id)}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: isEmphasized ? 700 : 600, color: '#1a1625' }}>{task.title}</span>
                          {task.priority === 'Critical' && (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>CRITICAL</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleRemoveTask(e, task.id)}
                        style={{ background: 'none', border: 'none', color: '#a09bb5', cursor: 'pointer', fontSize: '1.2rem', padding: '0 8px' }}
                      >×</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* TODAY'S TIMELINE */}
        <div className="workspace-card today-card" style={{ padding: '2rem' }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarClock size={20} /> Today's Timeline</h2>
          </div>

          <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {allDayItems.length > 0 && (
              <div className="timeline-section" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '1px' }}>All Day / Deadlines</h4>
                {allDayItems.map(item => {
                  const isEmphasized = modeConfig.presentation.emphasizedModules.includes(item.type);
                  return (
                    <div key={`${item.type}-${item.id}`} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '0.75rem', 
                      background: 'rgba(255,255,255,0.4)', 
                      borderRadius: '12px', 
                      marginBottom: '0.5rem',
                      border: isEmphasized ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent'
                    }}>
                      <AlertCircle size={16} color={isEmphasized ? "#1a1625" : "#6366f1"} />
                      <span style={{ fontWeight: isEmphasized ? 700 : 500, color: '#1a1625' }}>{item.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: isEmphasized ? '#1a1625' : 'var(--text-muted)', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '100px', fontWeight: isEmphasized ? 600 : 400 }}>
                        {item.type === 'assignment' ? 'Assignment' : 'Task'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="timeline-events">
              {timelineItems.length === 0 && allDayItems.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem 0" }}>
                  Your calendar is open. Nothing scheduled yet.
                </div>
              ) : (
                timelineItems.map((item, idx) => {
                  const isPast = currentTime > item.end;
                  const isCurrent = currentTime >= item.start && currentTime <= item.end;
                  const isEmphasized = modeConfig.presentation.emphasizedModules.includes(item.type);
                  const color = isPast ? '#a09bb5' : (item.color || '#3b82f6');
                  
                  return (
                    <div key={`${item.type}-${item.id}`} className={`timeline-item ${isEmphasized ? 'emphasized-module' : ''}`} style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', opacity: isPast ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '80px' }}>
                        <span style={{ fontWeight: isCurrent || isEmphasized ? 700 : 500, color: isPast ? 'var(--text-muted)' : '#1a1625' }}>
                          {format(item.start, "h:mm a")}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: isEmphasized ? 600 : 400 }}>
                          {format(item.end, "h:mm a")}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                          width: '12px', height: '12px', borderRadius: '50%', 
                          background: isCurrent ? color : 'transparent',
                          border: `3px solid ${color}`,
                          boxShadow: isCurrent ? `0 0 10px ${color}` : 'none',
                          zIndex: 2,
                          flexShrink: 0
                        }} />
                        {idx !== timelineItems.length - 1 && (
                          <div style={{ width: '2px', flex: 1, background: 'rgba(0,0,0,0.05)', margin: '4px 0', minHeight: '30px' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                        <div style={{ 
                          padding: '1rem', 
                          background: isCurrent ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', 
                          border: isEmphasized ? '2px solid rgba(0,0,0,0.1)' : `1px solid ${isCurrent ? color : 'rgba(255,255,255,0.5)'}`,
                          borderRadius: '12px',
                          boxShadow: isCurrent || isEmphasized ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: isEmphasized ? 700 : 600, color: isPast ? 'var(--text-muted)' : '#1a1625' }}>
                            {item.title}
                          </h4>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: isEmphasized ? '#1a1625' : 'var(--text-muted)', fontWeight: isEmphasized ? 600 : 400 }}>
                            {item.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
          </div>
        </div>
      </div>

      {selectedTaskId && (
        <TaskModal 
          taskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
        />
      )}
    </div>
  );
}

