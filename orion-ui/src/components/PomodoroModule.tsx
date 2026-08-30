import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Brain, Coffee, Wind, Settings } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useOrionStore } from "../store/useOrionStore";
import { animate, stagger } from "animejs";

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const DEFAULT_TIMES = { pomodoro: 25, shortBreak: 5, longBreak: 15 };

export default function PomodoroModule() {
  const [searchParams] = useSearchParams();
  const initialTaskId = searchParams.get("taskId");

  const tasks = useOrionStore(state => state.tasks);
  const updateTask = useOrionStore(state => state.updateTask);
  const storedSettings = useOrionStore(state => state.pomodoroSettings);
  const updatePomodoroSettings = useOrionStore(state => state.updatePomodoroSettings);

  const pomodoroSettings = storedSettings || DEFAULT_TIMES;

  const getModeTime = (m: TimerMode) => {
    const val = pomodoroSettings[m];
    return (val ? val : DEFAULT_TIMES[m]) * 60;
  };

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(getModeTime('pomodoro'));
  const [isActive, setIsActive] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId || "");
  const [showSettings, setShowSettings] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      animate(".pomodoro-container > *", {
        translateY: [20, 0],
        opacity: [0, 1],
        delay: stagger(80),
        ease: "outExpo",
        duration: 800,
      });
    }
  }, []);

  
  // When settings change, if timer is not active, update the time left
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(getModeTime(mode));
    }
  }, [pomodoroSettings, mode, isActive]); // ensure isActive is in deps so it accurately knows

  // Switch modes and reset timer
  const handleModeSwitch = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(getModeTime(newMode));
    setIsActive(false);
    setShowSettings(false);
  };

    // Timer logic - robust interval handling
  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Handle completion
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleTimerComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isActive]);

  const handleTimerComplete = () => {
    if (mode === 'pomodoro' && selectedTaskId) {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (task) {
        updateTask(task.id, { 
          pomodorosCompleted: (task.pomodorosCompleted || 0) + 1 
        });
      }
    }
    
    // Play a sound or notification here in the future
    alert(`Time's up! ${mode === 'pomodoro' ? 'Take a break.' : 'Back to work!'}`);
    
    // Auto-switch to next logical mode
    if (mode === 'pomodoro') {
      handleModeSwitch('shortBreak');
    } else {
      handleModeSwitch('pomodoro');
    }
  };

  const toggleTimer = () => {
    if (timeLeft > 0) setIsActive(!isActive);
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getModeTime(mode));
  };

  // Format time (MM:SS)
  // Protect against NaN just in case
  const safeTimeLeft = isNaN(timeLeft) ? 0 : timeLeft;
  const minutes = Math.floor(safeTimeLeft / 60);
  const seconds = safeTimeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Calculate SVG Circle dash offset
  const circleRadius = 140;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const totalModeTime = getModeTime(mode);
  const progressPercent = totalModeTime > 0 ? ((totalModeTime - safeTimeLeft) / totalModeTime) : 1;
  const strokeDashoffset = circleCircumference - (progressPercent * circleCircumference);

  // Dynamic colors based on mode
  const modeColor = mode === 'pomodoro' ? 'var(--accent-rose)' : 'var(--accent-teal)';

  return (
    <div className="pomodoro-module">
      <div className="pomodoro-container">
        
        <header className="pomodoro-header">
          <h1>Focus Hub</h1>
          <p className="subtitle">Deep work, no distractions.</p>
        </header>

        {/* Task Selection */}
        <div className="task-selector-wrapper">
          <select 
            className="task-selector" 
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
          >
            <option value="">Select a task to focus on (Optional)</option>
            {tasks.filter(t => t.status !== "Completed").map(task => (
              <option key={task.id} value={task.id}>
                {task.title} {task.pomodorosCompleted ? `(${task.pomodorosCompleted} 🍅)` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Toggles */}
        <div className="pomodoro-modes">
          <button 
            className={`mode-btn ${mode === 'pomodoro' ? 'active pomodoro-theme' : ''}`}
            onClick={() => handleModeSwitch('pomodoro')}
          >
            <Brain size={16} /> Pomodoro
          </button>
          <button 
            className={`mode-btn ${mode === 'shortBreak' ? 'active break-theme' : ''}`}
            onClick={() => handleModeSwitch('shortBreak')}
          >
            <Coffee size={16} /> Short Break
          </button>
          <button 
            className={`mode-btn ${mode === 'longBreak' ? 'active break-theme' : ''}`}
            onClick={() => handleModeSwitch('longBreak')}
          >
            <Wind size={16} /> Long Break
          </button>
          <button 
            className="mode-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Timer Settings"
            style={{ marginLeft: '12px', borderLeft: '1px solid var(--border-light)', borderRadius: 0, paddingLeft: '24px' }}
          >
            <Settings size={16} />
          </button>
        </div>

        {showSettings ? (
          <div className="pomodoro-settings-panel">
            <h3>Timer Settings (Minutes)</h3>
            <div className="settings-row">
              <label>Pomodoro</label>
              <input 
                type="number" 
                min="1" max="120"
                value={pomodoroSettings.pomodoro}
                onChange={e => updatePomodoroSettings({ pomodoro: parseInt(e.target.value) || 25 })}
              />
            </div>
            <div className="settings-row">
              <label>Short Break</label>
              <input 
                type="number" 
                min="1" max="60"
                value={pomodoroSettings.shortBreak}
                onChange={e => updatePomodoroSettings({ shortBreak: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="settings-row">
              <label>Long Break</label>
              <input 
                type="number" 
                min="1" max="60"
                value={pomodoroSettings.longBreak}
                onChange={e => updatePomodoroSettings({ longBreak: parseInt(e.target.value) || 15 })}
              />
            </div>
            <button className="btn-primary" onClick={() => setShowSettings(false)} style={{ marginTop: '16px', width: '100%' }}>Done</button>
          </div>
        ) : (
          <>
            {/* The Giant Timer */}
                        <div className={`timer-wrapper ${isActive ? "is-active" : ""} ${mode === "pomodoro" ? "pomodoro-theme" : "break-theme"}`}>
              <svg width="320" height="320" className="timer-svg">
                {/* Background Track */}
                <circle 
                  cx="160" cy="160" r={circleRadius} 
                  className="timer-track"
                  transform="rotate(-90 160 160)"
                />
                {/* Progress Bar */}
                <circle 
                  cx="160" cy="160" r={circleRadius} 
                  className="timer-progress"
                  transform="rotate(-90 160 160)"
                  style={{
                    stroke: modeColor,
                    strokeDasharray: circleCircumference,
                    strokeDashoffset: strokeDashoffset,
                    transition: 'stroke-dashoffset 1s linear'
                  }}
                />
              </svg>
              <div className="timer-text-overlay" style={{ color: modeColor }}>
                {timeString}
              </div>
            </div>

                        {/* Controls */}
            <div className="timer-controls">
              <button 
                className={`control-btn primary ${isActive ? (mode === 'pomodoro' ? 'active-pomodoro' : 'active-break') : ''}`} 
                onClick={toggleTimer} 
                style={{ backgroundColor: modeColor }}
              >
                {isActive ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button className="control-btn secondary" onClick={resetTimer}>
                <RotateCcw size={24} />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
