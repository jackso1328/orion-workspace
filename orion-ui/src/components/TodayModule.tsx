import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES } from "../config/modes";
import TaskModal from "./TaskModal";
import { Clock, CheckSquare, Calendar, ChevronRight, Zap, Star, AlertCircle, CalendarClock, Target, AlertTriangle, Inbox, Flame, PenTool, Hash } from "lucide-react";
import { animate, stagger } from "animejs";
import { getTodaySchedule } from "../domain/today/selectors";
import { useNavigate } from "react-router-dom";

export default function TodayModule() {
  const navigate = useNavigate();
  const { tasks, exams, assignments, inbox, toggleTaskCompletion, activeMode, setSearchOpen } = useOrionStore();
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
        delay: stagger(80),
        ease: "outExpo",
        duration: 700,
      });
    }
  }, []);

  const schedule = useMemo(() => getTodaySchedule({ tasks, exams, assignments, inbox, currentTime }), [tasks, exams, assignments, inbox, currentTime]);
  const {
    todayTasks,
    todayCompleted,
    todayExams,
    todayAssignments,
    priorities,
    nowItem,
    nextItem,
    timelineItems,
    allDayItems,
    overdueTasks,
    upcomingDeadlines,
    inboxAttention
  } = schedule;

  const handleToggleTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleTaskCompletion(id);
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const totalDueToday = todayTasks.length + todayExams.length + todayAssignments.length;

  return (
    <div className={`workspace-container theme-${modeConfig.presentation.theme}`}>
      <header className="workspace-header" style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
          {getGreeting()}
        </h1>
        <p className="subtitle" style={{ fontSize: "1.1rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{format(currentTime, "EEEE, MMMM d")}</span>
          <span style={{ fontSize: "0.8em", opacity: 0.5 }}>•</span>
          <span style={{ fontWeight: 600, letterSpacing: "0.5px" }} className="mode-context-label">{modeConfig.presentation.contextLabel}</span>
        </p>
      </header>

      {/* QUICK ACTIONS */}
      <div className="today-card" style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        <button onClick={() => navigate("/inbox")} className="quick-action-btn" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "12px", fontWeight: 600, color: "#1a1625", cursor: "pointer", flexShrink: 0 }}>
          <Inbox size={16} /> Capture Inbox
        </button>
        <button onClick={() => setSearchOpen(true)} className="quick-action-btn" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "12px", fontWeight: 600, color: "#1a1625", cursor: "pointer", flexShrink: 0 }}>
          <PenTool size={16} /> New Task
        </button>
        <button onClick={() => navigate("/calendar")} className="quick-action-btn" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "12px", fontWeight: 600, color: "#1a1625", cursor: "pointer", flexShrink: 0 }}>
          <Calendar size={16} /> Open Calendar
        </button>
        <button onClick={() => navigate("/pomodoro")} className="quick-action-btn" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "12px", fontWeight: 600, color: "#1a1625", cursor: "pointer", flexShrink: 0 }}>
          <Clock size={16} /> Start Focus
        </button>
        <button onClick={() => navigate("/orion")} className="quick-action-btn" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)", border: "none", borderRadius: "12px", fontWeight: 600, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
          <Flame size={16} /> Ask Orion
        </button>
      </div>

      {/* ATTENTION SUMMARY */}
      <div className="quick-stats today-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
        <div className="stat-chip" style={{ padding: "1.25rem", background: overdueTasks.length > 0 ? "rgba(254, 226, 226, 0.7)" : "rgba(255, 255, 255, 0.5)", borderRadius: "16px", border: overdueTasks.length > 0 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255, 255, 255, 0.4)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: overdueTasks.length > 0 ? "#ef4444" : "var(--text-muted)" }}>
            <AlertTriangle size={16} /> <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase" }}>Overdue</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, marginTop: "0.5rem", color: overdueTasks.length > 0 ? "#991b1b" : "#1a1625" }}>{overdueTasks.length}</div>
        </div>
        
        <div className="stat-chip" style={{ padding: "1.25rem", background: totalDueToday > 0 ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.5)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.4)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
            <Target size={16} /> <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase" }}>Due Today</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, marginTop: "0.5rem", color: "#1a1625" }}>{totalDueToday}</div>
        </div>

        <div className="stat-chip" style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.5)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.4)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: inboxAttention.length > 0 ? "#f59e0b" : "var(--text-muted)" }}>
            <Inbox size={16} /> <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase" }}>Inbox Waiting</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, marginTop: "0.5rem", color: inboxAttention.length > 0 ? "#b45309" : "#1a1625" }}>{inboxAttention.length}</div>
        </div>

        <div className="stat-chip" style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.5)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.4)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
            <CheckSquare size={16} /> <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase" }}>Completed</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, marginTop: "0.5rem", color: "#1a1625" }}>{todayCompleted.length}</div>
        </div>
      </div>

      <div className="workspace-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
        
        {/* LEFT COLUMN: NOW, OVERDUE, UPCOMING, INBOX */}
        <div className="workspace-left" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* NOW / NEXT */}
          <div className="workspace-card today-card" style={{ padding: "2rem", background: "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 100%)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "24px" }}>
            {nowItem ? (
              <React.Fragment>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f43f5e", marginBottom: "1rem" }}>
                  <Clock size={18} />
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>NOW</span>
                </div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 1rem 0" }}>{nowItem.title}</h2>
                <div style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>
                  {format(nowItem.start, "h:mm a")} - {format(nowItem.end, "h:mm a")} • {nowItem.type === "exam" ? "Exam" : "Task"}
                </div>
              </React.Fragment>
            ) : nextItem ? (
              <React.Fragment>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6366f1", marginBottom: "1rem" }}>
                  <ChevronRight size={18} />
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>NEXT</span>
                </div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 1rem 0" }}>{nextItem.title}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                  <button onClick={() => setSelectedTaskId(nextItem.id)} style={{ background: "#1a1625", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "12px", border: "none", fontWeight: 600, cursor: "pointer" }}>
                    Open Task
                  </button>
                  <span style={{ padding: "4px 12px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 600, background: "rgba(255,255,255,0.5)", color: "#333" }}>
                    {nextItem.priority} Priority
                  </span>
                </div>
              </React.Fragment>
            ) : (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <Zap size={32} color="#a09bb5" style={{ margin: "0 auto 1rem" }} />
                <h3 style={{ fontSize: "1.4rem", fontWeight: 600, color: "#1a1625" }}>Nothing scheduled right now.</h3>
                <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>You are completely caught up.</p>
              </div>
            )}
          </div>

          {/* OVERDUE */}
          <div className="workspace-card today-card">
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: overdueTasks.length > 0 ? "#dc2626" : "inherit" }}><AlertTriangle size={20} /> Overdue</h2>
            </div>
            <div className="task-list">
              {overdueTasks.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "1.5rem 0", background: "rgba(255,255,255,0.3)", borderRadius: "12px" }}>
                  You are caught up. No overdue tasks.
                </div>
              ) : (
                overdueTasks.map((task) => (
                  <div key={task.id} style={{ padding: "1rem", marginBottom: "0.5rem", background: "rgba(254, 226, 226, 0.4)", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setSelectedTaskId(task.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div className="checkbox" style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${task.color || "#ccc"}`, cursor: "pointer" }} onClick={(e) => handleToggleTask(e, task.id)} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "#991b1b" }}>{task.title}</span>
                        <span style={{ fontSize: "0.75rem", color: "#b91c1c" }}>Due: {format(new Date(task.dueDate!), "MMM d")}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* UPCOMING DEADLINES */}
          <div className="workspace-card today-card">
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Hash size={20} /> Upcoming Deadlines</h2>
            </div>
            <div className="task-list">
              {upcomingDeadlines.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "1.5rem 0", background: "rgba(255,255,255,0.3)", borderRadius: "12px" }}>
                  Nothing urgent is coming up.
                </div>
              ) : (
                upcomingDeadlines.map((item) => (
                  <div key={`${item.type}-${item.id}`} style={{ padding: "0.75rem 1rem", marginBottom: "0.5rem", background: "rgba(255,255,255,0.6)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ padding: "4px 8px", background: "rgba(0,0,0,0.05)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", minWidth: "70px", textAlign: "center" }}>{item.type}</div>
                    <span style={{ fontWeight: 500, color: "#1a1625" }}>{item.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* INBOX ATTENTION */}
          <div className="workspace-card today-card">
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: inboxAttention.length > 0 ? "#d97706" : "inherit" }}><Inbox size={20} /> Inbox Attention</h2>
            </div>
            <div className="task-list">
              {inboxAttention.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "1.5rem 0", background: "rgba(255,255,255,0.3)", borderRadius: "12px" }}>
                  Your inbox is clear.
                </div>
              ) : (
                inboxAttention.map((item) => (
                  <div key={item.id} style={{ padding: "1rem", marginBottom: "0.5rem", background: "rgba(254, 243, 199, 0.4)", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.2)", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <span style={{ fontWeight: 500, color: "#92400e", flex: 1 }}>{item.content}</span>
                    <span style={{ fontSize: "0.75rem", color: "#b45309", whiteSpace: "nowrap" }}>{format(new Date(item.createdAt), "MMM d")}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN: TIMELINE & TODAY */}
        <div className="workspace-right" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* DUE TODAY / PRIORITIES */}
          <div className="workspace-card today-card">
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Star size={20} /> Due Today</h2>
            </div>
            <div className="task-list">
              {priorities.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0", background: "rgba(255,255,255,0.3)", borderRadius: "12px" }}>
                  No tasks due today.
                </div>
              ) : (
                priorities.map((task) => (
                  <div key={task.id} style={{ "--task-accent": task.color || "#ccc", padding: "1rem", marginBottom: "0.5rem", background: "rgba(255,255,255,0.6)", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", border: "1px solid rgba(255,255,255,0.4)" } as React.CSSProperties} onClick={() => setSelectedTaskId(task.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div className="checkbox" style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${task.color || "#ccc"}`, cursor: "pointer" }} onClick={(e) => handleToggleTask(e, task.id)} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "#1a1625" }}>{task.title}</span>
                        {task.priority === "Critical" && <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, marginTop: "2px" }}>CRITICAL</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TODAY'S TIMELINE */}
          <div className="workspace-card today-card" style={{ padding: "2rem" }}>
            <div className="card-header" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><CalendarClock size={20} /> Schedule</h2>
            </div>

            <div className="timeline-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {allDayItems.length > 0 && (
                <div className="timeline-section" style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  {allDayItems.map(item => (
                    <div key={`${item.type}-${item.id}`} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem", background: "rgba(255,255,255,0.4)", borderRadius: "12px", marginBottom: "0.5rem" }}>
                      <AlertCircle size={16} color="#6366f1" />
                      <span style={{ fontWeight: 500, color: "#1a1625" }}>{item.title}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: "100px", fontWeight: 400 }}>{item.type}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="timeline-events">
                {timelineItems.length === 0 && allDayItems.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
                    Nothing scheduled today.
                  </div>
                ) : (
                  timelineItems.map((item, idx) => {
                    const isPast = currentTime > item.end;
                    const isCurrent = currentTime >= item.start && currentTime <= item.end;
                    const color = isPast ? "#a09bb5" : (item.color || "#3b82f6");
                    
                    return (
                      <div key={`${item.type}-${item.id}`} className="timeline-item" style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", opacity: isPast ? 0.6 : 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: "80px" }}>
                          <span style={{ fontWeight: isCurrent ? 700 : 500, color: isPast ? "var(--text-muted)" : "#1a1625" }}>{format(item.start, "h:mm a")}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{format(item.end, "h:mm a")}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: isCurrent ? color : "transparent", border: `3px solid ${color}`, boxShadow: isCurrent ? `0 0 10px ${color}` : "none", zIndex: 2, flexShrink: 0 }} />
                          {idx !== timelineItems.length - 1 && <div style={{ width: "2px", flex: 1, background: "rgba(0,0,0,0.05)", margin: "4px 0", minHeight: "30px" }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: "0.5rem" }}>
                          <div style={{ padding: "1rem", background: isCurrent ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)", border: `1px solid ${isCurrent ? color : "rgba(255,255,255,0.5)"}`, borderRadius: "12px", boxShadow: isCurrent ? "0 4px 12px rgba(0,0,0,0.05)" : "none" }}>
                            <h4 style={{ margin: "0 0 0.25rem 0", fontWeight: 600, color: isPast ? "var(--text-muted)" : "#1a1625" }}>{item.title}</h4>
                            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>{item.type}</span>
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
      </div>

      {selectedTaskId && <TaskModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}