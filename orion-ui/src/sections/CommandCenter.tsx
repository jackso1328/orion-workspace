import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import OrionOrb from "../components/OrionOrb";
import type { OrionStatus } from "../components/OrionOrb";
import { 
  Calendar, 
  FileText, 
  Target, 
  Lightbulb, 
  Send, 
  Mic, 
  CheckSquare, 
  AlertTriangle, 
  Download, 
  KeyRound, 
  Pause, 
  Play, 
  ExternalLink, 
  Cloud, 
  Cpu,
  Sparkles,
  Zap,
  Clock
} from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import type { TaskPriority } from "../store/useOrionStore";
import { validateAIProposal } from "../domain/planning/planner";

type Message = { role: "user" | "orion"; text: string };

const API_BASE = "http://localhost:8000/api";

interface SuggestionItem {
  text: string;
  icon: React.ReactNode;
  prompt: string;
  isPrefix?: boolean;
}

const SUGGESTIONS: SuggestionItem[] = [
  { text: "Add a new task", icon: <CheckSquare size={16} />, prompt: "Create a task for me to ", isPrefix: true },
  { text: "Organize my day", icon: <Calendar size={16} />, prompt: "Organize my schedule for today" },
  { text: "Summarize recent notes", icon: <FileText size={16} />, prompt: "Summarize my most recent study notes" },
  { text: "Create a study plan", icon: <Target size={16} />, prompt: "Create a focused study plan for my exams" },
  { text: "Explain a concept", icon: <Lightbulb size={16} />, prompt: "Explain the core concept of ", isPrefix: true },
];

/**
 * Normalizes any string representation of priority from LLM response into strict TaskPriority
 */
function normalizePriority(val?: string): TaskPriority {
  if (!val) return "Medium";
  const lower = val.toLowerCase().trim();
  if (lower.includes("crit")) return "Critical";
  if (lower.includes("high")) return "High";
  if (lower.includes("low")) return "Low";
  return "Medium";
}

/**
 * Validates and normalizes dueDate string from AI into a valid ISO string
 */
