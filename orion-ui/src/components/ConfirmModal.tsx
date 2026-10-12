import { useEffect, useRef } from 'react';
import { AlertOctagon } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, message, onConfirm, onCancel }: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.2)', // Very subtle backdrop
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: '60px',
      zIndex: 9999,
      animation: 'overlayFade 300ms ease-out forwards',
    }}>
      <style>{`
        @keyframes overlayFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pillPop { 
          0% { opacity: 0; transform: translateY(40px) scale(0.9); } 
          100% { opacity: 1; transform: translateY(0) scale(1); } 
        }
      `}</style>

      <div ref={modalRef} style={{
        background: 'rgba(15, 15, 20, 0.85)', // Deep space dark
        backdropFilter: 'blur(30px) saturate(150%)',
        WebkitBackdropFilter: 'blur(30px) saturate(150%)',
        borderRadius: '9999px', // Perfect pill
        padding: '10px 10px 10px 24px',
        boxShadow: '0 24px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.05)',
        animation: 'pillPop 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        maxWidth: '90vw',
        overflow: 'hidden'
      }}>
        
        {/* Left Side: Icon and Message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            color: '#fb7185', // Soft rose neon
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            filter: 'drop-shadow(0 0 8px rgba(251, 113, 133, 0.4))'
          }}>
            <AlertOctagon size={22} strokeWidth={2} />
          </div>
          <span style={{ 
            fontSize: '15px', 
            fontWeight: 500, 
            color: '#f8fafc',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            maxWidth: '400px'
          }}>
            {message}
          </span>
        </div>
        
        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button 
            onClick={onCancel}
            style={{
              padding: '10px 20px', borderRadius: '9999px', border: 'none', background: 'transparent',
              fontSize: '14px', fontWeight: 600, color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#f8fafc';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onCancel(); }}
            style={{
              padding: '10px 24px', borderRadius: '9999px', border: 'none', 
              background: '#e11d48', // Strong crimson
              fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f43f5e';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(244, 63, 94, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#e11d48';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(225, 29, 72, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
