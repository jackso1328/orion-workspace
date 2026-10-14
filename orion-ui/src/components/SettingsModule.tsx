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

interface BackendAiStatus {
  backendAvailable: boolean;
  modelExists: boolean;
  modelName: string;
  modelFilename: string;
  modelSizeFormatted: string;
  modelProfile: string;
  executionDevice: "detecting" | "gpu" | "cpu" | "unavailable";
  deviceName: string;
  gpuAccelerated: boolean;
  cpuName: string;
  gpuName: string;
  engine: "local" | "cloud" | "none";
  cloudProvider?: string;
  selectedProvider?: string;
}

interface InfoTooltipProps {
  content: string;
  ariaLabel?: string;
}

/**
 * Hardened accessible contextual help popover component.
 * Separates hover/focus from click-pinned state so clicking doesn't close on open.
 * Supports mouse hover, keyboard focus/tab, touch, and Escape dismissal.
 */
function InfoTooltip({ content, ariaLabel = "More information" }: InfoTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const isVisible = isHovered || isPinned;

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPinned(false);
        setIsHovered(false);
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPinned(false);
        setIsHovered(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isVisible]);

  const handleTriggerClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsPinned((prev) => {
      const next = !prev;
      if (!next) {
        setIsHovered(false);
      }
      return next;
    });
  };

  return (
    <span 
      ref={containerRef}
      className="settings-tooltip-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        className={`settings-info-trigger ${isVisible ? "active" : ""}`}
        onClick={handleTriggerClick}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        aria-label={ariaLabel}
        aria-expanded={isVisible}
      >
        <Info size={12} />
      </button>

      {isVisible && (
        <span 
          className="settings-popover" 
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
        >
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
    selectedCloudProvider,
    setSelectedCloudProvider,
  } = useOrionStore();

  // Exactly 4 Settings Categories
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");

  // Authoritative cloud credential & provider state
  const provider = selectedCloudProvider || "openai";
  const [credential, setCredential] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<"checking" | "configured" | "missing">("checking");
  const [statusMessage, setStatusMessage] = useState("");
  
  // Local model lifecycle & confirmation
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCheckingSystem, setIsCheckingSystem] = useState(false);
  const [isHibernating, setIsHibernating] = useState(false);

  // Dynamic backend metadata with explicit detecting initial state
  const [backendStatus, setBackendStatus] = useState<BackendAiStatus>({
    backendAvailable: false,
    modelExists: false,
    modelName: "",
    modelFilename: "",
    modelSizeFormatted: "",
    modelProfile: "",
    executionDevice: "detecting",
    deviceName: "Detecting...",
    gpuAccelerated: false,
    cpuName: "Detecting...",
    gpuName: "Detecting...",
    engine: "none"
  });

  const isModelInstalled = backendStatus.backendAvailable ? backendStatus.modelExists : false;
  const isDownloading = aiEngineStatus === "downloading" || (aiDownloadProgress.status === "downloading" && !isModelInstalled);
  const isPaused = aiEngineStatus === "paused" || (aiDownloadProgress.status === "paused" && !isModelInstalled);
  const isLocalReady = backendStatus.backendAvailable && isModelInstalled && !isDownloading && !isPaused;
  const isCloudReady = aiEngineStatus === "cloud_ready";

  useEffect(() => {
    checkCredentialStatus(provider);
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
        
        const resolvedModelName = 
          data.model_info?.name || 
          data.download_state?.model_name || 
          data.download_state?.modelName || 
          "";
        const resolvedFilename = data.model_info?.filename || "";
        const resolvedSize = 
          data.model_size_formatted || 
          data.modelSizeFormatted || 
          data.model_info?.size_formatted || 
          "";
        const resolvedProfile = data.hardware?.selected_profile || "";

        setBackendStatus({
          backendAvailable: true,
          modelExists: Boolean(data.model_exists ?? data.modelExists),
          modelName: resolvedModelName,
          modelFilename: resolvedFilename,
          modelSizeFormatted: resolvedSize,
          modelProfile: resolvedProfile,
          executionDevice: dev === "gpu" ? "gpu" : "cpu",
          deviceName: data.device_name || data.deviceName || (isGpu ? "Dedicated GPU" : "Multi-core CPU"),
          gpuAccelerated: isGpu,
          cpuName: data.hardware?.cpu?.name || "Host CPU",
          gpuName: data.hardware?.gpu?.name || "Dedicated GPU",
          engine: data.engine || (data.model_exists ? "local" : "none"),
          cloudProvider: data.cloud_provider,
          selectedProvider: data.selected_provider
        });
      } else {
        setBackendStatus(prev => ({
          ...prev,
          backendAvailable: false,
          executionDevice: "unavailable",
          deviceName: "Unavailable",
          cpuName: "Unavailable",
          gpuName: "Unavailable"
        }));
      }
    } catch {
      setBackendStatus(prev => ({
        ...prev,
        backendAvailable: false,
        executionDevice: "unavailable",
        deviceName: "Unavailable",
        cpuName: "Unavailable",
        gpuName: "Unavailable"
      }));
    }
  };

  const formatProviderName = (prov?: string): string => {
    if (!prov) return "Cloud";
    if (prov === "openai") return "OpenAI";
    if (prov === "anthropic") return "Anthropic";
    if (prov === "openrouter") return "OpenRouter";
    return prov.charAt(0).toUpperCase() + prov.slice(1);
  };

  const handleProviderChange = async (newProv: 'openai' | 'anthropic' | 'openrouter') => {
    await setSelectedCloudProvider(newProv);
    await checkCredentialStatus(newProv);
    await fetchHardwareAndStatus();
  };

  const checkCredentialStatus = async (prov = provider) => {
    try {
      setCredentialStatus("checking");
      const configured = await invoke<boolean>("check_api_credential", { provider: prov });
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
      await setSelectedCloudProvider(provider);
      setStatusMessage(`Credential saved securely to OS Keychain for ${formatProviderName(provider)}.`);
      setCredentialStatus("configured");
      await checkAiSystemStatus();
      await fetchHardwareAndStatus();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch {
      setStatusMessage("Error saving credential.");
    }
  };

  const handleRemoveCredential = async () => {
    try {
      await invoke("remove_api_credential", { provider });
      setStatusMessage(`Credential removed from OS Keychain for ${formatProviderName(provider)}.`);
      setCredentialStatus("missing");
      await checkAiSystemStatus();
      await fetchHardwareAndStatus();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch {
      setStatusMessage("Error removing credential.");
    }
  };

  const handleSyncAiStatus = async () => {
    setIsCheckingSystem(true);
    try {
      await checkAiSystemStatus();
      await fetchHardwareAndStatus();
      await checkCredentialStatus(provider);
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
      await fetchHardwareAndStatus();
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

  // Truthful runtime readiness helper displayed strictly in the header badge
  const getRuntimeStatus = (): { label: string; pillClass: string } => {
    if (!backendStatus.backendAvailable && backendStatus.executionDevice === "unavailable") {
      if (credentialStatus === "configured") {
        return { label: `Cloud ready (${formatProviderName(provider)})`, pillClass: "pill-violet" };
      }
      return { label: "Unavailable", pillClass: "pill-neutral" };
    }
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
    // Single source of truth: backend status response whenever backend is available
    if (backendStatus.backendAvailable) {
      if (backendStatus.engine === "cloud") {
        const activeProv = backendStatus.cloudProvider || provider;
        return { 
          label: `Cloud active (${formatProviderName(activeProv)})`, 
          pillClass: "pill-violet" 
        };
      }
      if (backendStatus.engine === "local") {
        return { 
          label: "Local ready", 
          pillClass: "pill-green" 
        };
      }
      return { 
        label: "Not configured", 
        pillClass: "pill-neutral" 
      };
    }
    if (isCloudReady) {
      return { 
        label: `Cloud ready (${formatProviderName(provider)})`, 
        pillClass: "pill-violet" 
      };
    }
    if (isLocalReady) {
      return { 
        label: "Local ready", 
        pillClass: "pill-green" 
      };
    }
    return { 
      label: "Not configured", 
      pillClass: "pill-neutral" 
    };
  };

  const runtimeInfo = getRuntimeStatus();

  const getAccelerationText = () => {
    if (backendStatus.executionDevice === "detecting") {
      return "Detecting...";
    }
    if (!backendStatus.backendAvailable || backendStatus.executionDevice === "unavailable") {
      return "Unavailable";
    }
    if (backendStatus.gpuAccelerated) {
      const cleanGpu = backendStatus.gpuName.replace("NVIDIA GeForce ", "");
      return `CUDA · ${cleanGpu}`;
    }
    return `CPU · ${backendStatus.cpuName}`;
  };

  const getModelDisplay = () => {
    if (backendStatus.executionDevice === "detecting") {
      return "Detecting...";
    }
    if (!backendStatus.backendAvailable) {
      return "Unavailable (backend offline)";
    }
    const name = backendStatus.modelName || "Qwen 2.5 3B Instruct · Q4_K_M";
    return name;
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

            {/* Row 1: Model (Redundant Runtime row removed) */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Model
                  <InfoTooltip content="Configured local neural network model selected based on host hardware capabilities. Quantized to 4-bit GGUF format for low-latency desktop inference." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">{getModelDisplay()}</span>
                {backendStatus.backendAvailable && (
                  <span className="settings-tag-neutral">
                    {isModelInstalled 
                      ? (backendStatus.engine === "cloud" ? "Installed (Offline Backup)" : "Installed") 
                      : "Configured"}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Acceleration */}
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

            {/* Row 3: Storage */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Storage
                  <InfoTooltip content="Local disk space allocated for standalone GGUF model weights on your machine." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">
                  {!backendStatus.backendAvailable && backendStatus.executionDevice === "unavailable"
                    ? "Unavailable"
                    : isModelInstalled 
                    ? `${backendStatus.modelSizeFormatted || aiModelSizeFormatted || "2.1 GB"} on disk`
                    : isDownloading
                    ? `${(aiDownloadProgress.downloadedBytes / (1024 * 1024 * 1024)).toFixed(1)} / ${backendStatus.modelSizeFormatted || "2.1 GB"}`
                    : `${backendStatus.modelSizeFormatted || "2.1 GB"} download (not installed)`}
                </span>
              </div>
            </div>

            {/* Row 4: Context */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Context
                  <InfoTooltip content="Configured working context window for in-process inference. Allocates memory for prompt tokens, workspace context, and conversation history." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">2,048 tokens (configured)</span>
              </div>
            </div>

            {/* Row 5: Embeddings */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Embeddings
                  <InfoTooltip content="In-process dense vector embedding model running locally via ONNX Runtime for semantic document search and conversational memory." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">FastEmbed · BAAI/bge-small</span>
              </div>
            </div>

            {/* Row 6: Voice */}
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

            {/* Row 7: Memory */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Memory
                  <InfoTooltip content="Eco mode unloads weights from RAM after 5 minutes of idle time. Always-On keeps the model warm for instant responses." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text" style={{ marginRight: "4px" }}>
                  {!backendStatus.backendAvailable
                    ? "Unavailable"
                    : !isModelInstalled
                    ? "Not installed · 0 MB"
                    : aiMemoryState?.isLoaded 
                    ? "Loaded · ~2.1 GB" 
                    : "Sleeping · 0 MB"}
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

            {/* Row 8: Model Actions */}
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
                      <Download size={12} /> Download Model ({backendStatus.modelSizeFormatted || aiModelSizeFormatted || "2.1 GB"})
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
                  <span>Permanently delete local model weights ({backendStatus.modelSizeFormatted || "2.1 GB"})? Offline reasoning will be disabled.</span>
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
                  onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'anthropic' | 'openrouter')}
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
                    ? (backendStatus.engine === "cloud" && (backendStatus.cloudProvider === provider || (!backendStatus.cloudProvider && provider === selectedCloudProvider))
                        ? "Active Engine · OS Keychain"
                        : "Configured in OS Keychain")
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

            {/* Row 1: Data (Audited real persistence) */}
            <div className="settings-row">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  Data
                  <InfoTooltip content="Application state (tasks, modes, notes, preferences) is persisted in local browser storage. Document indexes and conversational memory are stored in a local vector store (Qdrant). Uploaded files remain in your local data directory." />
                </span>
              </div>
              <div className="settings-row-right">
                <span className="settings-value-text">Local browser storage & vector store</span>
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
