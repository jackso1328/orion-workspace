import { format, parseISO } from "date-fns";
import { Check, X, Trash2, CalendarClock, AlertCircle } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { Plan } from "../domain/planning/types";

interface Props {
  plan: Plan;
  onClose: () => void;
}

export default function PlanReviewModal({ plan, onClose }: Props) {
  const updatePlanStatus = useOrionStore(state => state.updatePlanStatus);
  const removePlan = useOrionStore(state => state.removePlan);
  const tasks = useOrionStore(state => state.tasks);

  const handleAccept = () => {
    updatePlanStatus(plan.id, "accepted");
    onClose();
  };

  const handleReject = () => {
    updatePlanStatus(plan.id, "rejected");
    onClose();
  };

  const handleDelete = () => {
    removePlan(plan.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content plan-review-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', padding: 0, overflow: 'hidden' }}>
        
        <header className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(217, 70, 239, 0.1))', borderBottom: '1px solid var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <CalendarClock size={24} color="var(--accent-purple)" />
            <h2 style={{ margin: 0 }}>Review Proposed Plan</h2>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Generated {format(parseISO(plan.createdAt), "MMM d, h:mm a")}
          </p>
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
            {plan.status === 'proposed' && <span className="status-badge" style={{ background: 'var(--accent-teal)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>PROPOSED</span>}
            {plan.status === 'accepted' && <span className="status-badge" style={{ background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>ACCEPTED</span>}
            {plan.status === 'rejected' && <span className="status-badge" style={{ background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>REJECTED</span>}
          </div>
        </header>

        <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Scheduled Tasks ({plan.items.length})</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {plan.items.map((item, idx) => {
              const task = tasks.find(t => t.id === item.taskId);
              const start = parseISO(item.startTime);
              const end = parseISO(item.endTime);
              const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);

              return (
                <div key={item.id || idx} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '80px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{format(start, "HH:mm")}</span>
                    <span>{durationMins} min</span>
                  </div>
                  <div style={{ width: '2px', background: task ? task.color : 'var(--border-card)', borderRadius: '2px' }}></div>
                  <div style={{ flex: 1 }}>
                    {task ? (
                      <>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{task.title}</h4>
                        {task.courseId && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Course ID: {task.courseId}</span>}
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                        <AlertCircle size={16} />
                        <span style={{ fontSize: '0.9rem' }}>Task reference not found (ID: {item.taskId})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
          <button 
            className="icon-btn delete-btn" 
            onClick={handleDelete}
            style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}
          >
            <Trash2 size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Delete Plan</span>
          </button>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {plan.status === 'proposed' && (
              <>
                <button 
                  onClick={handleReject}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '6px', border: '1px solid var(--border-card)', background: 'white', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
                >
                  <X size={18} /> Reject
                </button>
                <button 
                  onClick={handleAccept}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: 'var(--accent-purple)', color: 'white', cursor: 'pointer', fontWeight: 500 }}
                >
                  <Check size={18} /> Accept
                </button>
              </>
            )}
            {plan.status !== 'proposed' && (
              <button 
                onClick={onClose}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '1px solid var(--border-card)', background: 'white', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
              >
                Close
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
