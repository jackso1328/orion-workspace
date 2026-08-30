import { useState } from "react";
import { format, parseISO, isSameDay, setHours, setMinutes, addMinutes, startOfDay } from "date-fns";
import { Clock, GripVertical, CheckCircle2, Plus, CalendarClock, Sparkles } from "lucide-react";
import PlanReviewModal from "./PlanReviewModal";
import { useOrionStore } from "../store/useOrionStore";
import { Plan } from "../domain/planning/types";
import { useNavigate } from "react-router-dom";

export default function StudyPlanner() {
  const navigate = useNavigate();
  const [currentDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDuration, setNewTaskDuration] = useState("60");
  const [reviewingPlan, setReviewingPlan] = useState<Plan | null>(null);
  
  const plans = useOrionStore(state => state.plans);
  
  const tasks = useOrionStore(state => state.tasks);
  const updateTask = useOrionStore(state => state.updateTask);
  const addTask = useOrionStore(state => state.addTask);

  // Time grid from 6 AM to 11 PM
  const START_HOUR = 6;
  const END_HOUR = 23;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  // Filter tasks for the current day
  const dailyTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return isSameDay(parseISO(t.dueDate), currentDate);
  });

  const unscheduledTasks = dailyTasks.filter(t => !t.startTime && t.status !== "Completed");
  const scheduledTasks = dailyTasks.filter(t => t.startTime);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Default duration is 60 mins if not set
    const duration = task.estimatedMinutes || 60;
    
    // Set start time to the dropped hour
    const start = setMinutes(setHours(startOfDay(currentDate), hour), 0);
    const end = addMinutes(start, duration);

    updateTask(taskId, {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
  };

  const removeSchedule = (taskId: string) => {
    updateTask(taskId, {
      startTime: undefined,
      endTime: undefined
    });
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle,
      priority: "Medium",
      dueDate: currentDate.toISOString(),
      estimatedMinutes: parseInt(newTaskDuration) || 60,
      documentIds: [],
    });
    setNewTaskTitle("");
  };

  return (
    <div className="planner-module">
      <header className="planner-header">
        <div>
          <h1>Study Planner</h1>
          <p className="subtitle">{format(currentDate, "EEEE, MMMM do")}</p>
        </div>
      </header>

      <div className="planner-layout">
        
        {/* The Timeline */}
        <div className="timeline-container">
          <div className="timeline-grid">
            {hours.map(hour => {
              // Format hour (e.g., 9 AM)
              const ampm = hour >= 12 ? "PM" : "AM";
              const displayHour = hour > 12 ? hour - 12 : hour;
              const displayHour12 = displayHour === 0 ? 12 : displayHour;
              
              return (
                <div 
                  key={hour} 
                  className="timeline-row"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, hour)}
                >
                  <div className="time-label">{displayHour12} {ampm}</div>
                  <div className="time-slot">
                    <div className="slot-divider"></div>
                      </div>
      {reviewingPlan && (
        <PlanReviewModal plan={reviewingPlan} onClose={() => setReviewingPlan(null)} />
      )}
    </div>
  );
})}

            {/* Render Scheduled Tasks as Absolutely Positioned Blocks */}
            {scheduledTasks.map(task => {
              const start = parseISO(task.startTime!);
              const end = parseISO(task.endTime!);
              
              const startHourOffset = start.getHours() + (start.getMinutes() / 60) - START_HOUR;
              const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              
              // Timeline CSS logic (assuming each hour slot is 60px tall)
              const topPx = startHourOffset * 60;
              const heightPx = durationHours * 60;

              return (
                <div 
                  key={task.id} 
                  className="scheduled-block"
                  style={{
                    top: `${topPx}px`,
                    height: `${heightPx - 4}px`, // -4 for padding
                    borderLeftColor: task.color,
                    backgroundColor: `${task.color}15` // Hex with opacity
                  }}
                >
                  <div className="block-header">
                    <span className="block-title">{task.title}</span>
                    <button className="remove-block-btn" onClick={() => removeSchedule(task.id)}>×</button>
                  </div>
                  <div className="block-footer">
                    <span>{format(start, "h:mm a")} - {format(end, "h:mm a")}</span>
                    <button className="focus-btn" onClick={() => navigate(`/pomodoro?taskId=${task.id}`)}>
                      <Clock size={12} /> Focus
                    </button>
                      </div>
      {reviewingPlan && (
        <PlanReviewModal plan={reviewingPlan} onClose={() => setReviewingPlan(null)} />
      )}
    </div>
  );
})}
          </div>
        </div>

                {/* Unscheduled Sidebar */}
        <div className="unscheduled-sidebar">
          {plans.length > 0 && (
            <div className="planning-review-section" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '12px' }}>
                <Sparkles size={18} color="var(--accent-purple)" />
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Proposed Plans</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {plans.map(plan => (
                  <div key={plan.id} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${plan.status === 'proposed' ? 'var(--accent-purple)' : 'var(--border-card)'}`, background: plan.status === 'proposed' ? 'rgba(139, 92, 246, 0.05)' : 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generated {format(parseISO(plan.createdAt), "MMM d")}</span>
                      {plan.status === 'proposed' && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'var(--accent-purple)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>PROPOSED</span>}
                      {plan.status === 'accepted' && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>ACCEPTED</span>}
                      {plan.status === 'rejected' && <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>REJECTED</span>}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {plan.items.length} scheduled task{plan.items.length !== 1 ? 's' : ''}
                    </div>
                    <button 
                      onClick={() => setReviewingPlan(plan)}
                      style={{ marginTop: '4px', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid var(--accent-purple)', background: 'white', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <CalendarClock size={14} /> Review Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3>Unscheduled ({unscheduledTasks.length})</h3>
          <p className="helper-text">Create tasks and drag them into the timeline to time-block your day.</p>
          
          <form className="quick-add-planner-form" onSubmit={handleQuickAdd}>
            <input 
              type="text" 
              placeholder="What do you need to study?" 
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
            <div className="duration-input-row">
              <input 
                type="number" 
                placeholder="Mins" 
                value={newTaskDuration}
                onChange={e => setNewTaskDuration(e.target.value)}
                min="15"
                step="15"
              />
              <button type="submit"><Plus size={16} /></button>
            </div>
          </form>

          <div className="draggable-task-list" style={{ marginTop: '16px' }}>
            {unscheduledTasks.map(task => (
              <div 
                key={task.id} 
                className="draggable-task"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                style={{ borderLeftColor: task.color }}
              >
                <GripVertical size={16} className="drag-handle" />
                <div className="task-info">
                  <span className="task-title">{task.title}</span>
                  <span className="task-duration">{task.estimatedMinutes || 60} min</span>
                </div>
              </div>
            ))}
            
            {unscheduledTasks.length === 0 && (
              <div className="all-scheduled">
                <CheckCircle2 size={32} color="var(--accent-teal)" />
                <p>All tasks scheduled for today!</p>
              </div>
            )}
          </div>
        </div>

          </div>
      {reviewingPlan && (
        <PlanReviewModal plan={reviewingPlan} onClose={() => setReviewingPlan(null)} />
      )}
    </div>
  );
}