function normalizeDueDate(val?: string): string {
  if (!val) return new Date().toISOString();
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export default function CommandCenter() {
  const navigate = useNavigate();

  // --- STORE STATE ---
  const {
    aiEngineStatus,
    aiDownloadProgress,
    aiModelSizeFormatted,
    aiProvider,
    setIsAiDownloadModalOpen,
    pauseAiModelDownload,
    resumeAiModelDownload,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    addFlashcard,
    addQuiz,
    addPlan,
  } = useOrionStore();

  const isDownloading = aiEngineStatus === "downloading" || aiDownloadProgress.status === "downloading";
  const isPaused = aiEngineStatus === "paused" || aiDownloadProgress.status === "paused";
  const isReady = aiEngineStatus === "cloud_ready" || aiEngineStatus === "local_ready";
  const isDisabled = !isReady && !isDownloading && !isPaused;

  // --- LOCAL COMPONENT STATE ---
  const [status, setStatus] = useState<OrionStatus>("idle");
  const [agentDetailStatus, setAgentDetailStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const agentWsRef = useRef<WebSocket | null>(null);
  const speakPendingRef = useRef<boolean>(false);

  // --- DISPATCH STORE ACTION ---
  const dispatchStoreAction = useCallback((action: string, payload: any): string | null => {
    try {
      if (action === "addTask") {
        const title = payload.title?.trim() || "New Task from Orion";
        addTask({
          title,
          priority: normalizePriority(payload.priority),
          dueDate: normalizeDueDate(payload.dueDate),
          description: payload.description || "",
          estimatedMinutes: Number(payload.estimatedMinutes) || 30,
          documentIds: Array.isArray(payload.documentIds) ? payload.documentIds : [],
        });
        return `✓ Created task: "${title}"`;
      } else if (action === "updateTask") {
        updateTask(payload.id, payload.updates);
        return `✓ Updated task`;
      } else if (action === "toggleTaskCompletion") {
        toggleTaskCompletion(payload.id);
        return `✓ Toggled task completion`;
      } else if (action === "deleteTask") {
        deleteTask(payload.id);
        return `✓ Removed task`;
      } else if (action === "addFlashcard") {
        addFlashcard({
          deckId: payload.deckId || "general",
          front: payload.front,
          back: payload.back,
        });
        return `✓ Added flashcard: "${(payload.front || '').slice(0, 30)}..."`;
      } else if (action === "addQuiz") {
        addQuiz({
          title: payload.title || "Quick Quiz",
          courseId: payload.courseId,
          questions: payload.questions || [],
        });
        return `✓ Generated quiz: "${payload.title}"`;
      } else if (action === "addPlan") {
        const rawItems = payload.items || payload;
        const currentTasks = useOrionStore.getState().tasks;
        const validated = validateAIProposal(rawItems, currentTasks);
        addPlan(validated);
        return `✓ Proposed new study schedule in Planner`;
      }
    } catch (e) {
      console.error(`Failed to execute store action ${action}:`, e);
    }
    return null;
  }, [addTask, updateTask, deleteTask, toggleTaskCompletion, addFlashcard, addQuiz, addPlan]);

  // --- AGENT WEBSOCKET CONNECTION ---
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket("ws://localhost:8000/ws/agent");
        agentWsRef.current = ws;

        ws.onopen = () => {
          console.log("[ORION] Agent WebSocket connected");
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "AGENT_EVENT") {
              if (data.eventType === "status") {
                const desc = data.data?.description || data.data?.action;
                setAgentDetailStatus(desc || null);
              }
            } else if (data.type === "STORE_ACTION") {
              const confirmMsg = dispatchStoreAction(data.action, data.payload);
              if (confirmMsg) {
                setMessages((prev) => [...prev, { role: "orion", text: confirmMsg }]);
              }
            } else if (data.type === "AGENT_RESPONSE") {
              setAgentDetailStatus(null);
              const botReply = data.reply || "I have completed your request.";
              setMessages((prev) => [...prev, { role: "orion", text: botReply }]);

              if (speakPendingRef.current && botReply) {
                setStatus("speaking");
                try {
                  await fetch(`${API_BASE}/speak`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: botReply }),
                  });
                } catch {
                  // Voice output non-critical
                }
              }
              setStatus("idle");
            }
          } catch (e) {
            console.error("Error parsing agent WS message:", e);
          }
        };

        ws.onclose = () => {
          agentWsRef.current = null;
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          // Fallback to REST seamlessly
        };
      } catch {
        // WS constructor unavailable
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      agentWsRef.current = null;
    };
  }, [dispatchStoreAction]);

  const hasConversation = messages.length > 0 || status !== "idle";

  // Auto-scroll conversation on new message or thinking status
  useEffect(() => {
    if (messages.length > 0 || status === "thinking") {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  // --- AUDIO RECORDING ---
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (status !== "idle") return;
    if (!isReady) {
      setIsAiDownloadModalOpen(true);
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        releaseStream();
        if (audioChunksRef.current.length === 0) {
          setStatus("idle");
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) {
          setStatus("idle");
          return;
        }
        processVoice(audioBlob);
      };

      mediaRecorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access denied", err);
      setError("Microphone access is required for voice input.");
      setStatus("idle");
    }
  }, [status, isReady, releaseStream, setIsAiDownloadModalOpen]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      releaseStream();
    }
  }, [releaseStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseStream();
    };
  }, [releaseStream]);

  // --- VOICE PIPELINE ---
  const processVoice = async (audioBlob: Blob) => {
    setStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const transcribeRes = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        body: formData,
      });
      if (!transcribeRes.ok) throw new Error("Transcription failed");

      const { transcript: userText } = await transcribeRes.json();
      if (!userText?.trim()) {
        setStatus("idle");
        return;
      }

      await sendMessage(userText, true);
    } catch (err) {
      console.error("Voice pipeline error", err);
      setError("Could not process voice input. Is ORION's backend running?");
      setStatus("idle");
    }
  };

  // --- UNIFIED MESSAGE SENDER ---
  const sendMessage = async (text: string, speakResponse: boolean) => {
    if (!isReady) {
      setIsAiDownloadModalOpen(true);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text }]);
    setStatus("thinking");
    setAgentDetailStatus("Reasoning...");
    setError(null);

    const currentTasks = useOrionStore.getState().tasks;
    const currentExams = useOrionStore.getState().exams;
    const currentCourses = useOrionStore.getState().courses;
    const activeMode = useOrionStore.getState().activeMode;
    const conversationHistory = messages.map((m) => ({
      role: m.role === "orion" ? "assistant" : "user",
      content: m.text,
    })).slice(-6);

    const snapshotPayload = {
      tasks: currentTasks.slice(0, 50),
      exams: currentExams.slice(0, 10),
      courses: currentCourses.slice(0, 10),
      activeMode,
    };

    const ws = agentWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      speakPendingRef.current = speakResponse;
      try {
        ws.send(JSON.stringify({
          type: "USER_INPUT",
          message: text,
          state_snapshot: snapshotPayload,
          conversation_history: conversationHistory,
        }));
        return;
      } catch (wsErr) {
        console.warn("WebSocket send failed, falling back to REST:", wsErr);
      }
    }

    // --- REST FALLBACK ---
    try {
      const thinkRes = await fetch(`${API_BASE}/think`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          state_snapshot: snapshotPayload,
          conversation_history: conversationHistory,
        }),
      });
      if (!thinkRes.ok) throw new Error("Think request failed");

      const resData = await thinkRes.json();
      const { reply, actions, task_action, task, proposal } = resData;

      // 1. Process Actions from ReAct Loop
      if (Array.isArray(actions) && actions.length > 0) {
        for (const act of actions) {
          const confirmMsg = dispatchStoreAction(act.action, act.payload);
          if (confirmMsg) {
            setMessages((prev) => [...prev, { role: "orion", text: confirmMsg }]);
          }
        }
      } else if (task_action || task) {
        const confirmMsg = dispatchStoreAction("addTask", task_action || task);
        if (confirmMsg) {
          setMessages((prev) => [...prev, { role: "orion", text: confirmMsg }]);
        }
      } else if (proposal) {
        const confirmMsg = dispatchStoreAction("addPlan", proposal);
        if (confirmMsg) {
          setMessages((prev) => [...prev, { role: "orion", text: confirmMsg }]);
        }
      }

      // 2. Set conversational reply
      const botReply = reply || "I have processed your request.";
      setMessages((prev) => [...prev, { role: "orion", text: botReply }]);

      // 3. Audio response
      if (speakResponse && botReply) {
        setStatus("speaking");
        try {
          await fetch(`${API_BASE}/speak`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: botReply }),
          });
        } catch {
          // Speaking failure is non-critical
        }
      }

      setAgentDetailStatus(null);
      setStatus("idle");
    } catch (err) {
      console.error("Message pipeline error", err);
      setError("Could not reach ORION. Make sure the backend is running.");
      setAgentDetailStatus(null);
      setStatus("idle");
    }
  };

  // --- INPUT & SUGGESTION HANDLERS ---
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) {
      setIsAiDownloadModalOpen(true);
      return;
    }
    const trimmed = textInput.trim();
    if (!trimmed || status !== "idle") return;
    setTextInput("");
    sendMessage(trimmed, false);
  };

  const handleMicClick = () => {
    if (!isReady) {
      setIsAiDownloadModalOpen(true);
      return;
    }
    if (status === "idle") {
      startRecording();
    } else if (status === "recording") {
      stopRecording();
    }
  };

  const handleSuggestionClick = (item: SuggestionItem) => {
    if (!isReady) {
      setIsAiDownloadModalOpen(true);
      return;
    }
    if (item.isPrefix) {
      setTextInput(item.prompt);
      inputRef.current?.focus();
    } else {
      if (status !== "idle") return;
      sendMessage(item.prompt, false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 MB";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatEta = (seconds?: number): string => {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return "--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // --- STATUS CONFIG ---
  const statusConfig: Record<OrionStatus, { text: string; showDot: boolean }> = {
    idle: { text: "", showDot: false },
    recording: { text: "Listening", showDot: true },
    transcribing: { text: "Processing voice", showDot: true },
    thinking: { text: "Thinking", showDot: true },
    speaking: { text: "Responding", showDot: true },
  };

  const currentStatus = statusConfig[status];
  const isBusy = status === "thinking" || status === "speaking" || status === "transcribing";

  return (
    <section className="orion-page" id="command-center">
      <style>{`
        .command-center-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          backdrop-filter: blur(8px);
        }
        .orion-disabled-card {
          width: 100%;
          max-width: 540px;
          box-sizing: border-box;
          position: relative;
          background: linear-gradient(135deg, rgba(28, 16, 30, 0.92) 0%, rgba(16, 12, 22, 0.97) 100%);
          border: 1px solid rgba(244, 63, 94, 0.32);
          border-radius: 20px;
          padding: 1.85rem;
          text-align: center;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(244, 63, 94, 0.12);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          animation: cardFadeUp 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
        }
        .orion-disabled-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(244, 63, 94, 0.8), transparent);
        }
        .orion-download-card {
          width: 100%;
          max-width: 550px;
          box-sizing: border-box;
          position: relative;
          background: linear-gradient(135deg, rgba(24, 20, 42, 0.92) 0%, rgba(13, 11, 25, 0.97) 100%);
          border: 1px solid rgba(168, 85, 247, 0.32);
          border-radius: 22px;
          padding: 1.75rem;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(139, 92, 246, 0.15);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          animation: cardFadeUp 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
        }
        .orion-download-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.9), transparent);
        }
        .command-center-progress-rail {
          position: relative;
          width: 100%;
          height: 10px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .command-center-progress-fill {
          height: 100%;
          border-radius: 999px;
          position: relative;
          overflow: hidden;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .command-center-progress-fill::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
          animation: inlineShimmer 2s infinite ease-in-out;
        }
        @keyframes inlineShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="orion-stage">
        {/* --- ORB ZONE --- */}
        <div className={`orion-orb-zone ${hasConversation ? "compact" : ""}`}>
          <OrionOrb status={status} />
          
          {/* Active Status Pill */}
          {agentDetailStatus ? (
            <div className="orion-status-pill">
              <span className="status-dot" />
              <span>{agentDetailStatus}</span>
            </div>
          ) : currentStatus.text ? (
            <div className="orion-status-pill">
              {currentStatus.showDot && <span className="status-dot" />}
              <span>{currentStatus.text}</span>
            </div>
          ) : isReady ? (
            <div 
              className="command-center-status-badge"
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                color: "#34d399"
              }}
            >
              {aiProvider === "cloud" ? <Cloud size={13} /> : <Cpu size={13} />}
              <span>{aiProvider === "cloud" ? "Cloud AI Active" : "Local AI Ready (Qwen 2.5 3B)"}</span>
            </div>
          ) : null}
        </div>

        {/* --- STATE A: DISABLED FALLBACK CARD --- */}
        {isDisabled && !hasConversation && (
          <div className="orion-disabled-card">
            {/* Ambient Top Glow */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "200px",
                height: "80px",
                background: "radial-gradient(ellipse at center, rgba(244, 63, 94, 0.35) 0%, transparent 70%)",
                pointerEvents: "none",
                filter: "blur(20px)"
              }}
            />

            {/* Cyber Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "3px 10px",
                borderRadius: "999px",
                background: "rgba(244, 63, 94, 0.12)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
                color: "#fda4af",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase"
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#f43f5e",
                  boxShadow: "0 0 8px #f43f5e"
                }}
              />
              Cognitive Engine Inactive
            </div>

            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.08))",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fb7185",
                boxShadow: "0 8px 24px rgba(244, 63, 94, 0.25)"
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
                Neural Core Offline
              </h3>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: "#a1a1aa", lineHeight: 1.5, maxWidth: "420px" }}>
                Voice planning, autonomous task generation, and smart reasoning require the private local model ({aiModelSizeFormatted || "2.1 GB"}) or a connected cloud key.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "4px" }}>
              <button
                onClick={() => setIsAiDownloadModalOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(139, 92, 246, 0.45)",
                  transition: "all 0.2s ease"
                }}
              >
                <Download size={16} />
                Download Local Neural Core ({aiModelSizeFormatted || "2.1 GB"})
              </button>

              <button
                onClick={() => navigate("/settings")}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  color: "#e4e4e7",
                  fontSize: "0.86rem",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  transition: "background 0.2s ease"
                }}
              >
                <KeyRound size={15} />
                Configure Cloud Provider in Settings
              </button>
            </div>
          </div>
        )}

        {/* --- STATE B: DOWNLOADING / PAUSED CARD --- */}
        {(isDownloading || isPaused) && !hasConversation && (
          <div className="orion-download-card">
            {/* Ambient Radial Spotlight */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "240px",
                height: "90px",
                background: isPaused
                  ? "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.3) 0%, transparent 70%)"
                  : "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.35) 0%, transparent 70%)",
                pointerEvents: "none",
                filter: "blur(20px)"
              }}
            />

            {/* Card Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: isPaused
                      ? "rgba(245, 158, 11, 0.15)"
                      : "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(217, 70, 239, 0.15))",
                    border: isPaused ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(168, 85, 247, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isPaused ? "#fbbf24" : "#c084fc",
                    boxShadow: isPaused ? "0 4px 14px rgba(245, 158, 11, 0.2)" : "0 4px 16px rgba(168, 85, 247, 0.25)"
                  }}
                >
                  {isPaused ? <Pause size={19} /> : <Sparkles size={19} />}
                </div>
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: isPaused ? "#fbbf24" : "#c084fc",
                      marginBottom: "2px"
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: isPaused ? "#fbbf24" : "#a855f7",
                        boxShadow: `0 0 6px ${isPaused ? "#fbbf24" : "#a855f7"}`
                      }}
                    />
                    {isPaused ? "Download Suspended" : "Offline Cognition Core"}
                  </div>
                  <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
                    {isPaused ? "Model Download Paused" : "Synthesizing Orion Brain"}
                  </h4>
                </div>
              </div>

              {/* Big Percentage Readout */}
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                    background: isPaused
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : "linear-gradient(135deg, #c084fc 0%, #f472b6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}
                >
                  {Math.round(aiDownloadProgress.percent || 0)}%
                </span>
              </div>
            </div>

            {/* Glowing High-Tech Shimmer Rail */}
            <div>
              <div className="command-center-progress-rail">
                <div
                  className="command-center-progress-fill"
                  style={{
                    width: `${Math.min(Math.max(aiDownloadProgress.percent || 0, 0), 100)}%`,
                    background: isPaused
                      ? "linear-gradient(90deg, #f59e0b, #d97706)"
                      : "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
                    boxShadow: isPaused
                      ? "0 0 12px rgba(245, 158, 11, 0.5)"
                      : "0 0 14px rgba(168, 85, 247, 0.6)"
                  }}
                />
              </div>
            </div>

            {/* 3 Telemetry Glass HUD Pills */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px"
              }}
            >
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Transferred
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f4f4f5", marginTop: "2px" }}>
                  {formatBytes(aiDownloadProgress.downloadedBytes)}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                  <Zap size={11} color="#a855f7" /> Speed
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#c084fc", marginTop: "2px" }}>
                  {aiDownloadProgress.speedMbps ? `${aiDownloadProgress.speedMbps.toFixed(1)} MB/s` : "--"}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                  <Clock size={11} color="#38bdf8" /> Remaining
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
                  {isPaused ? "Paused" : formatEta(aiDownloadProgress.etaSeconds)}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
              {isDownloading ? (
                <button
                  onClick={() => pauseAiModelDownload()}
                  style={{
                    flex: 1,
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "10px",
                    padding: "9px 14px",
                    color: "#fbbf24",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Pause size={15} /> Pause
                </button>
              ) : (
                <button
                  onClick={() => resumeAiModelDownload()}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "9px 14px",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(139, 92, 246, 0.4)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Play size={15} /> Resume
                </button>
              )}

              <button
                onClick={() => setIsAiDownloadModalOpen(true)}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  padding: "9px 14px",
                  color: "#e4e4e7",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  transition: "background 0.2s ease"
                }}
              >
                <ExternalLink size={14} /> Full Telemetry
              </button>
            </div>
          </div>
        )}

        {/* --- STATE C: READY EMPTY STATE WITH TASK OPTION --- */}
        {isReady && !hasConversation && (
          <div className="orion-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                className="suggestion-chip"
                onClick={() => handleSuggestionClick(s)}
                disabled={status !== "idle"}
              >
                <span className="suggestion-icon">{s.icon}</span>
                <span className="suggestion-text">{s.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* --- CONVERSATION STREAM --- */}
        {hasConversation && (
          <div className="orion-conversation">
            {messages.map((msg, idx) => (
              <div key={idx} className={`orion-msg orion-msg-${msg.role} msg-enter`}>
                {msg.role === "orion" && (
                  <span className="orion-msg-accent" />
                )}
                <p>{msg.text}</p>
              </div>
            ))}
            {status === "thinking" && (
              <div className="orion-msg orion-msg-orion orion-thinking-indicator msg-enter">
                <span className="orion-msg-accent" />
                <div className="thinking-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            {error && (
              <div className="orion-error msg-enter">
                {error}
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* --- UNIFIED INPUT BAR --- */}
        <form className="orion-input-bar" onSubmit={handleTextSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="orion-text-input"
            placeholder={
              isDisabled
                ? "Click to activate Orion AI (Local Model or API Key)..."
                : isDownloading
                ? `Orion Brain is downloading (${Math.round(aiDownloadProgress.percent || 0)}%)...`
                : isPaused
                ? "Download paused. Click Resume to continue..."
                : isBusy
                ? "ORION is working..."
                : "Ask ORION anything or create a task..."
            }
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isBusy}
            onClick={() => {
              if (!isReady) setIsAiDownloadModalOpen(true);
            }}
          />

          {textInput.trim() && (
            <button
              type="submit"
              className="orion-send-btn"
              disabled={isBusy}
              aria-label="Send message"
            >
              <Send size={18} strokeWidth={2.5} />
            </button>
          )}

          <button
            type="button"
            className={`orion-mic-btn ${status === "recording" ? "recording" : ""}`}
            onClick={handleMicClick}
            disabled={isBusy}
            title={
              !isReady 
                ? "Activate Orion AI to use voice input" 
                : status === "recording" 
                ? "Stop recording" 
                : "Start voice input"
            }
            aria-label={status === "recording" ? "Stop recording" : "Start voice input"}
          >
            <Mic size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </section>
  );
}
