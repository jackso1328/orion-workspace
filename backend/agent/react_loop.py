"""
ORION - The ReAct Reasoning Loop (Agentic Brain)
Implements a 3-step Reason + Act + Observe loop for ORION AI.
Coordinates between the Unified Hybrid LLM, Tool Registry, and Frontend State.
"""
import re
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass, field

logger = logging.getLogger("orion.agent.react_loop")

# Safe imports for LLM and Tools
def _get_llm():
    try:
        from backend.llm import generate_response, get_active_engine_info
    except ImportError:
        try:
            from llm import generate_response, get_active_engine_info
        except ImportError:
            raise ImportError("Could not import llm module")
    return generate_response, get_active_engine_info


def _get_tools():
    try:
        from backend.tools.registry import execute_tool, get_tools_prompt_description, TOOL_REGISTRY
    except ImportError:
        try:
            from tools.registry import execute_tool, get_tools_prompt_description, TOOL_REGISTRY
        except ImportError:
            from registry import execute_tool, get_tools_prompt_description, TOOL_REGISTRY
    return execute_tool, get_tools_prompt_description, TOOL_REGISTRY


def _get_memory():
    try:
        from backend.memory import search_memory, auto_detect_and_save_facts
    except ImportError:
        try:
            from memory import search_memory, auto_detect_and_save_facts
        except ImportError:
            search_memory = lambda *a, **k: []
            auto_detect_and_save_facts = lambda *a, **k: []
    return search_memory, auto_detect_and_save_facts


@dataclass
class AgentRunResult:
    reply: str
    actions: List[Dict[str, Any]] = field(default_factory=list)
    steps: List[Dict[str, Any]] = field(default_factory=list)
    engine: str = "unknown"


def _extract_json_action(text: str) -> Optional[Dict[str, Any]]:
    """
    Robust extractor for JSON action blocks from model output.
    Handles fenced code blocks, raw JSON strings, and embedded action dictionaries.
    """
    if not text:
        return None

    # Pattern 1: ```json { ... } ```
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    if match:
        try:
            parsed = json.loads(match.group(1))
            if isinstance(parsed, dict) and "action" in parsed:
                return parsed
        except Exception:
            pass

    # Pattern 2: Raw top-level or embedded JSON containing "action"
    candidates = re.findall(r"(\{(?:[^{}]|(?:\{[^{}]*\}))*\})", text)
    for cand in candidates:
        try:
            parsed = json.loads(cand)
            if isinstance(parsed, dict) and "action" in parsed:
                return parsed
        except Exception:
            continue

    return None


