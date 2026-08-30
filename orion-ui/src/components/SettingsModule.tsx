import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Save, Trash2, Key, Clock, Monitor, Shield, Info, Palette } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES, OrionModeId } from "../config/modes";

export default function SettingsModule() {
  const { activeMode, setActiveMode, pomodoroSettings, updatePomodoroSettings } = useOrionStore();
  const [provider, setProvider] = useState("openai");
  const [credential, setCredential] = useState("");
  const [credentialStatus, setCredentialStatus] = useState<"checking" | "configured" | "missing">("checking");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    checkCredentialStatus();
  }, [provider]);

  const checkCredentialStatus = async () => {
    try {
      setCredentialStatus("checking");
      const configured = await invoke<boolean>("check_api_credential", { provider });
      setCredentialStatus(configured ? "configured" : "missing");
    } catch (error) {
      console.error("Failed to check credential:", error);
      setCredentialStatus("missing");
    }
  };

  const handleSaveCredential = async () => {
    if (!credential.trim()) return;
    try {
      await invoke("save_api_credential", { provider, secret: credential.trim() });
      setCredential("");
      setStatusMessage("Credential saved securely.");
      setCredentialStatus("configured");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (error) {
      setStatusMessage("Error saving credential.");
    }
  };

  const handleRemoveCredential = async () => {
    try {
      await invoke("remove_api_credential", { provider });
      setStatusMessage("Credential removed.");
      setCredentialStatus("missing");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (error) {
      setStatusMessage("Error removing credential.");
    }
  };

  const updatePomodoro = (field: keyof typeof pomodoroSettings, value: number) => {
    updatePomodoroSettings({ [field]: value });
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.5rem 0", background: "linear-gradient(to right, #8b5cf6, #d946ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Settings & Control Center</h1><p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>Manage your secure credentials, context modes, and application preferences.</p>
      </div>
      <div className="module-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
        
        {/* GENERAL SECTION */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Monitor size={18} /> General
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Default Mode</h4>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Choose the primary context lens for your workspace.
                </p>
              </div>
              <select
                value={activeMode}
                onChange={(e) => setActiveMode(e.target.value as OrionModeId)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                {Object.values(ORION_MODES).map((mode) => (
                  <option key={mode.id} value={mode.id}>{mode.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* AI CONFIGURATION SECTION */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Key size={18} /> AI Configuration
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Configure your AI provider credentials. Keys are stored securely in your operating system's native keychain and are never exposed to the UI or synced to cloud storage.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  maxWidth: '300px'
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>API Credential</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  style={{
                    flex: 1,
                    maxWidth: '400px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  className="btn-primary"
                  onClick={handleSaveCredential}
                  disabled={!credential.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} /> Save
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color={credentialStatus === "configured" ? "var(--success-color, #10b981)" : "var(--text-secondary)"} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Status:</span>
                <span style={{ color: credentialStatus === "configured" ? "var(--success-color, #10b981)" : "var(--text-secondary)" }}>
                  {credentialStatus === "checking" ? "Checking..." : credentialStatus === "configured" ? "✓ Configured" : "Not Configured"}
                </span>
              </div>
              
              {credentialStatus === "configured" && (
                <button
                  onClick={handleRemoveCredential}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'var(--danger-color, #ef4444)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
            
            {statusMessage && (
              <p style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{statusMessage}</p>
            )}
          </div>
        </section>

        {/* FOCUS SECTION */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Clock size={18} /> Focus & Pomodoro
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>Focus Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={pomodoroSettings.pomodoro}
                  onChange={(e) => updatePomodoro('pomodoro', parseInt(e.target.value) || 25)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>Short Break (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={pomodoroSettings.shortBreak}
                  onChange={(e) => updatePomodoro('shortBreak', parseInt(e.target.value) || 5)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>Long Break (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={pomodoroSettings.longBreak}
                  onChange={(e) => updatePomodoro('longBreak', parseInt(e.target.value) || 15)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* DATA & PRIVACY SECTION */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Palette size={18} /> Data & Privacy
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Your domain data (Tasks, Notes, Plans, etc.) is currently persisted locally using browser-level storage (localStorage). Orion respects your privacy by never transmitting your personal data to remote servers unless explicitly required for AI capabilities via your configured API key.
            </p>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Info size={18} /> About
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>ORION</h4>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Personal Operating System
              </p>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Version 0.1.0
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}


