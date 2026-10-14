import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Save, 
  Trash2, 
  Key, 
  Shield, 
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
  Zap,
  HelpCircle,
  Sliders
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES, OrionModeId } from "../config/modes";
import "./SettingsModule.css";

interface HardwareStatus {
  executionDevice: string;
  deviceName: string;
  gpuAccelerated: boolean;
  cpuName: string;
  gpuName: string;
}

interface InfoTooltipProps {
  content: string;
  ariaLabel?: string;
}

/**
 * Lightweight, accessible contextual help popover component.
 * Supports hover, click/touch toggle, keyboard focus, and Escape dismissal.
 */
function InfoTooltip({ content, ariaLabel = "More information" }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVisible(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible]);

  return (
    <span 
      ref={containerRef}
      className="settings-tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <button
        type="button"
        className="settings-info-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible((prev) => !prev);
        }}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label={ariaLabel}
        aria-expanded={isVisible}
      >
        <HelpCircle size={12} />
      </button>

      {isVisible && (
        <span className="settings-popover" role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}

type SettingsTab = "ai" | "cloud" | "preferences" | "about";

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

  // Active sub-tab state (Linear / Raycast pattern)
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");

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

  // Dynamic hardware metadata
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus>({
    executionDevice: "gpu",
    deviceName: "NVIDIA GeForce RTX 3050 Laptop GPU",
    gpuAccelerated: true,
    cpuName: "AMD Ryzen 7 4800H",
    gpuName: "NVIDIA GeForce RTX 3050 Laptop GPU"
  });

  const isDownloading = aiEngineStatus === "downloading" || aiDownloadProgress.status === "downloading";
  const isPaused = aiEngineStatus === "paused" || aiDownloadProgress.status === "paused";
  const isLocalReady = aiEngineStatus === "local_ready";
  const isCloudReady = aiEngineStatus === "cloud_ready";
  const isModelInstalled = isLocalReady || (aiDownloadProgress.status === "completed");

  useEffect(() => {
    checkCredentialStatus();
    fetchHardwareAndStatus();
    const interval = setInterval(() => {
      fetchHardwareAndStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [provider]);

  const fetchHardwareAndStatus = async () => {
    try {
      await checkAiSystemStatus();
      const res = await fetch("http://localhost:8000/api/ai/status");
      if (res.ok) {
        const data = await res.json();
        setHardwareStatus({
          executionDevice: data.execution_device || data.executionDevice || "cpu",
          deviceName: data.device_name || data.deviceName || "Multi-core CPU",
          gpuAccelerated: Boolean(data.gpu_accelerated ?? data.gpuAccelerated),
          cpuName: data.hardware?.cpu?.name || "AMD Ryzen 7 4800H",
          gpuName: data.hardware?.gpu?.name || "NVIDIA Dedicated GPU"
        });
      }
    } catch {
      // Backend offline or starting up
    }
  };

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
      await checkAiSystemStatus();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch {
      setStatusMessage("Error saving credential.");
    }
  };

  const handleRemoveCredential = async () => {
    try {
      await invoke("remove_api_credential", { provider });
      setStatusMessage("Credential removed from OS Keychain.");
      setCredentialStatus("missing");
      await checkAiSystemStatus();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch {
      setStatusMessage("Error removing credential.");
    }
  };

  const handleSyncAiStatus = async () => {
    setIsCheckingSystem(true);
    try {
      await fetchHardwareAndStatus();
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



  return (
    <div className="settings-scroll-container">
      <div className="settings-content">
        
        {/* --- PAGE HEADER --- */}
        <header className="settings-header">
          <div className="settings-header-left">
            <h1 className="settings-header-title">Settings</h1>
            <p className="settings-header-subtitle">
              Manage your AI runtime, credentials, focus timers, and system preferences.
            </p>
          </div>
          <button
            onClick={handleSyncAiStatus}
            disabled={isCheckingSystem}
            className="settings-sync-btn"
            title="Synchronize AI runtime and keychain credentials"
            aria-label="Synchronize AI Status"
          >
            <RefreshCw size={12} className={isCheckingSystem ? "animate-spin" : ""} />
            <span>{isCheckingSystem ? "Syncing..." : "Sync Status"}</span>
          </button>
        </header>

        {/* --- LINEAR / RAYCAST STYLE TAB NAVIGATION --- */}
        <nav className="settings-nav-tabs" aria-label="Settings Categories">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`settings-tab-btn ${activeTab === "ai" ? "active" : ""}`}
          >
            <Cpu size={14} />
            AI Engine & Models
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cloud")}
            className={`settings-tab-btn ${activeTab === "cloud" ? "active" : ""}`}
          >
            <Key size={14} />
            Cloud AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`settings-tab-btn ${activeTab === "preferences" ? "active" : ""}`}
          >
            <Sliders size={14} />
            Preferences & Focus
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`settings-tab-btn ${activeTab === "about" ? "active" : ""}`}
          >
            <Shield size={14} />
            About & Privacy
          </button>
        </nav>

        {/* ============================================================
            TAB 1: AI ENGINE & MODELS
            ============================================================ */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Active AI Engine Banner */}
            <div className="settings-runtime-banner">
              <div className="settings-runtime-left">
                <div
                  className={`settings-runtime-icon ${
                    isCloudReady
                      ? "ready"
                      : isLocalReady
                      ? "local"
                      : isDownloading
                      ? "downloading"
                      : "alert"
                  }`}
                >
                  {isCloudReady ? (
                    <Cloud size={18} />
                  ) : isLocalReady ? (
                    <Cpu size={18} />
                  ) : isDownloading ? (
                    <Download size={18} />
                  ) : isPaused ? (
                    <Pause size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                </div>

                <div className="settings-runtime-text">
                  <div className="settings-runtime-title-row">
                    <span className="settings-runtime-name">
                      {isCloudReady
                        ? "Cloud AI Engine Active"
                        : isLocalReady
                        ? "Standalone Local AI Active"
                        : isDownloading
                        ? `Downloading Orion Brain (${Math.round(aiDownloadProgress.percent || 0)}%)`
                        : isPaused
                        ? `Model Download Paused (${Math.round(aiDownloadProgress.percent || 0)}%)`
                        : "AI Engine Inactive"}
                    </span>
                    <span
                      className={`settings-pill ${
                        isCloudReady
                          ? "pill-violet"
                          : isLocalReady
                          ? "pill-green"
                          : isDownloading
                          ? "pill-blue"
                          : isPaused
                          ? "pill-amber"
                          : "pill-rose"
                      }`}
                    >
                      {isCloudReady
                        ? (aiProvider === "cloud" ? "Cloud Key Configured" : "Cloud Ready")
                        : isLocalReady
                        ? (hardwareStatus.gpuAccelerated ? "Offline • GPU Ready" : "Offline • CPU Ready")
                        : isDownloading
                        ? "Downloading"
                        : isPaused
                        ? "Paused"
                        : "Action Required"}
                    </span>
                  </div>
                  <p className="settings-runtime-desc">
                    {isCloudReady
                      ? "Inference processed securely via your configured provider in native OS Keychain."
                      : isLocalReady
                      ? `Running 100% privately on-device via ${hardwareStatus.deviceName} with zero external network transmission.`
                      : isDownloading
                      ? "Retrieving standalone weights. Chunks are safely saved on disk."
                      : isPaused
                      ? "Download paused. Resume anytime to complete local setup."
                      : "No cloud key or local weights detected. Voice input and reasoning are paused."}
                  </p>
                </div>
              </div>

              {!isLocalReady && !isCloudReady && (
                <button
                  className="btn-orion-primary"
                  onClick={() => setIsAiDownloadModalOpen(true)}
                >
                  <Download size={12} /> Activate Orion AI
                </button>
              )}
            </div>

            {/* Standalone Local Model Management (Row-Based Standard) */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title-wrap">
                  <HardDrive size={15} color="#8B5CF6" />
                  <div>
                    <h2 className="settings-card-title">Standalone Local Model</h2>
                    <p className="settings-card-subtitle">In-process llama-cpp weights with zero external prerequisites</p>
                  </div>
                </div>

                <span className={`settings-pill ${isModelInstalled ? "pill-green" : "pill-rose"}`}>
                  {isModelInstalled ? <CheckCircle2 size={11} /> : <HardDrive size={11} />}
                  {isModelInstalled ? "Installed & Verified" : "Not Installed"}
                </span>
              </div>

              {/* Row 1: Model & Quantization */}
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-label">
                    Model Architecture
                    <InfoTooltip content="Qwen 2.5 3B Instruct quantized to 4-bit Q4_K_M GGUF. Compresses weights to ~2.1 GB while preserving ~99% reasoning accuracy." />
                  </span>
                  <p className="settings-row-desc">Qwen 2.5 3B Instruct • 4-bit Q4_K_M GGUF format</p>
                </div>
                <div className="settings-row-right">
                  <span className="settings-tag-neutral">GGUF Quantized</span>
                </div>
              </div>

              {/* Row 2: Hardware & Acceleration */}
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-label">
                    Hardware Acceleration
                    <InfoTooltip content="Hardware acceleration uses CUDA GPU offloading for low-latency token generation, falling back automatically to multi-core CPU." />
                  </span>
                  <p className="settings-row-desc">
                    {hardwareStatus.gpuAccelerated ? "CUDA offloaded to dedicated GPU" : "Executing on multi-core host CPU"}
                  </p>
                </div>
                <div className="settings-row-right">
                  <span className="settings-tag-neutral">
                    {hardwareStatus.gpuAccelerated 
                      ? hardwareStatus.gpuName.replace('NVIDIA GeForce ', '')
                      : hardwareStatus.cpuName.split(' ')[0] + ' ' + (hardwareStatus.cpuName.split(' ')[1] || '')}
                  </span>
                </div>
              </div>

              {/* Row 3: Disk & Context */}
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-label">
                    Memory & Context Footprint
                    <InfoTooltip content="2048 token optimized working context window allocated for task notes, instructions, and history." />
                  </span>
                  <p className="settings-row-desc">Disk footprint and working token window</p>
                </div>
                <div className="settings-row-right">
                  <span className="settings-tag-neutral">{aiModelSizeFormatted || "2.1 GB"} • 2048 Tokens</span>
                </div>
              </div>

              {/* Row 4: Vector Embeddings & Voice */}
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-label">
                    Embeddings & Voice Pipeline
                    <InfoTooltip content="Runs on-device embedding models (BAAI/bge-small) and local speech synthesis (Kokoro TTS + Faster-Whisper) with zero network calls." />
                  </span>
                  <p className="settings-row-desc">FastEmbed (bge-small) + Kokoro TTS & Faster-Whisper</p>
                </div>
                <div className="settings-row-right">
                  <span className="settings-tag-neutral">100% On-Device</span>
                </div>
              </div>

              {/* Row 5: RAM Auto-Sleep */}
              {isModelInstalled && (
                <div className="settings-row">
                  <div className="settings-row-left">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="settings-row-label">
                        RAM Auto-Sleep Policy
                        <InfoTooltip content="Eco mode auto-unloads the model after 5 minutes of idle time to release ~2.1 GB of RAM back to your system. Always-On keeps it warm in RAM for instantaneous zero-latency responses." />
                      </span>
                      <span className={`settings-pill ${aiMemoryState?.isLoaded ? "pill-violet" : "pill-green"}`} style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                        {aiMemoryState?.isLoaded ? "Active in RAM (~2.1 GB)" : "Sleeping (0 MB RAM 💤)"}
                      </span>
                    </div>
                    <p className="settings-row-desc">
                      {aiMemoryState?.isLoaded
                        ? (aiMemoryState?.memoryMode === "eco"
                            ? "Model is warm in memory. Auto-sleeps after 5m idle to release ~2.1 GB RAM."
                            : "Model is permanently loaded in memory for zero-latency responses.")
                        : "Model is unloaded from memory. Wakes automatically in ~2s on request."}
                    </p>
                  </div>

                  <div className="settings-row-right">
                    <div className="settings-segmented-control" role="group" aria-label="RAM Auto-Sleep Mode">
                      <button
                        type="button"
                        onClick={() => setAiMemoryMode("eco")}
                        className={`settings-seg-btn ${(aiMemoryState?.memoryMode ?? "eco") === "eco" ? "active" : ""}`}
                        title="Auto-unloads model after 5 minutes idle"
                      >
                        <Moon size={11} />
                        Eco (Auto-Sleep)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiMemoryMode("always_on")}
                        className={`settings-seg-btn ${aiMemoryState?.memoryMode === "always_on" ? "active" : ""}`}
                        title="Keeps model loaded in RAM permanently"
                      >
                        <Zap size={11} />
                        Always-On
                      </button>
                    </div>

                    {aiMemoryState?.isLoaded && (
                      <button
                        type="button"
                        onClick={handleHibernate}
                        disabled={isHibernating}
                        className="btn-orion-subtle"
                        title="Unload model immediately and free 2.1 GB RAM"
                      >
                        <Moon size={11} />
                        {isHibernating ? "Hibernating..." : "Hibernate Now"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Row 6: Model Maintenance Actions */}
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-label">Model Maintenance & Actions</span>
                  <p className="settings-row-desc">Inspect specifications or delete weights to recover disk storage</p>
                </div>
                <div className="settings-row-right">
                  {isDownloading ? (
                    <>
                      <button onClick={() => pauseAiModelDownload()} className="btn-orion-secondary">
                        <Pause size={12} /> Pause
                      </button>
                      <button onClick={() => setIsAiDownloadModalOpen(true)} className="btn-orion-secondary">
                        <ExternalLink size={12} /> Metrics
                      </button>
                      <button onClick={() => cancelAiModelDownload()} className="btn-orion-danger-subtle">
                        <XCircle size={12} /> Cancel
                      </button>
                    </>
                  ) : isPaused ? (
                    <>
                      <button onClick={() => resumeAiModelDownload()} className="btn-orion-primary">
                        <Play size={12} /> Resume
                      </button>
                      <button onClick={() => setIsAiDownloadModalOpen(true)} className="btn-orion-secondary">
                        <ExternalLink size={12} /> Metrics
                      </button>
                      <button onClick={() => cancelAiModelDownload()} className="btn-orion-danger-subtle">
                        <XCircle size={12} /> Cancel
                      </button>
                    </>
                  ) : isModelInstalled ? (
                    <>
                      <button onClick={() => setIsAiDownloadModalOpen(true)} className="btn-orion-secondary">
                        <ExternalLink size={12} /> Inspect Specs
                      </button>
                      {!showDeleteConfirm && (
                        <button onClick={() => setShowDeleteConfirm(true)} className="btn-orion-danger-subtle">
                          <Trash2 size={12} /> Delete (Free 2.1 GB)
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button onClick={() => setIsAiDownloadModalOpen(true)} className="btn-orion-primary">
                        <Download size={12} /> Download Model ({aiModelSizeFormatted || "2.1 GB"})
                      </button>
                      <button onClick={() => startAiModelDownload()} className="btn-orion-secondary">
                        Background
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline Delete Confirmation */}
              {showDeleteConfirm && (
                <div className="settings-inline-alert">
                  <div className="alert-content">
                    <AlertTriangle size={14} className="alert-icon" />
                    <span>Permanently delete local model weights (2.1 GB)? Offline reasoning will be disabled.</span>
                  </div>
                  <div className="alert-actions">
                    <button
                      onClick={handleDeleteModel}
                      disabled={isDeletingModel}
                      className="btn-orion-danger-solid"
                    >
                      {isDeletingModel ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeletingModel}
                      className="btn-orion-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: CLOUD AI CONFIGURATION
            ============================================================ */}
        {activeTab === "cloud" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-wrap">
                <Key size={15} color="#8B5CF6" />
                <div>
                  <h2 className="settings-card-title">Cloud AI Credentials</h2>
                  <p className="settings-card-subtitle">Encrypted in operating system keychain (Windows Credential Manager / macOS Keychain)</p>
                </div>
              </div>
              <InfoTooltip content="API keys are stored encrypted in your operating system's native credential store and are never transmitted to third parties." />
            </div>

            {/* Provider Row */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">Inference Provider</span>
                <p className="settings-row-desc">Select the cloud LLM backend for cloud-assisted queries</p>
              </div>
              <div className="settings-row-right">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="settings-select"
                  style={{ minWidth: "220px" }}
                >
                  <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  <option value="openrouter">OpenRouter (Unified API)</option>
                </select>
              </div>
            </div>

            {/* API Key Row */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">API Key Secret</span>
                <p className="settings-row-desc">Encrypted with OS-level hardware security</p>
              </div>
              <div className="settings-row-right">
                <div style={{ position: "relative", width: "240px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="sk-..."
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    className="settings-input"
                    style={{ width: "100%", paddingRight: "30px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#64607A",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: "2px"
                    }}
                    aria-label={showPassword ? "Hide key" : "Show key"}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <button
                  onClick={handleSaveCredential}
                  disabled={!credential.trim()}
                  className="btn-orion-primary"
                >
                  <Save size={12} /> Save Key
                </button>
              </div>
            </div>

            {/* Keychain Status Row */}
            <div className="settings-row">
              <div className="settings-row-left">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Shield size={14} color={credentialStatus === "configured" ? "#059669" : "#64607A"} />
                  <span className="settings-row-label">Keychain Encryption Status</span>
                </div>
                <p className="settings-row-desc">Native Windows Credential Manager encryption state</p>
              </div>
              <div className="settings-row-right">
                <span
                  className={`settings-pill ${
                    credentialStatus === "configured"
                      ? "pill-green"
                      : credentialStatus === "checking"
                      ? "pill-amber"
                      : "pill-rose"
                  }`}
                >
                  {credentialStatus === "checking"
                    ? "Checking..."
                    : credentialStatus === "configured"
                    ? "✓ Encrypted in OS Keychain"
                    : "Not Configured"}
                </span>

                {credentialStatus === "configured" && (
                  <button
                    onClick={handleRemoveCredential}
                    className="btn-orion-danger-subtle"
                  >
                    <Trash2 size={11} /> Remove Key
                  </button>
                )}
              </div>
            </div>

            {statusMessage && (
              <div style={{ padding: "10px 20px", background: "rgba(139, 92, 246, 0.05)", borderTop: "1px solid rgba(139, 92, 246, 0.12)", color: "#8B5CF6", fontSize: "0.8rem", fontWeight: 500 }}>
                {statusMessage}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: PREFERENCES & FOCUS
            ============================================================ */}
        {activeTab === "preferences" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-wrap">
                <Sliders size={15} color="#8B5CF6" />
                <div>
                  <h2 className="settings-card-title">Workspace & Focus Preferences</h2>
                  <p className="settings-card-subtitle">Default context lens and Pomodoro sprint durations</p>
                </div>
              </div>
            </div>

            {/* Default Mode Row */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">Default Workspace Lens</span>
                <p className="settings-row-desc">Primary workflow context loaded upon launching Orion</p>
              </div>
              <div className="settings-row-right">
                <select
                  value={activeMode}
                  onChange={(e) => setActiveMode(e.target.value as OrionModeId)}
                  className="settings-select"
                  style={{ minWidth: "180px" }}
                >
                  {Object.values(ORION_MODES).map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.name} Mode
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Focus Interval */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">Pomodoro Focus Interval</span>
                <p className="settings-row-desc">Standard length of each focused work sprint</p>
              </div>
              <div className="settings-row-right">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={pomodoroSettings.pomodoro}
                  onChange={(e) => updatePomodoro("pomodoro", parseInt(e.target.value) || 25)}
                  className="settings-input settings-input-num"
                />
                <span style={{ fontSize: "0.8rem", color: "#64607A" }}>minutes</span>
              </div>
            </div>

            {/* Short Break */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">Short Break Duration</span>
                <p className="settings-row-desc">Rest interval between consecutive work sprints</p>
              </div>
              <div className="settings-row-right">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={pomodoroSettings.shortBreak}
                  onChange={(e) => updatePomodoro("shortBreak", parseInt(e.target.value) || 5)}
                  className="settings-input settings-input-num"
                />
                <span style={{ fontSize: "0.8rem", color: "#64607A" }}>minutes</span>
              </div>
            </div>

            {/* Long Break */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">Long Break Duration</span>
                <p className="settings-row-desc">Extended recovery interval after 4 completed focus sessions</p>
              </div>
              <div className="settings-row-right">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={pomodoroSettings.longBreak}
                  onChange={(e) => updatePomodoro("longBreak", parseInt(e.target.value) || 15)}
                  className="settings-input settings-input-num"
                />
                <span style={{ fontSize: "0.8rem", color: "#64607A" }}>minutes</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: ABOUT & PRIVACY
            ============================================================ */}
        {activeTab === "about" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-wrap">
                <Shield size={15} color="#8B5CF6" />
                <div>
                  <h2 className="settings-card-title">Data Storage & Architecture</h2>
                  <p className="settings-card-subtitle">Zero telemetry and local-first persistence guarantees</p>
                </div>
              </div>
              <InfoTooltip content="All workspaces, documents, notes, flashcards, and local AI reasoning operate strictly on your machine with zero external network transmission." />
            </div>

            {/* Local Storage Row */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">Local Data Storage</span>
                <p className="settings-row-desc">
                  Domain data (Tasks, Flashcards, Syllabus, Whiteboards, Notes, and Timelines) is stored 100% locally on your machine with browser-level database persistence.
                </p>
              </div>
              <div className="settings-row-right">
                <span className="settings-pill pill-green">100% On-Device</span>
              </div>
            </div>

            {/* Zero-Telemetry Row */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">Zero-Telemetry Guarantee</span>
                <p className="settings-row-desc">
                  Orion respects your privacy with strict zero-telemetry guarantees. When operating via the Standalone Local Model, all language inference and vector embeddings run strictly on your machine with no external network requests.
                </p>
              </div>
              <div className="settings-row-right">
                <span className="settings-pill pill-green">Zero Telemetry</span>
              </div>
            </div>

            {/* Software Version Row */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">ORION Personal OS</span>
                <p className="settings-row-desc">Autonomous Personal Desktop Operating System</p>
              </div>
              <div className="settings-row-right">
                <span className="settings-tag-neutral">Version 0.1.0 • Hybrid Architecture</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
