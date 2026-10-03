import { useState } from "react";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO 
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import TaskModal from "./TaskModal";

export default function CalendarModule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // For the inline add task feature
  const [addingTaskDate, setAddingTaskDate] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const tasks = useOrionStore((state) => state.tasks);
  const addTask = useOrionStore((state) => state.addTask);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleAddTaskSubmit = (e: React.FormEvent, date: Date) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle,
      priority: "Medium",
      dueDate: date.toISOString(),
      documentIds: [],
    });
    
    setNewTaskTitle("");
    setAddingTaskDate(null);
  };

  const renderHeader = () => {
    return (
      <div className="module-header">
        <div className="header-title">
          <h1>Calendar & Planner</h1>
          <p className="subtitle">Manage your schedule and task assignments.</p>
        </div>
        <div className="calendar-controls">
          <button onClick={prevMonth} className="btn-icon"><ChevronLeft size={20} /></button>
          <h2 className="current-month">{format(currentDate, "MMMM yyyy")}</h2>
          <button onClick={nextMonth} className="btn-icon"><ChevronRight size={20} /></button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateFormat = "EEEE";
    let startDate = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="full-cal-day-name" key={i}>
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }
    return <div className="full-cal-days-row">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const formattedDate = format(cloneDay, dateFormat);
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        const isToday = isSameDay(cloneDay, new Date());
        
        // Find tasks for this specific day
        const dayTasks = tasks.filter(t => {
          if (!t.dueDate) return false;
          return isSameDay(parseISO(t.dueDate), cloneDay);
        });

        days.push(
          <div
            className={`full-cal-cell ${!isCurrentMonth ? "disabled" : ""} ${isToday ? "today" : ""}`}
            key={cloneDay.toString()}
            onClick={(e) => {
               // Only set adding task if they click the cell background, not a task
               if ((e.target as HTMLElement).classList.contains('full-cal-cell') || (e.target as HTMLElement).classList.contains('full-cal-date')) {
                 setAddingTaskDate(cloneDay);
               }
            }}
          >
            <div className="full-cal-date">
              <span className="date-number">{formattedDate}</span>
              <button 
                className="add-task-quick-btn" 
                onClick={(e) => { e.stopPropagation(); setAddingTaskDate(cloneDay); }}
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="full-cal-tasks">
              {dayTasks.map(t => (
                <div 
                  key={t.id} 
                  className={`cal-task-item ${t.status === 'Completed' ? 'completed' : ''}`}
                  style={{ borderLeftColor: t.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTaskId(t.id);
                  }}
                >
                  <span className="task-title" style={{ color: t.status === 'Completed' ? '#a09bb5' : '#1a1625' }}>
                     {t.title}
                  </span>
                </div>
              ))}
              
              {addingTaskDate && isSameDay(addingTaskDate, cloneDay) && (
                <form 
                  onSubmit={(e) => handleAddTaskSubmit(e, cloneDay)} 
                  className="quick-add-form"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="New task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onBlur={() => {
                      if (!newTaskTitle.trim()) setAddingTaskDate(null);
                    }}
                  />
                </form>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="full-cal-row" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="full-cal-body">{rows}</div>;
  };

  return (
    <div className="module-container" style={{ overflowY: 'auto', height: '100%' }}>
      {renderHeader()}
      <div className="full-calendar">
        {renderDays()}
        {renderCells()}
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
