import { useEffect, useRef } from "react";
import { 
  Sparkles, 
  Download, 
  Pause, 
  Play, 
  X, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  KeyRound,
  ArrowRight
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
    if (!seconds || seconds <= 0) return "Calculating...";
    if (seconds < 60) return `~${Math.round(seconds)}s left`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `~${mins}m ${secs}s left`;
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
        backgroundColor: "rgba(10, 8, 16, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1.25rem",
        animation: "modalFadeIn 220ms ease-out forwards",
      }}
    >
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes progressShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .orion-btn-primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
          transition: all 180ms ease;
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
        }
        .orion-btn-primary:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.45);
        }
        .orion-btn-primary:active {
          transform: translateY(0);
        }
        .orion-btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #e2e8f0;
          font-weight: 500;
          cursor: pointer;
          transition: all 180ms ease;
        }
        .orion-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.16);
          color: #ffffff;
        }
        .orion-btn-ghost {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-weight: 500;
          cursor: pointer;
          transition: color 180ms ease;
        }
        .orion-btn-ghost:hover {
          color: #f1f5f9;
        }
      `}</style>

      {/* Main Orion Modal Card */}
      <div
        ref={modalRef}
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(18, 16, 26, 0.95)",
          borderRadius: "20px",
          border: isError 
            ? "1px solid rgba(239, 68, 68, 0.35)"
            : isCompleted
            ? "1px solid rgba(16, 185, 129, 0.35)"
            : "1px solid rgba(139, 92, 246, 0.2)",
          boxShadow: "0 24px 50px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          color: "#ffffff",
          overflow: "hidden",
          position: "relative",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Header Row: Icon, Title & Close Button */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: isError
                  ? "rgba(239, 68, 68, 0.15)"
                  : isCompleted
                  ? "rgba(16, 185, 129, 0.15)"
                  : isPaused
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(139, 92, 246, 0.15)",
                border: isError
                  ? "1px solid rgba(239, 68, 68, 0.3)"
                  : isCompleted
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : isPaused
                  ? "1px solid rgba(245, 158, 11, 0.3)"
                  : "1px solid rgba(139, 92, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isError
                  ? "#f87171"
                  : isCompleted
                  ? "#34d399"
                  : isPaused
                  ? "#fbbf24"
                  : "#c084fc",
                flexShrink: 0,
              }}
            >
              {isError ? (
                <AlertCircle size={22} />
              ) : isCompleted ? (
                <CheckCircle2 size={22} />
              ) : isPaused ? (
                <Pause size={20} />
              ) : isDownloading ? (
                <Download size={20} />
              ) : (
                <Sparkles size={22} />
              )}
            </div>

            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.18rem",
                  fontWeight: 600,
                  color: "#f8fafc",
                  letterSpacing: "-0.01em",
                }}
              >
                {isError
                  ? "Download Interrupted"
                  : isDownloading
                  ? "Downloading AI Model"
                  : isPaused
                  ? "Download Paused"
                  : isCompleted
                  ? "AI Model Ready"
                  : "Download Local AI Model"}
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.84rem", color: "#94a3b8", lineHeight: 1.4 }}>
                {isError
                  ? "Connection issue. Progress has been preserved."
                  : isDownloading
                  ? "Downloading local model weights to your device."
                  : isPaused
                  ? "Download paused. Resume whenever you're ready."
                  : isCompleted
                  ? "Offline neural engine is installed and active."
                  : "Required for offline voice assistant and smart planning."}
              </p>
            </div>
          </div>

          <button
            onClick={handleDecline}
            aria-label="Close modal"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f1f5f9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <X size={18} />
          </button>
        </div>

        {/* STATE 1: ERROR VIEW */}
        {isError && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "12px",
                padding: "12px 14px",
                color: "#fca5a5",
                fontSize: "0.85rem",
                lineHeight: 1.45,
              }}
            >
              {aiDownloadProgress.error || "Failed to download model weights. Please check your connection and try again."}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={() => startAiModelDownload()}
                className="orion-btn-primary"
                style={{
                  flex: 1,
                  padding: "11px 16px",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                }}
              >
                <RefreshCw size={15} /> Retry Download
              </button>

              <button
                onClick={handleDecline}
                className="orion-btn-secondary"
                style={{
                  padding: "11px 18px",
                  fontSize: "0.88rem",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: INITIAL CONFIRMATION VIEW */}
        {!isError && !isDownloading && !isPaused && !isCompleted && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {/* Minimal Model Info Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "0.82rem",
                color: "#cbd5e1",
              }}
            >
              <span style={{ fontWeight: 600, color: "#c084fc" }}>Qwen 2.5 3B</span>
              <span style={{ color: "#64748b" }}>•</span>
              <span>{aiModelSizeFormatted || "2.1 GB"} footprint</span>
              <span style={{ color: "#64748b" }}>•</span>
              <span style={{ color: "#34d399" }}>100% Offline</span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "2px" }}>
              <button
                onClick={() => startAiModelDownload()}
                className="orion-btn-primary"
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  fontSize: "0.92rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Download size={16} />
                Download Model ({aiModelSizeFormatted || "2.1 GB"})
              </button>

              <button
                onClick={handleGoToSettings}
                className="orion-btn-secondary"
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: "0.86rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                }}
              >
                <KeyRound size={15} color="#c084fc" />
                Use Cloud API Key Instead
              </button>

              <button
                onClick={handleDecline}
                className="orion-btn-ghost"
                style={{
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  textAlign: "center",
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: DOWNLOADING & PAUSED VIEW */}
        {!isError && (isDownloading || isPaused) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Top Stat Row: Percent & Byte Count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: isPaused ? "#fbbf24" : "#c084fc",
                }}
              >
                {Math.round(percentClamped)}%
              </span>

              <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                {formatBytes(aiDownloadProgress.downloadedBytes)} / {aiDownloadProgress.totalBytes ? formatBytes(aiDownloadProgress.totalBytes) : (aiModelSizeFormatted || "2.1 GB")}
              </span>
            </div>

            {/* Approved Shimmer Progress Rail */}
            <div
              style={{
                width: "100%",
                height: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                borderRadius: "999px",
                padding: "1px",
                boxSizing: "border-box",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                position: "relative",
                boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.5)",
              }}
            >
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
                  transition: "width 250ms ease-out",
                  boxShadow: isPaused 
                    ? "0 0 12px rgba(245, 158, 11, 0.45)" 
                    : "0 0 14px rgba(168, 85, 247, 0.6)",
                }}
              >
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

            {/* Clean Telemetry Line: Speed & ETA */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                color: "#94a3b8",
              }}
            >
              <span>
                {isPaused ? "Download paused" : `Speed: ${formatSpeed(aiDownloadProgress.speedMbps)}`}
              </span>
              <span>
                {isPaused ? "Progress saved" : formatEta(aiDownloadProgress.etaSeconds)}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "9px", marginTop: "4px" }}>
              {isDownloading ? (
                <button
                  onClick={() => pauseAiModelDownload()}
                  className="orion-btn-secondary"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    fontSize: "0.88rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    color: "#fbbf24",
                  }}
                >
                  <Pause size={15} /> Pause
                </button>
              ) : (
                <button
                  onClick={() => resumeAiModelDownload()}
                  className="orion-btn-primary"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    fontSize: "0.88rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Play size={15} /> Resume
                </button>
              )}

              <button
                onClick={() => cancelAiModelDownload()}
                className="orion-btn-secondary"
                style={{
                  padding: "10px 14px",
                  fontSize: "0.86rem",
                  color: "#94a3b8",
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleDecline}
                className="orion-btn-secondary"
                style={{
                  padding: "10px 14px",
                  fontSize: "0.86rem",
                  color: "#cbd5e1",
                }}
              >
                Minimize
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: COMPLETED VIEW */}
        {!isError && isCompleted && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", textAlign: "center", padding: "0.5rem 0 0" }}>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.45 }}>
              The local model has been verified and loaded. You can now use voice commands and autonomous features offline.
            </p>

            <button
              onClick={handleStartUsing}
              className="orion-btn-primary"
              style={{
                width: "100%",
                padding: "12px 18px",
                fontSize: "0.92rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>Start Using Orion</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
