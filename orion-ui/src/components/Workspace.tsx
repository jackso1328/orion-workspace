import { useState, useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { format, isSameDay, parseISO } from "date-fns";
import { useOrionStore } from "../store/useOrionStore";
import TaskModal from "./TaskModal";
import CalendarWidget from "./CalendarWidget";

export default function Workspace() {
  const { tasks, addTask, toggleTaskCompletion, deleteTask } = useOrionStore();
  
  const [newTask, setNewTask] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Dashboard selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const listRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks based on selected date
  const displayedTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return isSameDay(parseISO(t.dueDate), selectedDate);
  });

  useEffect(() => {
    if (listRef.current && displayedTasks.length > 0) {
      animate(".task-item", {
        translateY: [20, 0],
        opacity: [0, 1],
        delay: stagger(40),
        ease: "outExpo",
        duration: 600,
      });
    }
  }, [selectedDate, displayedTasks.length]);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      animate(".workspace-card", {
        translateY: [30, 0],
        opacity: [0, 1],
        delay: stagger(120),
        ease: "outExpo",
        duration: 1000,
      });
    }
  }, []);

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    addTask({
      title: newTask,
      priority: "Medium",
      // Assign the task to the currently selected date!
      dueDate: selectedDate.toISOString(),
      documentIds: [],
    });
    setNewTask("");

    setTimeout(() => {
      const el = listRef.current?.firstElementChild;
      if (el) {
        animate(el, {
          translateX: [-40, 0],
          opacity: [0, 1],
          ease: "outElastic(1, .7)",
          duration: 900,
        });
      }
    }, 50);
  };

  const handleToggleTask = (e: React.MouseEvent, id: string, isCompleted: boolean) => {
    e.stopPropagation();
    const textEl = document.querySelector(`#task-${id} .task-text`);
    if (textEl) {
      animate(textEl, {
        color: !isCompleted ? "#1a1625" : "#a09bb5",
        duration: 300,
        ease: "outQuad"
      });
    }
    toggleTaskCompletion(id);
  };

  const handleRemoveTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = document.getElementById(`task-${id}`);
    if (el) {
      animate(el, {
        translateX: 60,
        opacity: 0,
        duration: 350,
        ease: "inQuad",
        onComplete: () => {
          deleteTask(id);
        }
      });
    } else {
      deleteTask(id);
    }
  };

  const totalPendingCount = tasks.filter(t => t.status !== "Completed").length;
  const totalCompletedCount = tasks.filter(t => t.status === "Completed").length;
  const dayPendingCount = displayedTasks.filter(t => t.status !== "Completed").length;

  return (
    <div className="workspace-container">
      <header className="workspace-header">
        <h1>Operational Dashboard</h1>
        <p className="subtitle">{getGreeting()}, Sriram. Your AI is ready.</p>
        <p className="time-display">{formatDate()} • {formatTime()}</p>
      </header>

      <div className="quick-stats">
        <div className="stat-chip">
          <span className="stat-number">{totalPendingCount}</span>
          <span className="stat-label">Total Pending</span>
        </div>
        <div className="stat-chip completed-chip">
          <span className="stat-number">{totalCompletedCount}</span>
          <span className="stat-label">Total Done</span>
        </div>
        <div className="stat-chip streak-chip">
          <span className="stat-number">🔥</span>
          <span className="stat-label">3 day streak</span>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Left Column: Tasks */}
        <div className="workspace-card task-card">
          <div className="card-header">
            <h2>⚡ Active Tasks ({format(selectedDate, "MMM d")})</h2>
            <span className="task-count">{dayPendingCount} pending today</span>
          </div>

          <form onSubmit={handleAddTask} className="add-task-form">
            <input
              type="text"
              placeholder={`Add task for ${format(selectedDate, "MMM d")}...`}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="task-input"
            />
            <button type="submit" className="add-btn">+</button>
          </form>

          <div className="task-list" ref={listRef}>
            {displayedTasks.length === 0 ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                No tasks assigned to {format(selectedDate, "MMM d")}
              </div>
            ) : (
              displayedTasks.map((task) => {
                const isCompleted = task.status === "Completed";
                return (
                  <div 
                    key={task.id} 
                    id={`task-${task.id}`}
                    className="task-item"
                    style={{ '--task-accent': task.color } as React.CSSProperties}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="task-left">
                      <div 
                        className={`checkbox ${isCompleted ? "checked" : ""}`}
                        onClick={(e) => handleToggleTask(e, task.id, isCompleted)}
                      >
                        {isCompleted && "✓"}
                      </div>
                      <span 
                        className="task-text" 
                        style={{ 
                          textDecoration: isCompleted ? "line-through" : "none",
                          color: isCompleted ? "#a09bb5" : "#1a1625"
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                    <button className="delete-btn" onClick={(e) => handleRemoveTask(e, task.id)}>✕</button>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Right Column: Calendar Widget */}
        <div className="workspace-card calendar-card">
           <div className="card-header">
             <h2>📅 Calendar</h2>
           </div>
           <CalendarWidget 
             selectedDate={selectedDate} 
             onDateClick={(date) => setSelectedDate(date)} 
           />
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
