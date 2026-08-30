import { useState } from "react";
import { FileEdit, CheckCircle, Clock, Book } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { format, isPast } from "date-fns";

export default function AssignmentsModule() {
  const assignments = useOrionStore(state => state.assignments) || [];
  const courses = useOrionStore(state => state.courses) || [];
  const updateAssignment = useOrionStore(state => state.updateAssignment);
  
  const [filter, setFilter] = useState<'All' | 'Not Started' | 'In Progress' | 'Submitted' | 'Graded'>('All');
  
  const filteredAssignments = filter === 'All' 
    ? assignments 
    : assignments.filter(a => a.status === filter);

  const getCourseName = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || "Unknown Course";
  };
  
  const getCourseColor = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.color || "var(--text-muted)";
  };

  const handleStatusChange = (id: string, status: any) => {
    updateAssignment(id, { status });
  };

  return (
    <div className="assignments-module">
      <div className="assignments-container">
        <header className="assignments-header">
          <h1>Assignments</h1>
          <p className="subtitle">Track your coursework and submissions.</p>
        </header>

        <div className="assignments-filters">
          {['All', 'Not Started', 'In Progress', 'Submitted', 'Graded'].map(f => (
            <button 
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f as any)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="assignments-grid">
          {filteredAssignments.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <FileEdit size={48} color="var(--border-card)" />
              <h2>No Assignments Found</h2>
              <p>You have no {filter.toLowerCase()} assignments.</p>
            </div>
          ) : (
            filteredAssignments.map(assignment => {
              const courseColor = getCourseColor(assignment.courseId);
              const overdue = isPast(new Date(assignment.dueDate)) && assignment.status !== 'Submitted' && assignment.status !== 'Graded';
              
              return (
                <div key={assignment.id} className="assignment-card" style={{ borderTopColor: courseColor }}>
                  <div className="assignment-course">
                    <Book size={14} color={courseColor} />
                    <span style={{ color: courseColor }}>{getCourseName(assignment.courseId)}</span>
                  </div>
                  <h3>{assignment.title}</h3>
                  <p className="assignment-desc">{assignment.description}</p>
                  
                  <div className="assignment-meta">
                    <div className={`due-date ${overdue ? 'overdue' : ''}`}>
                      <Clock size={14} />
                      <span>{format(new Date(assignment.dueDate), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    <select 
                      className="status-selector"
                      value={assignment.status}
                      onChange={(e) => handleStatusChange(assignment.id, e.target.value)}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Graded">Graded</option>
                    </select>
                  </div>
                  
                  {assignment.status === 'Graded' && assignment.grade !== undefined && (
                    <div className="assignment-grade">
                      <CheckCircle size={16} color="var(--accent-teal)" />
                      <span>Grade: {assignment.grade} / {assignment.maxGrade}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
