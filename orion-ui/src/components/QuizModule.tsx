import { useState } from "react";
import { useOrionStore, Quiz, QuizAttempt } from "../store/useOrionStore";
import { HelpCircle, Play, CheckCircle, XCircle, RotateCcw, LayoutGrid, BarChart2 } from "lucide-react";

type ViewState = 'library' | 'taking' | 'results';

export default function QuizModule() {
  const quizzes = useOrionStore(state => state.quizzes) || [];
  const courses = useOrionStore(state => state.courses) || [];
  const recordQuizAttempt = useOrionStore(state => state.recordQuizAttempt);

  const [view, setView] = useState<ViewState>('library');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  
  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Results state
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setView('taking');
  };

  const handleAnswer = (answer: string) => {
    if (!activeQuiz) return;
    
    const question = activeQuiz.questions[currentQuestionIndex];
    setAnswers(prev => ({ ...prev, [question.id]: answer }));
    
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    if (!activeQuiz) return;
    
    let correctCount = 0;
    activeQuiz.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const attempt: QuizAttempt = {
      attemptId: Math.random().toString(36).substr(2, 9),
      completedAt: new Date().toISOString(),
      score: Math.round((correctCount / activeQuiz.questions.length) * 100),
      totalQuestions: activeQuiz.questions.length,
      answers
    };

    recordQuizAttempt(activeQuiz.id, attempt);
    setLastAttempt(attempt);
    setView('results');
  };

  const resetToLibrary = () => {
    setView('library');
    setActiveQuiz(null);
    setLastAttempt(null);
  };

  if (view === 'library') {
    return (
      <div className="module-container">
        <header className="module-header">
          <div>
            <h1>Quiz Library</h1>
            <p className="subtitle">Test your knowledge and review your progress.</p>
          </div>
          <button className="btn-primary">
            <HelpCircle size={18} /> Create Quiz
          </button>
        </header>

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {quizzes.map(quiz => {
            const course = courses.find(c => c.id === quiz.courseId);
            const bestScore = quiz.attempts.length > 0 ? Math.max(...quiz.attempts.map(a => a.score)) : null;
            
            return (
              <div key={quiz.id} className="card quiz-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {course && <span className="course-badge" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-indigo)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{course.title}</span>}
                    <h3 style={{ margin: '8px 0', fontSize: '1.25rem' }}>{quiz.title}</h3>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HelpCircle size={16} /> {quiz.questions.length} Questions</span>
                  {bestScore !== null && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart2 size={16} /> Best: {bestScore}%</span>}
                </div>

                <button 
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: '8px' }}
                  onClick={() => startQuiz(quiz)}
                >
                  <Play size={18} /> Start Quiz
                </button>
              </div>
            );
          })}
          
          {quizzes.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
              <HelpCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3>No quizzes yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Create a quiz to test your knowledge.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'taking' && activeQuiz) {
    const question = activeQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / activeQuiz.questions.length) * 100;

    return (
      <div className="module-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header className="module-header" style={{ marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>{activeQuiz.title}</h1>
            <p className="subtitle">Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</p>
          </div>
          <button className="btn-secondary" onClick={resetToLibrary}>Cancel</button>
        </header>

        <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--border-card)', borderRadius: '3px', marginBottom: '32px', overflow: 'hidden' }}>
          <div className="progress-bar-fill" style={{ height: '100%', width: `${progress}%`, background: 'var(--gradient-primary)', transition: 'width 0.3s ease' }}></div>
        </div>

        <div className="question-card" style={{ background: 'var(--bg-secondary)', padding: '40px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '32px', lineHeight: 1.4 }}>{question.prompt}</h2>

          {question.type === 'multiple-choice' && question.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {question.options.map((opt, idx) => (
                <button 
                  key={idx} 
                  className="quiz-option-btn"
                  style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    background: 'var(--bg-primary)', 
                    border: '1px solid var(--border-card)', 
                    borderRadius: '8px', 
                    fontSize: '1.1rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleAnswer(idx.toString())}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent-violet)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-card)')}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {question.type === 'true-false' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button 
                className="quiz-option-btn"
                style={{ padding: '24px', fontSize: '1.2rem', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-card)', borderRadius: '12px', cursor: 'pointer' }}
                onClick={() => handleAnswer('true')}
              >
                True
              </button>
              <button 
                className="quiz-option-btn"
                style={{ padding: '24px', fontSize: '1.2rem', fontWeight: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-card)', borderRadius: '12px', cursor: 'pointer' }}
                onClick={() => handleAnswer('false')}
              >
                False
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'results' && activeQuiz && lastAttempt) {
    return (
      <div className="module-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header className="module-header" style={{ justifyContent: 'center', marginBottom: '40px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Quiz Results</h1>
            <p className="subtitle" style={{ fontSize: '1.1rem' }}>{activeQuiz.title}</p>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <div style={{ 
            width: '200px', height: '200px', 
            borderRadius: '50%', 
            background: 'var(--bg-secondary)', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: lastAttempt.score >= 70 ? '0 0 40px rgba(20, 184, 166, 0.2)' : '0 0 40px rgba(244, 63, 94, 0.2)',
            border: `8px solid ${lastAttempt.score >= 70 ? 'var(--accent-teal)' : 'var(--accent-rose)'}`
          }}>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: lastAttempt.score >= 70 ? 'var(--accent-teal)' : 'var(--accent-rose)', lineHeight: 1 }}>{lastAttempt.score}%</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginTop: '8px' }}>Score</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
          <h3 style={{ fontSize: '1.2rem', paddingBottom: '12px', borderBottom: '1px solid var(--border-card)' }}>Review Answers</h3>
          
          {activeQuiz.questions.map((q, idx) => {
            const userAnswer = lastAttempt.answers[q.id];
            const isCorrect = userAnswer === q.correctAnswer;
            
            let displayUserAnswer = userAnswer;
            let displayCorrectAnswer = q.correctAnswer;
            
            if (q.type === 'multiple-choice' && q.options) {
              displayUserAnswer = q.options[parseInt(userAnswer)];
              displayCorrectAnswer = q.options[parseInt(q.correctAnswer)];
            }
            
            return (
              <div key={q.id} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? 'var(--accent-teal)' : 'var(--accent-rose)'}` }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ marginTop: '2px' }}>
                    {isCorrect ? <CheckCircle color="var(--accent-teal)" /> : <XCircle color="var(--accent-rose)" />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', lineHeight: 1.4 }}>{idx + 1}. {q.prompt}</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.95rem' }}>
                      <div style={{ color: isCorrect ? 'var(--accent-teal)' : 'var(--accent-rose)', fontWeight: 500 }}>
                        Your answer: {displayUserAnswer || 'None'}
                      </div>
                      {!isCorrect && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                          Correct answer: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{displayCorrectAnswer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {q.explanation && (
                  <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '36px' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={resetToLibrary} style={{ padding: '12px 24px' }}>
            <LayoutGrid size={18} /> Back to Library
          </button>
          <button className="btn-primary" onClick={() => startQuiz(activeQuiz)} style={{ padding: '12px 24px' }}>
            <RotateCcw size={18} /> Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
}
