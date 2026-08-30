import { useState, useMemo } from "react";
import { useOrionStore, Exam } from "../store/useOrionStore";
import { Calendar, Target, Clock, BookOpen, Plus, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ExamsModule() {
  const exams = useOrionStore(state => state.exams) || [];
  const courses = useOrionStore(state => state.courses) || [];
  const toggleExamTopic = useOrionStore(state => state.toggleExamTopic);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  const now = new Date();
  
  const upcomingExams = useMemo(() => {
    return exams.filter(e => new Date(e.date) > now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exams, now]);

  const completedExams = useMemo(() => {
    return exams.filter(e => new Date(e.date) <= now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [exams, now]);

  const getDaysRemaining = (dateString: string) => {
    const diff = new Date(dateString).getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const calculateReadiness = (exam: Exam) => {
    if (!exam.topics || exam.topics.length === 0) return 0;
    const completed = exam.topics.filter(t => t.completed).length;
    return Math.round((completed / exam.topics.length) * 100);
  };

  return (
    <div className="module-container">
      <header className="module-header">
        <div>
          <h1>Exam Control Center</h1>
          <p className="subtitle">Track syllabuses and monitor study readiness.</p>
        </div>
        <button className="btn-primary">
          <Plus size={18} /> Add Exam
        </button>
      </header>

      <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
          style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: activeTab === 'upcoming' ? '600' : '400', color: activeTab === 'upcoming' ? 'var(--accent-violet)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Upcoming ({upcomingExams.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
          style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: activeTab === 'completed' ? '600' : '400', color: activeTab === 'completed' ? 'var(--accent-violet)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Completed ({completedExams.length})
        </button>
      </div>

      <div className="exams-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
        {activeTab === 'upcoming' ? (
          upcomingExams.map(exam => {
            const course = courses.find(c => c.id === exam.courseId);
            const readiness = calculateReadiness(exam);
            const daysLeft = getDaysRemaining(exam.date);
            
            return (
              <div key={exam.id} className="card exam-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {course && <span className="course-badge" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-indigo)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{course.title}</span>}
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.25rem' }}>{exam.title}</h3>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(exam.date).toLocaleDateString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {exam.durationMinutes} mins</span>
                    </div>
                  </div>
                  <div className="countdown-badge" style={{ background: daysLeft <= 3 ? 'var(--accent-rose)' : 'var(--accent-teal)', color: 'white', padding: '8px 12px', borderRadius: '8px', fontWeight: 700, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>{daysLeft}</div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.9 }}>Days</div>
                  </div>
                </div>

                <div className="readiness-section" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Readiness Score</span>
                    <span style={{ fontWeight: 700, color: readiness >= 80 ? 'var(--accent-teal)' : readiness >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{readiness}%</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{ height: '100%', width: `${readiness}%`, background: readiness >= 80 ? 'var(--accent-teal)' : readiness >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>

                <div className="topics-list" style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={16} /> Syllabus / Topics
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {exam.topics.map((topic, idx) => (
                      <div key={idx} className="topic-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          checked={topic.completed}
                          onChange={() => toggleExamTopic(exam.id, idx)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-violet)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.95rem', textDecoration: topic.completed ? 'line-through' : 'none', color: topic.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {topic.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: '8px' }}
                  onClick={() => navigate('/pomodoro')}
                >
                  <Target size={18} /> Launch Focus Session
                </button>
              </div>
            );
          })
        ) : (
          completedExams.map(exam => {
            const course = courses.find(c => c.id === exam.courseId);
            return (
              <div key={exam.id} className="card exam-card completed" style={{ padding: '24px', opacity: 0.8 }}>
                {course && <span className="course-badge" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{course.title}</span>}
                <h3 style={{ margin: '8px 0', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>{exam.title}</h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  <span><Calendar size={14} style={{display:'inline', verticalAlign:'middle'}}/> {new Date(exam.date).toLocaleDateString()}</span>
                </div>
                
                <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-teal)', padding: '10px', borderRadius: '50%' }}>
                      <Trophy size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Score Achieved</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{exam.achievedScore || '-'} / 100</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{exam.targetScore || '-'}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {activeTab === 'upcoming' && upcomingExams.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <Target size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3>No upcoming exams!</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>You are completely caught up. Take a break or study ahead.</p>
          </div>
        )}
      </div>
    </div>
  );
}
