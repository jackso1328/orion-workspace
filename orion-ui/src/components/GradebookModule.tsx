import { Trophy, BookOpen, TrendingUp } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";

export default function GradebookModule() {
  const assignments = useOrionStore(state => state.assignments) || [];
  const courses = useOrionStore(state => state.courses) || [];
  
  const getCourseName = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || "Unknown Course";
  };
  
  const getCourseColor = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.color || "var(--text-primary)";
  };

  const gradedAssignments = assignments.filter(a => a.status === 'Graded' && a.grade !== undefined);
  
  const totalEarned = gradedAssignments.reduce((acc, a) => acc + (a.grade || 0), 0);
  const totalPossible = gradedAssignments.reduce((acc, a) => acc + a.maxGrade, 0);
  const overallPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  return (
    <div className="gradebook-module">
      <div className="gradebook-container">
        
        <header className="gradebook-header">
          <h1>Gradebook</h1>
          <p className="subtitle">Overview of your academic performance.</p>
        </header>

        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Trophy size={24} />
            </div>
            <div className="stat-info">
              <h3>Overall Grade</h3>
              <p className="stat-value">{overallPercentage}%</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' }}>
              <BookOpen size={24} />
            </div>
            <div className="stat-info">
              <h3>Graded Assignments</h3>
              <p className="stat-value">{gradedAssignments.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <h3>Total Points</h3>
              <p className="stat-value">{totalEarned} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {totalPossible}</span></p>
            </div>
          </div>
        </div>

        <div className="grades-table-container">
          {gradedAssignments.length === 0 ? (
            <div className="empty-state">
              <Trophy size={48} color="var(--border-card)" />
              <h2>No Grades Yet</h2>
              <p>Complete and grade assignments to see them here.</p>
            </div>
          ) : (
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Assignment</th>
                  <th>Score</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {gradedAssignments.map(assignment => {
                  const courseColor = getCourseColor(assignment.courseId);
                  const percentage = Math.round(((assignment.grade || 0) / assignment.maxGrade) * 100);
                  
                  return (
                    <tr key={assignment.id}>
                      <td>
                        <span className="course-badge" style={{ backgroundColor: `${courseColor}20`, color: courseColor, border: `1px solid ${courseColor}40` }}>
                          {getCourseName(assignment.courseId)}
                        </span>
                      </td>
                      <td className="font-medium">{assignment.title}</td>
                      <td>{assignment.grade} / {assignment.maxGrade}</td>
                      <td>
                        <div className="grade-pill" style={{ 
                          backgroundColor: percentage >= 90 ? 'rgba(20, 184, 166, 0.1)' : percentage >= 70 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                          color: percentage >= 90 ? '#14b8a6' : percentage >= 70 ? '#f59e0b' : '#f43f5e'
                        }}>
                          {percentage}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
