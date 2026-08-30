import { useState, useEffect } from "react";
import { animate } from "animejs";
import { useOrionStore } from "../store/useOrionStore";
import { X, Calendar, Clock, Flag, CheckCircle, Trash2, Edit3, Tag } from "lucide-react";

interface TaskModalProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskModal({ taskId, onClose }: TaskModalProps) {
  const { tasks, updateTask, toggleTaskCompletion, deleteTask } = useOrionStore();
  const task = tasks.find(t => t.id === taskId);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || "");
  const [editedDesc, setEditedDesc] = useState(task?.description || "");

  useEffect(() => {
    // Entrance animation
    animate(".modal-overlay", {
      opacity: [0, 1],
      duration: 300,
      ease: "outQuad"
    });
    
    animate(".modal-content", {
      translateY: [20, 0],
      scale: [0.95, 1],
      opacity: [0, 1],
      duration: 400,
      ease: "outExpo"
    });
  }, []);

  if (!task) return null;

  const handleClose = () => {
    animate(".modal-overlay", {
      opacity: 0,
      duration: 200,
      ease: "inQuad"
    });
    animate(".modal-content", {
      translateY: 10,
      scale: 0.95,
      opacity: 0,
      duration: 200,
      ease: "inQuad",
      onComplete: onClose
    });
  };

  const handleSave = () => {
    updateTask(taskId, { title: editedTitle, description: editedDesc });
    setIsEditing(false);
  };

  const handleDelete = () => {
    handleClose();
    setTimeout(() => deleteTask(taskId), 250);
  };

  const handleToggle = () => {
    toggleTaskCompletion(taskId);
  };

  const isCompleted = task.status === 'Completed';

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}><X size={20} /></button>
        
        <div className="modal-header">
          {isEditing ? (
            <input 
              className="modal-title-input" 
              value={editedTitle} 
              onChange={e => setEditedTitle(e.target.value)} 
              autoFocus
            />
          ) : (
            <h2 className="modal-title" style={{ textDecoration: isCompleted ? "line-through" : "none" }}>
              {task.title}
            </h2>
          )}
        </div>

        <div className="modal-meta-grid">
          <div className="meta-item">
            <span className="meta-label"><Flag size={14}/> Priority</span>
            <span className={`meta-value priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label"><Calendar size={14}/> Due Date</span>
            <span className="meta-value">{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label"><Clock size={14}/> Estimated</span>
            <span className="meta-value">{task.estimatedMinutes ? `${task.estimatedMinutes}m` : "--"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label"><Tag size={14}/> Course</span>
            <span className="meta-value">{task.courseId || "None"}</span>
          </div>
        </div>

        <div className="modal-body">
          <h3 className="section-title">Description</h3>
          {isEditing ? (
            <textarea 
              className="modal-desc-input" 
              value={editedDesc} 
              onChange={e => setEditedDesc(e.target.value)} 
              placeholder="Add details..."
            />
          ) : (
            <p className="modal-desc">{task.description || "No description provided."}</p>
          )}
        </div>

        <div className="modal-actions">
          {isEditing ? (
            <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          ) : (
            <>
              <button className={`btn-toggle ${isCompleted ? 'completed' : ''}`} onClick={handleToggle}>
                <CheckCircle size={18} />
                {isCompleted ? "Mark Pending" : "Mark Complete"}
              </button>
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                <Edit3 size={18} /> Edit
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={18} /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
