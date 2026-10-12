import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Download, 
  Pause, 
  Play, 
  AlertTriangle, 
  KeyRound, 
  HardDrive, 
  X, 
  CheckCircle2, 
  ExternalLink 
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { useNavigate } from "react-router-dom";

interface PermanentAiStatusBadgeProps {
  /**
   * 'sidebar': Fits neatly into the sidebar navigation layout.
   * 'floating': Fixed floating badge in bottom corner of the workspace.
   * 'banner': Full-width contextual banner for CommandCenter.
   */
  variant?: "sidebar" | "floating" | "banner";
}

interface PopoverPosition {
  bottom: number;
  left: number;
}

export default function PermanentAiStatusBadge({ variant = "sidebar" }: PermanentAiStatusBadgeProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition>({ bottom: 0, left: 0 });

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const {
    aiEngineStatus,
    aiDownloadProgress,
    aiModelSizeFormatted,
    aiProvider,
    aiMemoryState,
    setIsAiDownloadModalOpen,
    pauseAiModelDownload,
    resumeAiModelDownload,
  } = useOrionStore();

  const isDownloading = aiEngineStatus === "downloading" || aiDownloadProgress.status === "downloading";
  const isPaused = aiEngineStatus === "paused" || aiDownloadProgress.status === "paused";
  const isReady = aiEngineStatus === "cloud_ready" || aiEngineStatus === "local_ready";
  const isDisabled = !isReady && !isDownloading && !isPaused;

  // Calculate anchored fixed coordinates to prevent any overflow/scroll clipping
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger scrolled completely out of view, auto-close popover
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsPopoverOpen(false);
      return;
    }

    const popoverWidth = 296;

    // In rail mode (<=800px), anchor to the right of the sidebar rail
    let clampedLeft: number;
    if (window.innerWidth <= 800 && variant === "sidebar") {
      clampedLeft = Math.min(rect.right + 10, window.innerWidth - popoverWidth - 12);
    } else {
      clampedLeft = Math.max(12, Math.min(rect.left, window.innerWidth - popoverWidth - 12));
    }

    const calculatedBottom = window.innerHeight - rect.top + 8;

    setPopoverPos({
      bottom: calculatedBottom,
      left: clampedLeft,
    });
  }, [variant]);

  const togglePopover = () => {
    if (!isPopoverOpen) {
      updatePosition();
    }
    setIsPopoverOpen((prev) => !prev);
  };

  // Click-outside, Escape key, and Resize listeners
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPopoverOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isPopoverOpen, updatePosition]);

  // When AI is ready, hide if in floating or banner mode
  if (isReady && (variant === "floating" || variant === "banner")) {
    return null;
  }

  const handleOpenDownloadModal = () => {
    setIsPopoverOpen(false);
    setIsAiDownloadModalOpen(true);
  };

  const handleGoToSettings = () => {
    setIsPopoverOpen(false);
    navigate("/settings");
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 MB";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Determine badge visual style based on state
  const getBadgeStyle = () => {
    if (isDownloading) {
      return {
        bg: "rgba(139, 92, 246, 0.12)",
        border: "1px solid rgba(139, 92, 246, 0.35)",
        color: "#c084fc",
        icon: <Download size={14} className="badge-spin" />,
        text: `Downloading AI (${Math.round(aiDownloadProgress.percent || 0)}%)`,
      };
    }
    if (isPaused) {
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        color: "#fbbf24",
        icon: <Pause size={14} />,
        text: `AI Paused (${Math.round(aiDownloadProgress.percent || 0)}%)`,
      };
    }
    if (isReady) {
      return {
        bg: "rgba(16, 185, 129, 0.1)",
        border: "1px solid rgba(16, 185, 129, 0.25)",
        color: "#34d399",
        icon: <CheckCircle2 size={14} />,
        text: aiProvider === "cloud" ? "AI Ready (Cloud)" : "AI Ready (Local)",
      };
    }
    // Default: Disabled / Not Downloaded
    return {
      bg: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      color: "#f87171",
      icon: <AlertTriangle size={14} />,
      text: `AI Inactive (${aiModelSizeFormatted || "2.1 GB"})`,
    };
  };

  const badgeConfig = getBadgeStyle();

  return (
    <div 
      className={variant === "floating" ? "floating-ai-badge-container" : undefined}
      style={{ 
        position: variant === "floating" ? "fixed" : "relative",
        bottom: variant === "floating" ? "20px" : undefined,
        right: variant === "floating" ? "20px" : undefined,
        zIndex: variant === "floating" ? 900 : undefined,
        width: variant === "sidebar" ? "100%" : "auto" 
      }}
    >
      <style>{`
        @keyframes pulseAlert {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        @keyframes badgePop {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .badge-spin {
          animation: spinPulse 2s linear infinite;
        }
        @keyframes spinPulse {
          0% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
          100% { transform: translateY(0); }
        }
        @media (max-width: 800px) {
          .sidebar-ai-badge-text,
          .sidebar-ai-badge-pill {
            display: none !important;
          }
          .sidebar-ai-badge-btn {
            justify-content: center !important;
            padding: 10px 8px !important;
          }
        }
        @media (min-width: 801px) {
          .floating-ai-badge-container {
            display: none !important;
          }
        }
      `}</style>

      {/* TRIGGER BADGE BUTTON */}
      <button
        ref={triggerRef}
        onClick={togglePopover}
        className="sidebar-ai-badge-btn"
        title="Orion AI Status - Click for options"
        style={{
          width: variant === "sidebar" ? "100%" : "auto",
          background: badgeConfig.bg,
          border: badgeConfig.border,
          color: badgeConfig.color,
          borderRadius: "8px",
          padding: variant === "sidebar" ? "8px 12px" : "6px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: variant === "sidebar" ? "space-between" : "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: "0.8rem",
          fontWeight: 600,
          transition: "all 0.2s ease",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: isDisabled ? "pulseAlert 3s ease-in-out infinite" : "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = "brightness(1.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {badgeConfig.icon}
          <span className="sidebar-ai-badge-text">{badgeConfig.text}</span>
        </div>

        {isDisabled && (
          <span
            className="sidebar-ai-badge-pill"
            style={{
              fontSize: "0.7rem",
              background: "rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              padding: "1px 5px",
              borderRadius: "4px",
              border: "1px solid rgba(239, 68, 68, 0.4)",
            }}
          >
            Action Req.
          </span>
        )}

        {isDownloading && (
          <span
            className="sidebar-ai-badge-pill"
            style={{
              fontSize: "0.7rem",
              background: "rgba(139, 92, 246, 0.25)",
              color: "#c084fc",
              padding: "1px 5px",
              borderRadius: "4px",
            }}
          >
            {Math.round(aiDownloadProgress.percent || 0)}%
          </span>
        )}
      </button>

      {/* POP-UP POPOVER CARD */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            bottom: `${popoverPos.bottom}px`,
            left: `${popoverPos.left}px`,
            width: "296px",
            background: "linear-gradient(150deg, rgba(22, 20, 32, 0.98), rgba(14, 12, 24, 0.99))",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.75), 0 0 20px rgba(139, 92, 246, 0.15)",
            borderRadius: "14px",
            padding: "1.25rem",
            zIndex: 99999,
            color: "var(--text-primary, #ffffff)",
            animation: "badgePop 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Popover Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: isDisabled
                    ? "rgba(239, 68, 68, 0.2)"
                    : isPaused
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(139, 92, 246, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDisabled ? "#f87171" : isPaused ? "#fbbf24" : "#c084fc",
                }}
              >
                {isDisabled ? <AlertTriangle size={15} /> : <Sparkles size={15} />}
              </div>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#f4f4f5" }}>
                {isReady 
                  ? "Orion AI Active" 
                  : isDownloading
                  ? "Downloading Model"
                  : isPaused
                  ? "Download Paused"
                  : "Orion AI is Inactive"}
              </h4>
            </div>

            <button
              onClick={() => setIsPopoverOpen(false)}
              aria-label="Close popover"
              style={{
                background: "transparent",
                border: "none",
                color: "#71717a",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Popover Body - Disabled / Inactive */}
          {isDisabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.45, color: "#d4d4d8" }}>
                You cannot use Orion AI features (voice commands, study planner proposals, RAG search) right now.
                To use Orion AI, please allow us to download the required local model or provide an API key.
              </p>

              {/* Model Size Spec Card */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.8rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a1a1aa" }}>
                  <HardDrive size={14} color="#8b5cf6" />
                  <span>Required Model</span>
                </div>
                <span style={{ fontWeight: 600, color: "#c084fc" }}>
                  {aiModelSizeFormatted || "2.1 GB"} (Qwen 2.5 3B)
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                <button
                  onClick={handleOpenDownloadModal}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(139, 92, 246, 0.35)",
                  }}
                >
                  <Download size={15} />
                  Download Model ({aiModelSizeFormatted || "2.1 GB"})
                </button>

                <button
                  onClick={handleGoToSettings}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#d4d4d8",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <KeyRound size={14} />
                  Configure Cloud Key in Settings
                </button>
              </div>
            </div>
          )}

          {/* DOWNLOADING STATE POPOVER */}
          {isDownloading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#a1a1aa" }}>
                <span>Downloading weights...</span>
                <span style={{ fontWeight: 600, color: "#c084fc" }}>
                  {Math.round(aiDownloadProgress.percent || 0)}%
                </span>
              </div>

              {/* Mini progress bar */}
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(Math.max(aiDownloadProgress.percent || 0, 1), 100)}%`,
                    background: "linear-gradient(90deg, #8b5cf6, #d946ef)",
                    borderRadius: "999px",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#71717a" }}>
                <span>{formatBytes(aiDownloadProgress.downloadedBytes)} / {formatBytes(aiDownloadProgress.totalBytes)}</span>
                <span>Speed: {aiDownloadProgress.speedMbps ? `${aiDownloadProgress.speedMbps.toFixed(1)} MB/s` : "--"}</span>
              </div>

              {/* Pause & Open Modal controls */}
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <button
                  onClick={() => pauseAiModelDownload()}
                  style={{
                    flex: 1,
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRadius: "8px",
                    padding: "7px 10px",
                    color: "#fbbf24",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <Pause size={14} />
                  Pause
                </button>

                <button
                  onClick={handleOpenDownloadModal}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    padding: "7px 10px",
                    color: "#e4e4e7",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                >
                  <ExternalLink size={13} />
                  Details
                </button>
              </div>
            </div>
          )}

          {/* PAUSED STATE POPOVER */}
          {isPaused && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.45, color: "#fbbf24" }}>
                Download is paused at {Math.round(aiDownloadProgress.percent || 0)}%. Your progress is saved.
              </p>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => resumeAiModelDownload()}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <Play size={14} />
                  Resume
                </button>

                <button
                  onClick={handleOpenDownloadModal}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "#d4d4d8",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Manage
                </button>
              </div>
            </div>
          )}

          {/* READY STATE POPOVER */}
          {isReady && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#a1a1aa" }}>
                {aiProvider === "cloud"
                  ? "Connected to cloud provider via secure OS Keychain credentials."
                  : "Operating 100% offline via embedded in-process local weights."}
              </p>

              {aiProvider === "local" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "0.75rem",
                  }}
                >
                  <span style={{ color: "#a1a1aa" }}>Memory:</span>
                  <span style={{ color: aiMemoryState?.isLoaded ? "#c084fc" : "#34d399", fontWeight: 600 }}>
                    {aiMemoryState?.isLoaded ? "Active (~2.1 GB RAM)" : "Sleeping (0 MB RAM 💤)"}
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  setIsPopoverOpen(false);
                  navigate("/orion");
                }}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <Sparkles size={14} />
                Open Talk to Orion
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