async def run_agent_loop(
    user_message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    state_snapshot: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
    provider: Optional[str] = None,
    on_event: Optional[Callable[[str, Any], Awaitable[None]]] = None,
    max_steps: int = 3
) -> AgentRunResult:
    """
    Executes the 3-step ReAct reasoning loop.
    
    Args:
        user_message: The prompt or voice transcript from user.
        conversation_history: List of prior turn dictionaries (role, content).
        state_snapshot: Lightweight snapshot of tasks, courses, and current mode from UI.
        api_key: Optional override API key.
        provider: Optional override cloud provider.
        on_event: Async callback to stream live thinking and tool execution events to WebSocket.
        max_steps: Maximum reasoning iterations (default: 3).
        
    Returns:
        AgentRunResult with final reply and queued UI actions.
    """
    generate_response, get_active_engine_info = _get_llm()
    execute_tool, get_tools_prompt_description, tool_registry = _get_tools()
    search_memory, auto_detect_and_save_facts = _get_memory()

    # Step A: Auto-detect explicit memory statements in the user prompt
    auto_detect_and_save_facts(user_message)

    # Step B: Semantically retrieve relevant memories for this prompt
    recalled_facts = search_memory(user_message, top_k=3)

    engine_info = get_active_engine_info()
    current_time_str = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
    
    tools_description = get_tools_prompt_description()

    system_prompt = f"""You are ORION, an elite AI Chief Operating Officer and executive academic assistant for Sriram Roshan.
Current Local Time: {current_time_str}.

You have direct access to tools that can execute actions in the user's workspace, search their uploaded documents, search the live web, or read their tasks.

{tools_description}

## INSTRUCTIONS & PROTOCOL:
1. When the user asks you to create, modify, schedule, search, or review something, use the appropriate tool.
2. To invoke a tool, respond with ONLY a single JSON code block in this exact format:
```json
{{
  "thought": "Brief reason why this action is necessary",
  "action": "<tool_name>",
  "params": {{ ... }}
}}
```
3. If no further tool is needed, or once you have received tool observations, provide your final concise, articulate, and helpful response directly to Sriram (without any JSON blocks).
4. Do not invent or hallucinate completed actions without calling the tool first. Always give short, precise, executive-level answers."""

    queued_actions: List[Dict[str, Any]] = []
    step_history: List[Dict[str, Any]] = []
    scratchpad: List[str] = []

    # Notify initial thinking event
    if on_event:
        await on_event("status", {"status": "thinking", "step": 1})

    for step in range(1, max_steps + 1):
        # Build prompt with conversation history and scratchpad
        context_parts = []
        if conversation_history:
            recent = conversation_history[-6:]
            hist_str = "\n".join([f"{m.get('role', 'user').capitalize()}: {m.get('content', '')}" for m in recent])
            context_parts.append(f"Conversation History:\n{hist_str}")

        # Inject Long-Term Memory
        if recalled_facts:
            facts_str = "\n".join([f"- {f}" for f in recalled_facts])
            context_parts.append(f"Recalled Long-Term Memories about Sriram:\n{facts_str}")

        # Inject Workspace Context
        if state_snapshot:
            ctx_summary = []
            if "activeMode" in state_snapshot:
                ctx_summary.append(f"Active Mode: {state_snapshot['activeMode']}")
            if "tasks" in state_snapshot:
                pending_tasks = [t for t in state_snapshot["tasks"] if t.get("status") != "completed"]
                ctx_summary.append(f"Pending Tasks Count: {len(pending_tasks)}")
                if pending_tasks:
                    top_tasks = [f"'{t.get('title')}' ({t.get('priority', 'Medium')})" for t in pending_tasks[:5]]
                    ctx_summary.append(f"Top Pending Tasks: {', '.join(top_tasks)}")
            if "exams" in state_snapshot and state_snapshot["exams"]:
                exam_summaries = [f"{e.get('title')} ({e.get('date', 'Upcoming')})" for e in state_snapshot["exams"][:3]]
                ctx_summary.append(f"Upcoming Exams: {', '.join(exam_summaries)}")
            if "courses" in state_snapshot and state_snapshot["courses"]:
                course_names = [c.get('name') or c.get('code') for c in state_snapshot["courses"][:5] if c.get('name') or c.get('code')]
                if course_names:
                    ctx_summary.append(f"Enrolled Courses: {', '.join(course_names)}")

            if ctx_summary:
                context_parts.append("Workspace Context:\n" + "\n".join(ctx_summary))

        if scratchpad:
            context_parts.append("Scratchpad & Tool Observations so far:\n" + "\n".join(scratchpad))

        context_parts.append(f"User Request: {user_message}")
        full_prompt = "\n\n".join(context_parts)

        # Generate response from hybrid router
        try:
            raw_reply = await generate_response(
                full_prompt,
                system_prompt=system_prompt,
                api_key=api_key,
                provider=provider
            )
        except Exception as e:
            logger.error("LLM generation error in ReAct loop: %s", e)
            return AgentRunResult(
                reply=f"I encountered an internal error while processing your request: {str(e)}",
                actions=queued_actions,
                steps=step_history,
                engine=engine_info.get("engine", "error")
            )

        # Parse for tool call
        action_dict = _extract_json_action(raw_reply)

        if not action_dict:
            # Model decided to respond directly with final answer
            step_history.append({"step": step, "type": "final_response", "content": raw_reply})
            return AgentRunResult(
                reply=raw_reply.strip(),
                actions=queued_actions,
                steps=step_history,
                engine=engine_info.get("engine", "active")
            )

        # Model requested an action
        action_name = action_dict.get("action", "").strip()
        params = action_dict.get("params", {})
        thought = action_dict.get("thought", "Executing requested action")

        step_history.append({
            "step": step,
            "type": "tool_call",
            "action": action_name,
            "params": params,
            "thought": thought
        })

        if on_event:
            status_desc = f"Executing {action_name}..."
            if action_name == "search_web":
                status_desc = "Searching the live web..."
            elif action_name == "search_documents":
                status_desc = "Searching your documents..."
            elif action_name in ["add_task", "create_plan"]:
                status_desc = "Updating your workspace..."
            await on_event("status", {"status": "tool_running", "action": action_name, "description": status_desc})

        # Execute the tool
        tool_res = execute_tool(action_name, params, state_snapshot=state_snapshot)

        if tool_res.is_ui_action and tool_res.ui_action_name:
            queued_actions.append({
                "action": tool_res.ui_action_name,
                "payload": tool_res.ui_payload
            })
            if on_event:
                await on_event("action_staged", {
                    "action": tool_res.ui_action_name,
                    "payload": tool_res.ui_payload
                })

        # Record observation in scratchpad
        observation_entry = f"Step {step} Thought: {thought}\nStep {step} Action: {action_name}({params})\nStep {step} Observation: {tool_res.output}"
        scratchpad.append(observation_entry)

    # If maximum steps reached, produce a synthesized final answer
    synth_prompt = (
        f"{user_message}\n\nTool actions taken:\n" + "\n".join(scratchpad) +
        "\n\nPlease provide a clear, executive confirmation and response summarizing what was done."
    )
    final_reply = await generate_response(
        synth_prompt,
        system_prompt="You are ORION. Provide a concise, polished response confirming what was accomplished for the user.",
        api_key=api_key,
        provider=provider
    )

    return AgentRunResult(
        reply=final_reply.strip(),
        actions=queued_actions,
        steps=step_history,
        engine=engine_info.get("engine", "active")
    )
