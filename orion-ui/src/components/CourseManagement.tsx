import { useState } from "react";
import { BookOpen, Plus, PlayCircle, FileText, CheckCircle2, Circle } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";

export default function CourseManagement() {
  const courses = useOrionStore(state => state.courses) || [];
  const [activeCourseId, setActiveCourseId] = useState<string | null>(courses[0]?.id || null);
  
  const activeCourse = courses.find(c => c.id === activeCourseId);

  return (
    <div className="courses-module">
      <div className="courses-sidebar">
        <div className="sidebar-header">
          <h2>My Courses</h2>
          <button className="icon-btn"><Plus size={18} /></button>
        </div>
        
        <div className="course-list">
          {courses.map(course => (
            <div 
              key={course.id}
              className={`course-card ${activeCourseId === course.id ? 'active' : ''}`}
              onClick={() => setActiveCourseId(course.id)}
              style={{ borderLeftColor: course.color }}
            >
              <h3>{course.title}</h3>
              <div className="course-progress-bar">
                <div 
                  className="course-progress-fill" 
                  style={{ width: `${course.progress}%`, backgroundColor: course.color }}
                />
              </div>
              <span className="progress-text">{course.progress}% Complete</span>
            </div>
          ))}
        </div>
      </div>

      <div className="course-content-area">
        {activeCourse ? (
          <div className="course-dashboard">
            <header className="course-header" style={{ borderColor: activeCourse.color }}>
              <span className="course-category" style={{ color: activeCourse.color }}>
                {activeCourse.category}
              </span>
              <h1>{activeCourse.title}</h1>
              <p>{activeCourse.description}</p>
            </header>

            <div className="curriculum-builder">
              <div className="curriculum-header">
                <h2>Curriculum</h2>
                <button className="btn-primary" style={{ backgroundColor: activeCourse.color }}>
                  Add Module
                </button>
              </div>

              {activeCourse.modules.map(mod => (
                <div key={mod.id} className="course-module-card">
                  <div className="module-header">
                    <h3>{mod.title}</h3>
                  </div>
                  <div className="lesson-list">
                    {mod.lessons.map(lesson => (
                      <div key={lesson.id} className="lesson-item">
                        <div className="lesson-status">
                          {lesson.isCompleted ? 
                            <CheckCircle2 size={18} color="var(--accent-teal)" /> : 
                            <Circle size={18} color="var(--text-muted)" />
                          }
                        </div>
                        <div className="lesson-title">{lesson.title}</div>
                        <div className="lesson-type">
                          {lesson.type === 'video' && <PlayCircle size={14} />}
                          {lesson.type === 'text' && <FileText size={14} />}
                          <span>{lesson.type}</span>
                        </div>
                      </div>
                    ))}
                    <button className="add-lesson-btn">
                      <Plus size={14} /> Add Lesson
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen size={48} color="var(--border-card)" />
            <h2>No Course Selected</h2>
            <p>Select a course from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
