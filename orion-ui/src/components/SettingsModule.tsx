import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Save, 
  Trash2, 
  Shield, 
  Download, 
  Cpu, 
  Cloud, 
  Pause, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  XCircle,
  Moon,
  Zap,
  Info,
  Sliders
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { ORION_MODES, OrionModeId } from "../config/modes";
import "./SettingsModule.css";

interface HardwareStatus {
  executionDevice: "detecting" | "gpu" | "cpu" | "unavailable";
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
 * Accessible contextual help popover component.
 * Non-clipping, hover/focus/click enabled, Esc dismiss.
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
        <Info size={12} />
      </button>

      {isVisible && (
        <span className="settings-popover" role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}

type SettingsTab = "ai" | "cloud" | "preferences" | "privacy";

export default function SettingsModule() {
  const { 
    activeMode, 
    setActiveMode, 
    pomodoroSettings, 
    updatePomodoroSettings,
    aiEngineStatus,
    aiDownloadProgress,
    aiModelSizeFormatted,
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

  // Exactly 4 Settings Categories
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");

  // Cloud credential state
  const [provider, setProvider] = useState("openai");
  const [credential, setCredential] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<"checking" | "configured" | "missing">("checking");
  const [statusMessage, setStatusMessage] = useState("");
  
  // Local model lifecycle & confirmation
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCheckingSystem, setIsCheckingSystem] = useState(false);
  const [isHibernating, setIsHibernating] = useState(false);

  // Truthful hardware status initialized to explicit detecting state
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus>({
    executionDevice: "detecting",
    deviceName: "Detecting...",
    gpuAccelerated: false,
    cpuName: "Detecting...",
    gpuName: "Detecting..."
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
        const isGpu = Boolean(data.gpu_accelerated ?? data.gpuAccelerated);
        const dev = data.execution_device || data.executionDevice || (isGpu ? "gpu" : "cpu");
        setHardwareStatus({
          executionDevice: dev === "gpu" ? "gpu" : "cpu",
          deviceName: data.device_name || data.deviceName || (isGpu ? "Dedicated GPU" : "Multi-core CPU"),
          gpuAccelerated: isGpu,
          cpuName: data.hardware?.cpu?.name || "Host CPU",
          gpuName: data.hardware?.gpu?.name || "Dedicated GPU"
        });
      } else {
        setHardwareStatus(prev => ({
          ...prev,
          executionDevice: "unavailable",
          deviceName: "Unavailable",
          cpuName: "Unavailable",
          gpuName: "Unavailable"
        }));
      }
    } catch {
      setHardwareStatus(prev => ({
        ...prev,
        executionDevice: "unavailable",
        deviceName: "Unavailable",
        cpuName: "Unavailable",
        gpuName: "Unavailable"
      }));
    }
  };

  const checkCredentialStatus = async () => {
    try {
      setCredentialStatus("checking");
      const configured = await invoke<boolean>("check_api_credential", { provider });
      setCredentialStatus(configured ? "configured" : "missing");
    } catch {
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
      setStatusMessage("Local model deleted and disk space recovered.");
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
      setStatusMessage("Local model unloaded from RAM.");
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

  // Truthful, concise runtime state helper
  const getRuntimeStatus = (): { label: string; pillClass: string } => {
    if (isDownloading) {
      return { 
        label: `Downloading (${Math.round(aiDownloadProgress.percent || 0)}%)`, 
        pillClass: "pill-blue" 
      };
    }
    if (isPaused) {
      return { 
        label: `Paused (${Math.round(aiDownloadProgress.percent || 0)}%)`, 
        pillClass: "pill-amber" 
      };
    }
    if (isLocalReady) {
      return { 
        label: "Local ready", 
        pillClass: "pill-green" 
      };
    }
    if (isCloudReady) {
      return { 
        label: "Cloud ready", 
        pillClass: "pill-violet" 
      };
    }
    if (hardwareStatus.executionDevice === "unavailable") {
      return { 
        label: "Unavailable", 
        pillClass: "pill-neutral" 
      };
    }
    return { 
      label: "Not configured", 
      pillClass: "pill-neutral" 
    };
  };

  const runtimeInfo = getRuntimeStatus();

  const getAccelerationText = () => {
    if (hardwareStatus.executionDevice === "detecting") {
      return "Detecting...";
    }
    if (hardwareStatus.executionDevice === "unavailable") {
      return "Unavailable";
    }
    if (hardwareStatus.gpuAccelerated) {
      const cleanGpu = hardwareStatus.gpuName.replace("NVIDIA GeForce ", "");
      return `CUDA · ${cleanGpu}`;
    }
    return `CPU · ${hardwareStatus.cpuName}`;
  };

  return (
    <div className="settings-scroll-container">
      <div className="settings-content">
        
        {/* --- PAGE HEADER: EXACTLY TITLE & SYNC ACTION ONLY --- */}
        <header className="settings-header">
          <h1 className="settings-header-title">Settings</h1>
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

        {/* --- EXACTLY FOUR SUB-TABS --- */}
        <nav className="settings-nav-tabs" aria-label="Settings Categories">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`settings-tab-btn ${activeTab === "ai" ? "active" : ""}`}
          >
            <Cpu size={14} />
            AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cloud")}
            className={`settings-tab-btn ${activeTab === "cloud" ? "active" : ""}`}
          >
            <Cloud size={14} />
            Cloud
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`settings-tab-btn ${activeTab === "preferences" ? "active" : ""}`}
          >
            <Sliders size={14} />
            Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`settings-tab-btn ${activeTab === "privacy" ? "active" : ""}`}
          >
            <Shield size={14} />
            Privacy
          </button>
        </nav>

        {/* ============================================================
            TAB 1: AI
            ============================================================ */}
        {activeTab === "ai" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-wrap">
                <Cpu size={15} color="#8B5CF6" />
                <h2 className="settings-card-title">AI Engine</h2>
              </div>
              <span className={`settings-pill ${runtimeInfo.pillClass}`}>
                {runtimeInfo.label}
              </span>
            </div>

            {/* Row 1: Runtime */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Runtime
                  <InfoTooltip content="Active inference backend handling natural language queries, reasoning, and context analysis." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className={`settings-pill ${runtimeInfo.pillClass}`}>
                  {runtimeInfo.label}
                </span>
              </div>
            </div>

            {/* Row 2: Model */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Model
                  <InfoTooltip content="Qwen 2.5 3B Instruct quantized to 4-bit Q4_K_M GGUF format for low-latency desktop inference." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">Qwen 2.5 3B Instruct · Q4_K_M</span>
              </div>
            </div>

            {/* Row 3: Acceleration */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Acceleration
                  <InfoTooltip content="Hardware device executing neural network layers. Uses CUDA offloading when compatible GPU is detected, with host CPU fallback." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-tag-neutral">{getAccelerationText()}</span>
              </div>
            </div>

            {/* Row 4: Storage */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Storage
                  <InfoTooltip content="Local disk allocation for standalone GGUF model weights on your machine." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">
                  {isModelInstalled 
                    ? `${aiModelSizeFormatted || "2.1 GB"} on disk`
                    : isDownloading
                    ? `${(aiDownloadProgress.downloadedBytes / (1024 * 1024 * 1024)).toFixed(1)} / 2.1 GB`
                    : "2.1 GB download"}
                </span>
              </div>
            </div>

            {/* Row 5: Context */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Context
                  <InfoTooltip content="Optimized working context token limit allocated for documents, tasks, instructions, and conversation history." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">2,048 tokens</span>
              </div>
            </div>

            {/* Row 6: Embeddings */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Embeddings
                  <InfoTooltip content="Local dense vector model (BAAI/bge-small) providing fast semantic search across all personal documents." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">FastEmbed (bge-small)</span>
              </div>
            </div>

            {/* Row 7: Voice */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Voice
                  <InfoTooltip content="On-device speech transcription and voice synthesis using Faster-Whisper and Kokoro TTS." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">Kokoro TTS · Faster-Whisper</span>
              </div>
            </div>

            {/* Row 8: Memory */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Memory
                  <InfoTooltip content="Eco mode unloads weights from RAM after 5 minutes of idle time. Always-On keeps the model warm for instant responses." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text" style={{ marginRight: "4px" }}>
                  {isModelInstalled 
                    ? (aiMemoryState?.isLoaded ? "Loaded · ~2.1 GB" : "Sleeping · 0 MB")
                    : "Unloaded · 0 MB"}
                </span>

                {isModelInstalled && (
                  <div className="settings-segmented-control" role="group" aria-label="RAM Policy">
                    <button
                      type="button"
                      onClick={() => setAiMemoryMode("eco")}
                      className={`settings-seg-btn ${(aiMemoryState?.memoryMode ?? "eco") === "eco" ? "active" : ""}`}
                      title="Auto-unloads model after 5 minutes of inactivity"
                    >
                      <Moon size={11} />
                      Eco
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
                )}

                {isModelInstalled && aiMemoryState?.isLoaded && (
                  <button
                    type="button"
                    onClick={handleHibernate}
                    disabled={isHibernating}
                    className="btn-orion-subtle"
                    title="Unload model immediately from RAM"
                  >
                    <Moon size={11} />
                    {isHibernating ? "Hibernating..." : "Hibernate Now"}
                  </button>
                )}
              </div>
            </div>

            {/* Row 9: Model Actions */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Actions
                  <InfoTooltip content="Model lifecycle controls to download, inspect technical specifications, or delete local weights." />
                </span>
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
                      <ExternalLink size={12} /> Specifications
                    </button>
                    {!showDeleteConfirm && (
                      <button onClick={() => setShowDeleteConfirm(true)} className="btn-orion-danger-subtle">
                        <Trash2 size={12} /> Delete Model
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

            {/* Inline Deletion Confirmation */}
            {showDeleteConfirm && (
              <div className="settings-inline-alert">
                <div className="alert-content">
                  <AlertTriangle size={14} />
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

            {statusMessage && (
              <div className="settings-feedback-bar">
                {statusMessage}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 2: CLOUD
            ============================================================ */}
        {activeTab === "cloud" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-wrap">
                <Cloud size={15} color="#8B5CF6" />
                <h2 className="settings-card-title">Cloud AI</h2>
              </div>
            </div>

            {/* Row 1: Provider */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Provider
                  <InfoTooltip content="Select the cloud inference provider for external LLM API requests." />
                </span>
              </div>
              <div className="settings-row-right">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="settings-select"
                  style={{ minWidth: "160px" }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
            </div>

            {/* Row 2: API key */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  API key
                  <InfoTooltip content="Stored encrypted in your operating system credential store (Windows Credential Manager / macOS Keychain). Transmitted directly to provider for API queries." />
                </span>
              </div>
              <div className="settings-row-right">
                <div style={{ position: "relative", width: "220px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="sk-..."
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    className="settings-input"
                    style={{ width: "100%", paddingRight: "28px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "7px",
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
                  <Save size={12} /> {credentialStatus === "configured" ? "Update" : "Save"}
                </button>
              </div>
            </div>

            {/* Row 3: Status */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Status
                  <InfoTooltip content="Status of API credential verification in the native operating system credential store." />
                </span>
              </div>
              <div className="settings-row-right">
                <span
                  className={`settings-pill ${
                    credentialStatus === "configured"
                      ? "pill-green"
                      : credentialStatus === "checking"
                      ? "pill-amber"
                      : "pill-neutral"
                  }`}
                >
                  {credentialStatus === "checking"
                    ? "Checking..."
                    : credentialStatus === "configured"
                    ? "Configured in OS Keychain"
                    : "Not configured"}
                </span>

                {credentialStatus === "configured" && (
                  <button
                    onClick={handleRemoveCredential}
                    className="btn-orion-danger-subtle"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                )}
              </div>
            </div>

            {statusMessage && (
              <div className="settings-feedback-bar">
                {statusMessage}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: PREFERENCES
            ============================================================ */}
        {activeTab === "preferences" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-wrap">
                <Sliders size={15} color="#8B5CF6" />
                <h2 className="settings-card-title">Preferences</h2>
              </div>
            </div>

            {/* Row 1: Workspace mode */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Workspace mode
                  <InfoTooltip content="Switches active workflow lens and tool suite across Orion modules." />
                </span>
              </div>
              <div className="settings-row-right">
                <select
                  value={activeMode}
                  onChange={(e) => setActiveMode(e.target.value as OrionModeId)}
                  className="settings-select"
                  style={{ minWidth: "160px" }}
                >
                  {Object.values(ORION_MODES).map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.name} Mode
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Focus */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Focus
                  <InfoTooltip content="Duration of each dedicated Pomodoro work sprint." />
                </span>
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
                <span className="settings-unit">min</span>
              </div>
            </div>

            {/* Row 3: Short break */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Short break
                  <InfoTooltip content="Rest interval between consecutive focus sprints." />
                </span>
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
                <span className="settings-unit">min</span>
              </div>
            </div>

            {/* Row 4: Long break */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Long break
                  <InfoTooltip content="Extended recovery break after 4 completed focus sprints." />
                </span>
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
                <span className="settings-unit">min</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: PRIVACY
            ============================================================ */}
        {activeTab === "privacy" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-wrap">
                <Shield size={15} color="#8B5CF6" />
                <h2 className="settings-card-title">Privacy</h2>
              </div>
            </div>

            {/* Row 1: Data */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Data
                  <InfoTooltip content="Workspaces, tasks, flashcards, notes, and syllabus data are stored on your local disk with IndexedDB and SQLite." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">Local IndexedDB & SQLite</span>
              </div>
            </div>

            {/* Row 2: AI processing */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  AI processing
                  <InfoTooltip content="Local model processes inference on-device without outbound traffic. When cloud AI is configured, queries are sent via encrypted HTTPS to your selected provider." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">On-device (local) / Provider API (cloud)</span>
              </div>
            </div>

            {/* Row 3: Credentials */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Credentials
                  <InfoTooltip content="API keys are encrypted and stored in Windows Credential Manager or macOS Keychain." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">OS Credential Store</span>
              </div>
            </div>

            {/* Row 4: Version */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Version
                  <InfoTooltip content="Installed Orion desktop application release version." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-tag-neutral">0.1.0</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
