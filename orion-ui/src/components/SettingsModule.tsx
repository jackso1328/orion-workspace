import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Save, 
  Trash2, 
  Key, 
  Clock, 
  Monitor, 
  Shield, 
  Info, 
  Palette, 
  Download, 
  Cpu, 
  Cloud, 
  Pause, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  HardDrive, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  XCircle,
  Moon,
  Zap
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES, OrionModeId } from "../config/modes";

export default function SettingsModule() {
  const { 
    activeMode, 
    setActiveMode, 
    pomodoroSettings, 
    updatePomodoroSettings,
    aiEngineStatus,
    aiDownloadProgress,
    aiModelSizeFormatted,
    aiProvider,
    aiMemoryState,
    setIsAiDownloadModalOpen,
    startAiModelDownload,
    pauseAiModelDownload,
    resumeAiModelDownload,
    cancelAiModelDownload,
    deleteLocalModel,
    checkAiSystemStatus,
    setAiMemoryMode,
    hibernateLocalModel,
  } = useOrionStore();

  // Cloud credential state
  const [provider, setProvider] = useState("openai");
  const [credential, setCredential] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<"checking" | "configured" | "missing">("checking");
  const [statusMessage, setStatusMessage] = useState("");
  
  // Local model state & delete confirmation
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCheckingSystem, setIsCheckingSystem] = useState(false);
  const [isHibernating, setIsHibernating] = useState(false);

  const isDownloading = aiEngineStatus === "downloading" || aiDownloadProgress.status === "downloading";
  const isPaused = aiEngineStatus === "paused" || aiDownloadProgress.status === "paused";
  const isLocalReady = aiEngineStatus === "local_ready";
  const isCloudReady = aiEngineStatus === "cloud_ready";
  const isModelInstalled = isLocalReady || (aiDownloadProgress.status === "completed");

  useEffect(() => {
    checkCredentialStatus();
    checkAiSystemStatus();
    const interval = setInterval(() => {
      checkAiSystemStatus();
    }, 10000);
    return () => clearInterval(interval);
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
      setStatusMessage("Credential saved securely to OS Keychain.");
      setCredentialStatus("configured");
      // Synchronize global AI state
      await checkAiSystemStatus();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (error) {
      setStatusMessage("Error saving credential.");
    }
  };

  const handleRemoveCredential = async () => {
    try {
      await invoke("remove_api_credential", { provider });
      setStatusMessage("Credential removed from OS Keychain.");
      setCredentialStatus("missing");
      // Synchronize global AI state
      await checkAiSystemStatus();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (error) {
      setStatusMessage("Error removing credential.");
    }
  };

  const handleSyncAiStatus = async () => {
    setIsCheckingSystem(true);
    try {
      await checkAiSystemStatus();
      await checkCredentialStatus();
    } finally {
      setTimeout(() => setIsCheckingSystem(false), 500);
    }
  };

  const handleDeleteModel = async () => {
    setIsDeletingModel(true);
    try {
      await deleteLocalModel();
      setShowDeleteConfirm(false);
      setStatusMessage("Local model deleted and disk space freed.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (error) {
      console.error("Failed to delete model:", error);
      setStatusMessage("Failed to delete local model.");
    } finally {
      setIsDeletingModel(false);
    }
  };

  const handleHibernate = async () => {
    setIsHibernating(true);
    try {
      await hibernateLocalModel();
      setStatusMessage("Local model unloaded from RAM (Freed ~2.1 GB).");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Failed to hibernate model:", err);
      setStatusMessage("Failed to hibernate model.");
    } finally {
      setIsHibernating(false);
    }
  };

  const updatePomodoro = (field: keyof typeof pomodoroSettings, value: number) => {
    updatePomodoroSettings({ [field]: value });
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 MB";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="module-container">
      <style>{`
        .settings-ai-hero {
          background: linear-gradient(135deg, rgba(30, 27, 46, 0.95), rgba(18, 16, 28, 0.95));
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .settings-spec-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        }
        .settings-danger-card {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
      `}</style>

      <div className="module-header">
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.5rem 0", background: "linear-gradient(to right, #8b5cf6, #d946ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Settings & Control Center
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
          Manage your AI runtime, secure credentials, context modes, and application preferences.
        </p>
      </div>

      <div className="module-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
        
        {/* --- 1. AI ENGINE ACTIVE RUNTIME OVERVIEW --- */}
        <section className="settings-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', margin: 0 }}>
              <Cpu size={18} /> Active AI Engine
            </h3>
            <button
              onClick={handleSyncAiStatus}
              disabled={isCheckingSystem}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "6px 12px",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title="Re-check local model and OS Keychain credentials"
            >
              <RefreshCw size={13} className={isCheckingSystem ? "animate-spin" : ""} />
              {isCheckingSystem ? "Syncing..." : "Sync Status"}
            </button>
          </div>

          <div className="settings-ai-hero">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isCloudReady
                    ? "rgba(16, 185, 129, 0.15)"
                    : isLocalReady
                    ? "rgba(139, 92, 246, 0.2)"
                    : isDownloading
                    ? "rgba(99, 102, 241, 0.2)"
                    : isPaused
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(239, 68, 68, 0.15)",
                  color: isCloudReady
                    ? "#34d399"
                    : isLocalReady
                    ? "#c084fc"
                    : isDownloading
                    ? "#818cf8"
                    : isPaused
                    ? "#fbbf24"
                    : "#f87171",
                  border: `1px solid ${
                    isCloudReady
                      ? "rgba(16, 185, 129, 0.35)"
                      : isLocalReady
                      ? "rgba(139, 92, 246, 0.4)"
                      : isDownloading
                      ? "rgba(99, 102, 241, 0.4)"
                      : isPaused
                      ? "rgba(245, 158, 11, 0.4)"
                      : "rgba(239, 68, 68, 0.35)"
                  }`
                }}
              >
                {isCloudReady ? (
                  <Cloud size={24} />
                ) : isLocalReady ? (
                  <Cpu size={24} />
                ) : isDownloading ? (
                  <Download size={24} />
                ) : isPaused ? (
                  <Pause size={24} />
                ) : (
                  <AlertTriangle size={24} />
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                    {isCloudReady
                      ? "Cloud AI Engine Active"
                      : isLocalReady
                      ? "Standalone Local AI Active (Qwen 2.5 3B)"
                      : isDownloading
                      ? `Downloading Orion Brain (${Math.round(aiDownloadProgress.percent || 0)}%)`
                      : isPaused
                      ? `Model Download Paused (${Math.round(aiDownloadProgress.percent || 0)}%)`
                      : "AI Engine Inactive"}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontWeight: 600,
                      background: isCloudReady
                        ? "rgba(16, 185, 129, 0.2)"
                        : isLocalReady
                        ? "rgba(139, 92, 246, 0.2)"
                        : isDownloading
                        ? "rgba(99, 102, 241, 0.2)"
                        : isPaused
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(239, 68, 68, 0.2)",
                      color: isCloudReady
                        ? "#34d399"
                        : isLocalReady
                        ? "#c084fc"
                        : isDownloading
                        ? "#818cf8"
                        : isPaused
                        ? "#fbbf24"
                        : "#f87171"
                    }}
                  >
                    {isCloudReady ? (aiProvider === 'cloud' ? "CLOUD KEY" : "CLOUD") : isLocalReady ? "OFFLINE READY" : isDownloading ? "DOWNLOADING" : isPaused ? "PAUSED" : "DISABLED"}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                  {isCloudReady
                    ? "Queries are executed via your securely configured cloud API key in native OS Keychain."
                    : isLocalReady
                    ? "100% private and offline on device. Powered by Qwen 2.5 3B with native C++ acceleration."
                    : isDownloading
                    ? "Retrieving the standalone local model files. You can pause or view details anytime."
                    : isPaused
                    ? "Download paused. Your saved chunks are preserved on disk."
                    : "No cloud API key configured and local model is not downloaded. Voice input and chat are inactive."}
                </p>
              </div>
            </div>

            {/* Quick action button */}
            {!isLocalReady && !isCloudReady && (
              <button
                className="btn-primary"
                onClick={() => setIsAiDownloadModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontSize: "0.88rem"
                }}
              >
                <Download size={16} /> Activate Orion AI
              </button>
            )}
          </div>
        </section>

        {/* --- 2. LOCAL AI MODEL MANAGEMENT CARD --- */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <HardDrive size={18} /> Standalone Local Model (Zero-Dependency)
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: "1.05rem" }}>
                  Qwen 2.5 3B Instruct (4-bit Q4_K_M GGUF)
                </h4>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Standalone weights running with native <code>llama-cpp-python</code>. Zero external prerequisites like Ollama.
                </p>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: isModelInstalled ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: isModelInstalled ? "#34d399" : "var(--text-secondary)",
                  border: `1px solid ${isModelInstalled ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.1)"}`
                }}
              >
                {isModelInstalled ? <CheckCircle2 size={13} /> : <HardDrive size={13} />}
                {isModelInstalled ? "Installed & Verified" : "Not Installed"}
              </span>
            </div>

            {/* Spec tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span className="settings-spec-badge">
                <strong>Disk Size:</strong> {aiModelSizeFormatted || "2.1 GB"}
              </span>
              <span className="settings-spec-badge">
                <strong>Hardware:</strong> Ryzen 7 4800H CPU / RTX 3050 4GB dGPU
              </span>
              <span className="settings-spec-badge">
                <strong>Format:</strong> GGUF (4-bit Quantized)
              </span>
              <span className="settings-spec-badge">
                <strong>Embeddings:</strong> FastEmbed (BAAI/bge-small)
              </span>
              <span className="settings-spec-badge">
                <strong>Speech:</strong> Kokoro TTS + Faster-Whisper
              </span>
            </div>

            {/* Download / Progress Area */}
            {(isDownloading || isPaused) && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {isPaused ? "Download Paused" : "Downloading Weights..."}
                  </span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: isPaused ? "#fbbf24" : "#c084fc" }}>
                    {Math.round(aiDownloadProgress.percent || 0)}%
                  </span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "999px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(Math.max(aiDownloadProgress.percent || 0, 0), 100)}%`,
                      background: isPaused
                        ? "linear-gradient(90deg, #f59e0b, #d97706)"
                        : "linear-gradient(90deg, #8b5cf6, #d946ef)",
                      borderRadius: "999px",
                      transition: "width 0.3s ease-out"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <span>
                    {formatBytes(aiDownloadProgress.downloadedBytes)} / {aiDownloadProgress.totalBytes ? formatBytes(aiDownloadProgress.totalBytes) : (aiModelSizeFormatted || "2.1 GB")}
                  </span>
                  <span>
                    {isPaused ? "Progress saved" : `Speed: ${aiDownloadProgress.speedMbps ? `${aiDownloadProgress.speedMbps.toFixed(1)} MB/s` : "--"}`}
                  </span>
                </div>
              </div>
            )}

            {/* Memory & Auto-Sleep Section (shown when model is installed) */}
            {isModelInstalled && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Moon size={16} color={aiMemoryState?.isLoaded ? "#c084fc" : "#34d399"} />
                    <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      RAM Management & Auto-Sleep
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.78rem",
                        padding: "3px 9px",
                        borderRadius: "999px",
                        fontWeight: 600,
                        background: aiMemoryState?.isLoaded ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: aiMemoryState?.isLoaded ? "#c084fc" : "#34d399",
                        border: `1px solid ${aiMemoryState?.isLoaded ? "rgba(139, 92, 246, 0.3)" : "rgba(16, 185, 129, 0.3)"}`
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: aiMemoryState?.isLoaded ? "#c084fc" : "#34d399",
                          boxShadow: aiMemoryState?.isLoaded ? "0 0 8px #c084fc" : "0 0 8px #34d399"
                        }}
                      />
                      {aiMemoryState?.isLoaded ? "Active in RAM (~2.1 GB)" : "Sleeping (0 MB RAM)"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "460px", lineHeight: 1.4 }}>
                    {aiMemoryState?.isLoaded
                      ? (aiMemoryState?.memoryMode === "eco"
                          ? "Model is currently warm in memory. It will auto-sleep after 5 minutes of inactivity to release ~2.1 GB RAM back to your system."
                          : "Model is kept warm in RAM for instantaneous responses.")
                      : "Model is currently unloaded from RAM, keeping your system fast and cool for multitasking. It wakes automatically in ~2s on your next prompt."}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Eco vs Always-On Mode Toggle */}
                    <div
                      style={{
                        display: "flex",
                        background: "rgba(0, 0, 0, 0.25)",
                        padding: "3px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        gap: "2px"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setAiMemoryMode("eco")}
                        style={{
                          background: (aiMemoryState?.memoryMode ?? "eco") === "eco" ? "rgba(139, 92, 246, 0.3)" : "transparent",
                          color: (aiMemoryState?.memoryMode ?? "eco") === "eco" ? "#ffffff" : "var(--text-secondary)",
                          border: "none",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                        title="Auto-unloads model after 5 minutes idle"
                      >
                        <Moon size={12} />
                        Eco (Auto-Sleep)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiMemoryMode("always_on")}
                        style={{
                          background: aiMemoryState?.memoryMode === "always_on" ? "rgba(139, 92, 246, 0.3)" : "transparent",
                          color: aiMemoryState?.memoryMode === "always_on" ? "#ffffff" : "var(--text-secondary)",
                          border: "none",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                        title="Keeps model loaded in RAM permanently"
                      >
                        <Zap size={12} />
                        Always-On
                      </button>
                    </div>

                    {/* 1-Click Hibernate Button (visible when loaded) */}
                    {aiMemoryState?.isLoaded && (
                      <button
                        type="button"
                        onClick={handleHibernate}
                        disabled={isHibernating}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          color: "var(--text-primary)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        title="Unload model immediately and free 2.1 GB RAM"
                      >
                        <Moon size={13} />
                        {isHibernating ? "Hibernating..." : "Hibernate Now"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Model Action Controls */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              {isDownloading ? (
                <>
                  <button
                    onClick={() => pauseAiModelDownload()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "#fbbf24",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <Pause size={14} /> Pause Download
                  </button>
                  <button
                    onClick={() => setIsAiDownloadModalOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    <ExternalLink size={14} /> View Details
                  </button>
                  <button
                    onClick={() => cancelAiModelDownload()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "transparent",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    <XCircle size={14} /> Cancel
                  </button>
                </>
              ) : isPaused ? (
                <>
                  <button
                    onClick={() => resumeAiModelDownload()}
                    className="btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.85rem"
                    }}
                  >
                    <Play size={14} /> Resume Download
                  </button>
                  <button
                    onClick={() => setIsAiDownloadModalOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    <ExternalLink size={14} /> View Details
                  </button>
                  <button
                    onClick={() => cancelAiModelDownload()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "transparent",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    <XCircle size={14} /> Cancel
                  </button>
                </>
              ) : isModelInstalled ? (
                <>
                  <button
                    onClick={() => setIsAiDownloadModalOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    <ExternalLink size={14} /> Inspect Model Specs
                  </button>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 14px",
                        color: "#ef4444",
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      <Trash2 size={14} /> Delete Model (Free 2.1 GB)
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsAiDownloadModalOpen(true)}
                    className="btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      borderRadius: "8px",
                      padding: "9px 16px",
                      fontSize: "0.88rem"
                    }}
                  >
                    <Download size={15} /> Download Local Model ({aiModelSizeFormatted || "2.1 GB"})
                  </button>
                  <button
                    onClick={() => startAiModelDownload()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "9px 14px",
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    Start Download in Background
                  </button>
                </>
              )}
            </div>

            {/* Inline Delete Confirmation Dialog */}
            {showDeleteConfirm && (
              <div className="settings-danger-card">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171" }}>
                  <AlertTriangle size={18} />
                  <strong style={{ fontSize: "0.95rem" }}>Confirm Deletion of Local AI Model</strong>
                </div>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Deleting the local weights will free approximately 2.1 GB of storage. Orion will no longer be able to run offline reasoning or voice input without downloading the model again or configuring a cloud API key.
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    onClick={handleDeleteModel}
                    disabled={isDeletingModel}
                    style={{
                      background: "#ef4444",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "#ffffff",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {isDeletingModel ? "Deleting..." : "Yes, Delete 2.1 GB Model"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingModel}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* --- 3. CLOUD AI CONFIGURATION SECTION --- */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Key size={18} /> Cloud AI Configuration
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
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>API Credential</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "420px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="sk-..."
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: '10px 40px 10px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center"
                    }}
                    title={showPassword ? "Hide key" : "Show key"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Keychain Status:</span>
                <span style={{ color: credentialStatus === "configured" ? "var(--success-color, #10b981)" : "var(--text-secondary)" }}>
                  {credentialStatus === "checking" ? "Checking..." : credentialStatus === "configured" ? "✓ Configured Securely" : "Not Configured"}
                </span>
              </div>
              
              {credentialStatus === "configured" && (
                <button
                  onClick={handleRemoveCredential}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'var(--danger-color, #ef4444)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  <Trash2 size={16} /> Remove Key
                </button>
              )}
            </div>
            
            {statusMessage && (
              <p style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{statusMessage}</p>
            )}
          </div>
        </section>

        {/* --- 4. GENERAL SECTION --- */}
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

        {/* --- 5. FOCUS SECTION --- */}
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

        {/* --- 6. DATA & PRIVACY SECTION --- */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Palette size={18} /> Data & Privacy
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Your domain data (Tasks, Notes, Plans, etc.) is persisted locally using browser-level storage (localStorage). Orion respects your privacy by never transmitting your personal data to remote servers unless explicitly required for AI capabilities via your configured API key. When using the Standalone Local Model, all inference runs 100% on your local machine with zero external network transmission.
            </p>
          </div>
        </section>

        {/* --- 7. ABOUT SECTION --- */}
        <section className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Info size={18} /> About
          </h3>
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>ORION</h4>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Autonomous Personal Desktop Operating System
              </p>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Version 0.1.0 • Standalone AI Runtime
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
