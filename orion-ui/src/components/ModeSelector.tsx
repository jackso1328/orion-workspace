import { useState, useRef, useEffect } from "react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES, OrionModeId } from "../config/modes";
import { ChevronDown, Book, Microscope, Code, GraduationCap, Briefcase, Layout } from "lucide-react";

// Helper to map string icon names to Lucide components
const IconMap: Record<string, any> = {
  Book,
  Microscope,
  Code,
  GraduationCap,
  Briefcase,
  Layout
};

export default function ModeSelector() {
  const activeModeId = useOrionStore(state => state.activeMode);
  const setActiveMode = useOrionStore(state => state.setActiveMode);
  const [isOpen, setIsOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeMode = ORION_MODES[activeModeId] || ORION_MODES['study'];
  const ActiveIcon = IconMap[activeMode.iconName] || Layout;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mode-selector-container" ref={dropdownRef} >
      <button 
        className="mode-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '12px',
          cursor: 'pointer',
          color: '#333',
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ActiveIcon size={18} />
          <span>{activeMode.name} Mode</span>
        </div>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div 
          className="mode-selector-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '4px'
          }}
        >
          {Object.values(ORION_MODES).map((mode) => {
            const ModeIcon = IconMap[mode.iconName] || Layout;
            const isSelected = mode.id === activeModeId;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  setActiveMode(mode.id as OrionModeId);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: isSelected ? '#4f46e5' : '#444',
                  fontWeight: isSelected ? 600 : 500,
                  transition: 'background 0.2s ease'
                }}
              >
                <ModeIcon size={16} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{mode.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 400 }}>{mode.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

