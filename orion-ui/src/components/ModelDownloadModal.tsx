import { useEffect, useRef } from "react";
import { 
  Sparkles, 
  Download, 
  Pause, 
  Play, 
  X, 
  HardDrive, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  KeyRound,
  Zap,
  Clock,
  ArrowRight,
  Radio,
  Layers
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { useNavigate } from "react-router-dom";

export default function ModelDownloadModal() {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    isAiDownloadModalOpen,
    setIsAiDownloadModalOpen,
    aiDownloadProgress,
    aiModelSizeFormatted,
    setAiDownloadDeclined,
    startAiModelDownload,
    pauseAiModelDownload,
    resumeAiModelDownload,
    cancelAiModelDownload,
    updateAiDownloadProgress,
  } = useOrionStore();

  const isDownloading = aiDownloadProgress.status === "downloading";
  const isPaused = aiDownloadProgress.status === "paused";
  const isCompleted = aiDownloadProgress.status === "completed";
  const isError = aiDownloadProgress.status === "error";

  // Escape key and backdrop click listener
  useEffect(() => {
    if (!isAiDownloadModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAiDownloadDeclined(true);
      }
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setAiDownloadDeclined(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleOutsideClick);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleOutsideClick);
      document.body.style.overflow = originalOverflow;
    };
  }, [isAiDownloadModalOpen, setAiDownloadDeclined]);

  // WebSocket / Polling listener for download progress from backend
  useEffect(() => {
    if (!isAiDownloadModalOpen || (!isDownloading && !isPaused)) return;

    let ws: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      ws = new WebSocket("ws://localhost:8000/ws/ai-status");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "DOWNLOAD_PROGRESS" && data.progress) {
            updateAiDownloadProgress(data.progress);
          }
        } catch (e) {
          console.error("Error parsing AI status WS event:", e);
        }
      };

      ws.onerror = () => {
        if (!pollInterval) {
          pollInterval = setInterval(async () => {
            try {
              const res = await fetch("http://localhost:8000/api/ai/status");
              if (res.ok) {
                const data = await res.json();
                if (data.download_state) {
                  updateAiDownloadProgress(data.download_state);
                }
              }
            } catch {
              // Backend offline
            }
          }, 1000);
        }
      };
    } catch {
      // WS constructor failed
    }

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAiDownloadModalOpen, isDownloading, isPaused, updateAiDownloadProgress]);

  if (!isAiDownloadModalOpen) return null;

  const handleDecline = () => {
    setAiDownloadDeclined(true);
  };

  const handleGoToSettings = () => {
    setAiDownloadDeclined(true);
    navigate("/settings");
  };

  const handleStartUsing = () => {
    setIsAiDownloadModalOpen(false);
    navigate("/orion");
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 MB";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatSpeed = (mbps: number): string => {
    if (!mbps || mbps <= 0) return "-- MB/s";
    return `${mbps.toFixed(1)} MB/s`;
  };

  const formatEta = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "Calculating ETA...";
    if (seconds < 60) return `~${Math.round(seconds)}s remaining`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `~${mins}m ${secs}s remaining`;
  };

  const percentClamped = Math.min(Math.max(aiDownloadProgress.percent || 0, 0), 100);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(4, 3, 10, 0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1.5rem",
        animation: "modalFadeIn 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes progressShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes neuralPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes coreSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes tipGlow {
          0%, 100% { filter: drop-shadow(0 0 6px #c084fc); }
          50% { filter: drop-shadow(0 0 14px #e879f9); }
        }
        .orion-glass-button {
          transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .orion-glass-button:hover {
          transform: translateY(-2px);
          filter: brightness(1.12);
        }
        .orion-glass-button:active {
          transform: translateY(0);
        }
        .orion-spec-card {
          transition: all 220ms ease;
        }
        .orion-spec-card:hover {
          transform: translateY(-2px);
          border-color: rgba(168, 85, 247, 0.4) !important;
          background: rgba(255, 255, 255, 0.045) !important;
        }
      `}</style>

      {/* Main Glass Hologram Modal */}
      <div
        ref={modalRef}
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "radial-gradient(circle at 50% 0%, rgba(30, 22, 54, 0.98), rgba(12, 10, 22, 0.99) 75%)",
          borderRadius: "24px",
          border: isError 
            ? "1px solid rgba(239, 68, 68, 0.4)"
            : isCompleted
            ? "1px solid rgba(16, 185, 129, 0.45)"
            : "1px solid rgba(168, 85, 247, 0.28)",
          boxShadow: isError
            ? "0 30px 80px rgba(0, 0, 0, 0.85), 0 0 50px rgba(239, 68, 68, 0.2)"
            : isCompleted
            ? "0 30px 80px rgba(0, 0, 0, 0.85), 0 0 50px rgba(16, 185, 129, 0.25)"
            : "0 35px 90px rgba(0, 0, 0, 0.9), 0 0 60px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Ambient Top Glow Light Beam */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "1px",
            background: isError
              ? "linear-gradient(90deg, transparent, #ef4444, transparent)"
              : isCompleted
              ? "linear-gradient(90deg, transparent, #10b981, transparent)"
              : "linear-gradient(90deg, transparent, #c084fc, #38bdf8, transparent)",
            boxShadow: isError
              ? "0 0 20px #ef4444"
              : isCompleted
              ? "0 0 20px #10b981"
              : "0 0 25px #c084fc",
          }}
        />

        {/* Ambient Radial Spotlight inside header */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "300px",
            height: "180px",
            borderRadius: "50%",
            background: isError
              ? "radial-gradient(circle, rgba(239, 68, 68, 0.25), transparent 70%)"
              : isCompleted
              ? "radial-gradient(circle, rgba(16, 185, 129, 0.25), transparent 70%)"
              : "radial-gradient(circle, rgba(147, 51, 234, 0.28), transparent 70%)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* Floating Top Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.75rem 0.75rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isError ? "#f87171" : isCompleted ? "#34d399" : "#c084fc",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: isError ? "#ef4444" : isCompleted ? "#10b981" : "#a855f7",
                boxShadow: isError 
                  ? "0 0 8px #ef4444" 
                  : isCompleted 
                  ? "0 0 8px #10b981" 
                  : "0 0 8px #a855f7",
                animation: "neuralPulse 2s infinite ease-in-out",
              }}
            />
            {isError 
              ? "Pipeline Alert" 
              : isCompleted 
              ? "Neural Core Active" 
              : "Autonomous Intelligence • Local Core"}
          </div>

          {/* Close / Dismiss Icon */}
          <button
            onClick={handleDecline}
            aria-label="Close modal"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a1a1aa",
              cursor: "pointer",
              transition: "all 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.color = "#a1a1aa";
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "0.5rem 2rem 2rem" }}>
          {/* Hero Header Area */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "1.75rem" }}>
            {/* Holographic Glowing Core Icon */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "18px",
                background: isError
                  ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.35))"
                  : isCompleted
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))"
                  : "linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(79, 70, 229, 0.3))",
                border: isError
                  ? "1px solid rgba(239, 68, 68, 0.45)"
                  : isCompleted
                  ? "1px solid rgba(16, 185, 129, 0.5)"
                  : "1px solid rgba(168, 85, 247, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isError ? "#f87171" : isCompleted ? "#34d399" : "#e879f9",
                boxShadow: isError
                  ? "0 8px 24px rgba(239, 68, 68, 0.25)"
                  : isCompleted
                  ? "0 8px 24px rgba(16, 185, 129, 0.25)"
                  : "0 8px 28px rgba(147, 51, 234, 0.35)",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {isError ? (
                <AlertCircle size={28} />
              ) : isCompleted ? (
                <CheckCircle2 size={28} />
              ) : (
                <Sparkles size={28} />
              )}
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  background: isError
                    ? "linear-gradient(135deg, #ffffff 40%, #fca5a5 100%)"
                    : isCompleted
                    ? "linear-gradient(135deg, #ffffff 40%, #6ee7b7 100%)"
                    : "linear-gradient(135deg, #ffffff 30%, #d8b4fe 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {isError
                  ? "Model Transfer Interrupted"
                  : isDownloading
                  ? "Downloading Local Neural Engine"
                  : isPaused
                  ? "Model Download Suspended"
                  : isCompleted
                  ? "ORION Brain Fully Initialized"
                  : "Initialize ORION Local Brain"}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#a1a1aa", lineHeight: 1.4 }}>
                {isError
                  ? "Connection lost or interrupted. Partial progress is preserved on disk."
                  : isDownloading
                  ? "Streaming in-process GGUF weights directly to disk with resumable range streaming."
                  : isPaused
                  ? "Paused at current byte offset. You can resume at any time."
                  : isCompleted
                  ? "Zero-telemetry quantized model cached and verified."
                  : "100% Offline • Private On-Device Neural Processing"}
              </p>
            </div>
          </div>

          {/* STATE 1: ERROR VIEW */}
          {isError && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "14px",
                  padding: "1.1rem 1.25rem",
                  color: "#fca5a5",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "#f87171", marginBottom: "3px" }}>Transfer Failed</div>
                  <div>{aiDownloadProgress.error || "Failed to stream model weights from huggingface CDN. Check connection and ensure backend is online."}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  onClick={() => startAiModelDownload()}
                  className="orion-glass-button"
                  style={{
                    flex: 2,
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    border: "1px solid rgba(192, 132, 252, 0.35)",
                    borderRadius: "12px",
                    padding: "13px 20px",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(139, 92, 246, 0.4)",
                  }}
                >
                  <RefreshCw size={17} />
                  Resume / Retry Download
                </button>

                <button
                  onClick={handleDecline}
                  className="orion-glass-button"
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    padding: "13px 16px",
                    color: "#a1a1aa",
                    fontSize: "0.92rem",
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: INITIAL CONFIRMATION PROMPT */}
          {!isError && !isDownloading && !isPaused && !isCompleted && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.55, color: "#d4d4d8" }}>
                To enable autonomous task creation, executive study scheduling, voice commands, and document reasoning without sending your data to external cloud APIs, ORION will download a high-performance local language model.
              </p>

              {/* Holographic Spec Cards (3-Tile Grid) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                }}
              >
                {/* Tile 1: Size */}
                <div
                  className="orion-spec-card"
                  style={{
                    background: "rgba(255, 255, 255, 0.025)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    borderRadius: "14px",
                    padding: "14px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(168, 85, 247, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#c084fc",
                    }}
                  >
                    <HardDrive size={16} />
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    Footprint
                  </span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f4f4f5" }}>
                    {aiModelSizeFormatted || "2.1 GB"}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#c084fc", fontWeight: 500 }}>
                    Q4_K_M Quantized
                  </span>
                </div>

                {/* Tile 2: Architecture */}
                <div
                  className="orion-spec-card"
                  style={{
                    background: "rgba(255, 255, 255, 0.025)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    borderRadius: "14px",
                    padding: "14px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(56, 189, 248, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#38bdf8",
                    }}
                  >
                    <Cpu size={16} />
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    Architecture
                  </span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f4f4f5" }}>
                    Qwen 2.5
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#38bdf8", fontWeight: 500 }}>
                    3B Parameters
                  </span>
                </div>

                {/* Tile 3: Privacy */}
                <div
                  className="orion-spec-card"
                  style={{
                    background: "rgba(255, 255, 255, 0.025)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    borderRadius: "14px",
                    padding: "14px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "rgba(52, 211, 153, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#34d399",
                    }}
                  >
                    <ShieldCheck size={16} />
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    Telemetry
                  </span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#34d399" }}>
                    Zero Cloud
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: 500 }}>
                    100% Offline
                  </span>
                </div>
              </div>

              {/* Action Buttons Deck */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.5rem" }}>
                <button
                  onClick={() => startAiModelDownload()}
                  className="orion-glass-button"
                  style={{
                    background: "linear-gradient(135deg, #9333ea, #6366f1 60%, #3b82f6)",
                    border: "1px solid rgba(216, 180, 254, 0.4)",
                    borderRadius: "14px",
                    padding: "14px 22px",
                    color: "#ffffff",
                    fontSize: "1rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    cursor: "pointer",
                    boxShadow: "0 8px 30px rgba(124, 58, 237, 0.45)",
                  }}
                >
                  <Download size={19} />
                  Download Model ({aiModelSizeFormatted || "2.1 GB"})
                </button>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleGoToSettings}
                    className="orion-glass-button"
                    style={{
                      flex: 1.2,
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "11px 16px",
                      color: "#e4e4e7",
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                      cursor: "pointer",
                    }}
                  >
                    <KeyRound size={15} color="#c084fc" />
                    Use Cloud Key Instead
                  </button>

                  <button
                    onClick={handleDecline}
                    className="orion-glass-button"
                    style={{
                      flex: 0.8,
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.07)",
                      borderRadius: "12px",
                      padding: "11px 14px",
                      color: "#a1a1aa",
                      fontSize: "0.88rem",
                      cursor: "pointer",
                    }}
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: DOWNLOADING & PAUSED VIEW (CYBER INSTRUMENT HUD) */}
          {!isError && (isDownloading || isPaused) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
              {/* Digital Percentage & Scale Readout */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  padding: "4px 2px",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a1a1aa", fontWeight: 600 }}>
                    {isPaused ? "Transfer Suspended" : "Quantum Stream Active"}
                  </div>
                  <div
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      background: isPaused
                        ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                        : "linear-gradient(135deg, #ffffff 20%, #c084fc 60%, #38bdf8 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {Math.round(percentClamped)}%
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "2px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      color: "#f4f4f5",
                    }}
                  >
                    {formatBytes(aiDownloadProgress.downloadedBytes)}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#71717a" }}>
                    of {formatBytes(aiDownloadProgress.totalBytes) || (aiModelSizeFormatted || "2.1 GB")}
                  </span>
                </div>
              </div>

              {/* Ultra-High-Tech Progress Rail */}
              <div
                style={{
                  width: "100%",
                  height: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  borderRadius: "999px",
                  padding: "2px",
                  boxSizing: "border-box",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  position: "relative",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.6)",
                }}
              >
                {/* Progress Fill */}
                <div
                  style={{
                    height: "100%",
                    width: `${percentClamped}%`,
                    background: isPaused
                      ? "linear-gradient(90deg, #f59e0b, #d97706)"
                      : "linear-gradient(90deg, #6366f1, #a855f7 50%, #ec4899 80%, #38bdf8)",
                    borderRadius: "999px",
                    position: "relative",
                    overflow: "hidden",
                    transition: "width 250ms cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: isPaused 
                      ? "0 0 12px rgba(245, 158, 11, 0.5)" 
                      : "0 0 16px rgba(168, 85, 247, 0.65)",
                  }}
                >
                  {/* Shimmer Light Beam */}
                  {!isPaused && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: "60px",
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent)",
                        animation: "progressShimmer 1.8s infinite linear",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 3-Column Glass Telemetry HUD */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                }}
              >
                {/* Speed Card */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Zap size={15} color={isPaused ? "#a1a1aa" : "#34d399"} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: "0.68rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.04em" }}>Speed</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: isPaused ? "#71717a" : "#f4f4f5", whiteSpace: "nowrap" }}>
                      {isPaused ? "0.0 MB/s" : formatSpeed(aiDownloadProgress.speedMbps)}
                    </div>
                  </div>
                </div>

                {/* ETA Card */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Clock size={15} color={isPaused ? "#a1a1aa" : "#38bdf8"} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: "0.68rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.04em" }}>Estimate</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f4f4f5", whiteSpace: "nowrap" }}>
                      {isPaused ? "Paused" : formatEta(aiDownloadProgress.etaSeconds)}
                    </div>
                  </div>
                </div>

                {/* State Card */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Radio size={15} color={isPaused ? "#fbbf24" : "#c084fc"} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: "0.68rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.04em" }}>Protocol</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: isPaused ? "#fbbf24" : "#c084fc", whiteSpace: "nowrap" }}>
                      {isPaused ? "Suspended" : "HTTP Range"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tactical Control Deck */}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                {isDownloading ? (
                  <button
                    onClick={() => pauseAiModelDownload()}
                    className="orion-glass-button"
                    style={{
                      flex: 2,
                      background: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      borderRadius: "12px",
                      padding: "13px 18px",
                      color: "#fbbf24",
                      fontSize: "0.94rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    <Pause size={17} />
                    Pause Download
                  </button>
                ) : (
                  <button
                    onClick={() => resumeAiModelDownload()}
                    className="orion-glass-button"
                    style={{
                      flex: 2,
                      background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                      border: "1px solid rgba(216, 180, 254, 0.35)",
                      borderRadius: "12px",
                      padding: "13px 18px",
                      color: "#ffffff",
                      fontSize: "0.94rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: "0 6px 22px rgba(139, 92, 246, 0.4)",
                    }}
                  >
                    <Play size={17} />
                    Resume Download
                  </button>
                )}

                <button
                  onClick={() => cancelAiModelDownload()}
                  className="orion-glass-button"
                  style={{
                    flex: 1,
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.22)",
                    borderRadius: "12px",
                    padding: "13px 16px",
                    color: "#f87171",
                    fontSize: "0.92rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: COMPLETED VIEW (HOLOGRAPHIC INITIALIZATION) */}
          {!isError && isCompleted && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem", textAlign: "center", padding: "0.5rem 0 0" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "24px",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3))",
                  border: "1px solid rgba(52, 211, 153, 0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  boxShadow: "0 0 40px rgba(16, 185, 129, 0.35)",
                  position: "relative",
                }}
              >
                <CheckCircle2 size={44} color="#34d399" />
              </div>

              <div>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: "#f4f4f5",
                  }}
                >
                  Neural Weights Verified
                </h3>
                <p style={{ margin: 0, fontSize: "0.92rem", color: "#a1a1aa", maxWidth: "420px", marginInline: "auto", lineHeight: 1.5 }}>
                  {aiDownloadProgress.modelName || "Qwen 2.5 3B"} is cached and loaded into your local offline inference runtime.
                </p>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  margin: "0 auto",
                }}
              >
                <Layers size={15} />
                <span>Zero Latency • VRAM Optimized • Air-Gapped</span>
              </div>

              <button
                onClick={handleStartUsing}
                className="orion-glass-button"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669 60%, #047857)",
                  border: "1px solid rgba(110, 231, 183, 0.45)",
                  borderRadius: "14px",
                  padding: "14px 22px",
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "0.25rem",
                  boxShadow: "0 8px 30px rgba(16, 185, 129, 0.45)",
                }}
              >
                <span>Launch ORION AI Command Center</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
