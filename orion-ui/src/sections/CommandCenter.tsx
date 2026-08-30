import { useState, useEffect, useRef, useCallback } from "react";
import OrionOrb from "../components/OrionOrb";
import type { OrionStatus } from "../components/OrionOrb";

type Message = { role: "user" | "orion"; text: string };

const API_BASE = "http://localhost:8000/api";

import { Calendar, FileText, Target, Lightbulb, Send, Mic } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { validateAIProposal } from "../domain/planning/planner";

const SUGGESTIONS = [
  { text: "Organize my day", icon: <Calendar size={16} /> },
  { text: "Summarize recent notes", icon: <FileText size={16} /> },
  { text: "Create a study plan", icon: <Target size={16} /> },
  { text: "Explain a concept", icon: <Lightbulb size={16} /> },
];

export default function CommandCenter() {
  // --- SINGLE AUTHORITATIVE STATE SOURCE ---
  const [status, setStatus] = useState<OrionStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const hasConversation = messages.length > 0 || status !== "idle";

  // Auto-scroll conversation
  useEffect(() => {
    if (messages.length > 0) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // --- AUDIO RECORDING ---
  const startRecording = useCallback(async () => {
    if (status !== "idle") return;
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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Release mic immediately
        releaseStream();
        processVoice(audioBlob);
      };

      mediaRecorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access denied", err);
      setError("Microphone access is required for voice input.");
      setStatus("idle");
    }
  }, [status]);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

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

  // --- VOICE PIPELINE (transcribe → think → speak) ---
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

  // --- UNIFIED MESSAGE SENDER (voice or text → think → optional speak) ---
  const sendMessage = async (text: string, speakResponse: boolean) => {
    setMessages((prev) => [...prev, { role: "user", text }]);
    setStatus("thinking");
    setError(null);

    try {
      const thinkRes = await fetch(`${API_BASE}/think`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!thinkRes.ok) throw new Error("Think request failed");

      const { reply, proposal } = await thinkRes.json();
            setMessages((prev) => [...prev, { role: "orion", text: reply }]);

      if (proposal) {
        try {
          const tasks = useOrionStore.getState().tasks;
          const validatedItems = validateAIProposal(proposal, tasks);
          useOrionStore.getState().addPlan(validatedItems);
          setMessages((prev) => [...prev, { role: "orion", text: "I have prepared a new planning proposal for you. Please check the Study Planner to review it." }]);
        } catch (e) {
          console.error("AI returned invalid plan proposal", e);
          setMessages((prev) => [...prev, { role: "orion", text: "I tried to create a plan, but there was an internal error with the schedule generation. Please ensure you have secure credential infrastructure installed." }]);
        }
      }

      if (speakResponse) {
        setStatus("speaking");
        try {
          await fetch(`${API_BASE}/speak`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: reply }),
          });
        } catch {
          // Speaking failure is non-critical
        }
      }

      setStatus("idle");
    } catch (err) {
      console.error("Message pipeline error", err);
      setError("Could not reach ORION. Make sure the backend is running.");
      setStatus("idle");
    }
  };

  // --- INPUT HANDLERS ---
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed || status !== "idle") return;
    setTextInput("");
    sendMessage(trimmed, false);
  };

  const handleMicClick = () => {
    if (status === "idle") {
      startRecording();
    } else if (status === "recording") {
      stopRecording();
    }
  };

  const handleSuggestion = (text: string) => {
    if (status !== "idle") return;
    sendMessage(text, false);
  };

  // --- STATUS DISPLAY ---
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
      <div className="orion-stage">
        {/* --- ORB ZONE --- */}
        <div className={`orion-orb-zone ${hasConversation ? "compact" : ""}`}>
          <OrionOrb status={status} />
          {currentStatus.text && (
            <div className="orion-status-pill">
              {currentStatus.showDot && <span className="status-dot" />}
              <span>{currentStatus.text}</span>
            </div>
          )}
        </div>

        {/* --- EMPTY STATE SUGGESTIONS --- */}
        {!hasConversation && (
          <div className="orion-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                className="suggestion-chip"
                onClick={() => handleSuggestion(s.text)}
                disabled={status !== "idle"}
              >
                <span className="suggestion-icon">{s.icon}</span>
                <span className="suggestion-text">{s.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* --- CONVERSATION --- */}
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
            type="text"
            className="orion-text-input"
            placeholder={isBusy ? "ORION is working..." : "Ask ORION anything..."}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isBusy}
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
            aria-label={status === "recording" ? "Stop recording" : "Start voice input"}
          >
            <Mic size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </section>
  );
}


