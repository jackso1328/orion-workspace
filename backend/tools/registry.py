"""
ORION - Tool Registry & Execution Layer
Defines all tools available to ORION AI with strict schemas and execution routing.
Handles both Backend Data Tools (search_web, search_documents) and Frontend UI Actions (addTask, addPlan, etc.).
"""
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger("orion.tools.registry")

# Lazy imports for backend tool handlers
def _get_web_search():
    try:
        from backend.tools.web_search import search_web
    except ImportError:
        try:
            from tools.web_search import search_web
        except ImportError:
            from web_search import search_web
    return search_web


def _get_document_search():
    try:
        from backend.documents import search_documents
    except ImportError:
        try:
            from documents import search_documents
        except ImportError:
            search_documents = None
    return search_documents


@dataclass
class ToolExecutionResult:
    tool_name: str
    output: str
    is_ui_action: bool = False
    ui_action_name: Optional[str] = None
    ui_payload: Optional[Dict[str, Any]] = None


# ============================================================
# TOOL REGISTRY DEFINITIONS
# ============================================================

TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    # ─── 1. TASKS ───────────────────────────────────────────────
    "add_task": {
        "type": "ui_action",
        "description": "Create a new task in the user's workspace task list.",
        "zustand_action": "addTask",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Clear, actionable title of the task."},
                "priority": {
                    "type": "string",
                    "enum": ["Critical", "High", "Medium", "Low"],
                    "description": "Task priority level (defaults to 'Medium')."
                },
                "dueDate": {
                    "type": "string",
                    "description": "ISO 8601 date string (e.g., '2026-10-13T17:00:00+05:30')."
                },
                "description": {"type": "string", "description": "Optional notes or details for the task."},
                "estimatedMinutes": {"type": "integer", "description": "Estimated time in minutes (default: 30)."},
                "documentIds": {"type": "array", "items": {"type": "string"}, "description": "Referenced document IDs."}
            },
            "required": ["title"]
        }
    },
    "update_task": {
        "type": "ui_action",
        "description": "Update an existing task's title, priority, due date, or description.",
        "zustand_action": "updateTask",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Unique identifier of the task."},
                "updates": {"type": "object", "description": "Fields to update (title, priority, dueDate, etc.)."}
            },
            "required": ["id", "updates"]
        }
    },
    "complete_task": {
        "type": "ui_action",
        "description": "Toggle or mark a task as completed.",
        "zustand_action": "toggleTaskCompletion",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Unique identifier of the task."}
            },
            "required": ["id"]
        }
    },
    "delete_task": {
        "type": "ui_action",
        "description": "Delete a task from the workspace permanently.",
        "zustand_action": "deleteTask",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Unique identifier of the task."}
            },
            "required": ["id"]
        }
    },

    # ─── 2. FLASHCARDS ──────────────────────────────────────────
    "add_flashcard": {
        "type": "ui_action",
        "description": "Create a new study flashcard with front question and back answer.",
        "zustand_action": "addFlashcard",
        "parameters": {
            "type": "object",
            "properties": {
                "deckId": {"type": "string", "description": "ID of target deck or 'general' if unspecified."},
                "front": {"type": "string", "description": "The question, concept, or prompt."},
                "back": {"type": "string", "description": "The detailed answer, explanation, or formula."}
            },
            "required": ["front", "back"]
        }
    },

    # ─── 3. STUDY PLANNER ───────────────────────────────────────
    "create_plan": {
        "type": "ui_action",
        "description": "Propose a structured study schedule with time-blocked focus sessions.",
        "zustand_action": "addPlan",
        "parameters": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "description": "List of planned time-blocked activities.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string", "description": "Activity name."},
                            "start": {"type": "string", "description": "Start time in ISO 8601 format."},
                            "end": {"type": "string", "description": "End time in ISO 8601 format."},
                            "type": {"type": "string", "enum": ["study", "break", "review", "exam"]}
                        },
                        "required": ["title", "start", "end"]
                    }
                }
            },
            "required": ["items"]
        }
    },

    # ─── 4. QUIZZES ─────────────────────────────────────────────
    "add_quiz": {
        "type": "ui_action",
        "description": "Create a multiple-choice quiz based on study material.",
        "zustand_action": "addQuiz",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Quiz title."},
                "courseId": {"type": "string", "description": "Optional associated course ID."},
                "questions": {
                    "type": "array",
                    "description": "List of quiz questions.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question": {"type": "string"},
                            "options": {"type": "array", "items": {"type": "string"}},
                            "correctOptionIndex": {"type": "integer"},
                            "explanation": {"type": "string"}
                        },
                        "required": ["question", "options", "correctOptionIndex"]
                    }
                }
            },
            "required": ["title", "questions"]
        }
    },

    # ─── 5. INFORMATION RETRIEVAL (BACKEND) ─────────────────────
    "search_documents": {
        "type": "data_tool",
        "description": "Search the user's uploaded library of documents (PDFs, notes, textbooks) using semantic embeddings.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search term or concept to look up in the document vault."},
                "top_k": {"type": "integer", "description": "Number of relevant text chunks to retrieve (default: 3)."}
            },
            "required": ["query"]
        }
    },
    "search_web": {
        "type": "data_tool",
        "description": "Search the live internet for recent news, academic information, current events, or documentation.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keywords or question."},
                "max_results": {"type": "integer", "description": "Max results to return (default: 3)."}
            },
            "required": ["query"]
        }
    },

    # ─── 6. STATE READERS ───────────────────────────────────────
    "get_tasks": {
        "type": "state_tool",
        "description": "Query the user's current tasks and to-dos from the application state.",
        "parameters": {
            "type": "object",
            "properties": {
                "filter": {
                    "type": "string",
                    "enum": ["all", "pending", "completed", "today", "high_priority"],
                    "description": "Filter criteria for tasks (defaults to 'pending')."
                }
            }
        }
    },

    # ─── 7. LONG-TERM MEMORY ────────────────────────────────────
    "remember_fact": {
        "type": "data_tool",
        "description": "Store an important personal fact, study preference, habit, or recurring detail about Sriram into long-term memory.",
        "parameters": {
            "type": "object",
            "properties": {
                "fact": {"type": "string", "description": "The exact fact or preference to remember."},
                "category": {
                    "type": "string",
                    "enum": ["preference", "academic", "schedule", "personal", "general"],
                    "description": "Category of the memory (default: 'preference')."
                }
            },
            "required": ["fact"]
        }
    }
}


# ============================================================
# SCHEMA EXPORTERS
# ============================================================

def get_openai_tools_schema() -> List[Dict[str, Any]]:
    """Generates standard OpenAI / Claude function calling schema list."""
    schemas = []
    for name, defn in TOOL_REGISTRY.items():
        schemas.append({
            "type": "function",
            "function": {
                "name": name,
                "description": defn["description"],
                "parameters": defn["parameters"]
            }
        })
    return schemas


def get_tools_prompt_description() -> str:
    """Generates a clear markdown reference for the ReAct System Prompt."""
    lines = ["## Available Tools:\n"]
    for name, defn in TOOL_REGISTRY.items():
        params = defn.get("parameters", {}).get("properties", {})
        req = defn.get("parameters", {}).get("required", [])
        param_strs = []
        for p_name, p_spec in params.items():
            is_req = " (required)" if p_name in req else ""
            p_type = p_spec.get("type", "any")
            param_strs.append(f"    - `{p_name}` ({p_type}{is_req}): {p_spec.get('description', '')}")

        lines.append(f"- **`{name}`**: {defn['description']}")
        if param_strs:
            lines.append("  Parameters:")
            lines.extend(param_strs)
        lines.append("")
    return "\n".join(lines)


# ============================================================
# TOOL EXECUTION ROUTER
# ============================================================

def execute_tool(
    tool_name: str,
    params: Dict[str, Any],
    state_snapshot: Optional[Dict[str, Any]] = None
) -> ToolExecutionResult:
    """
    Executes a requested tool call.
    - If a data tool, runs the backend logic and returns an observation.
    - If a state tool, queries the state snapshot and returns a summary.
    - If a UI action, validates and packages the STORE_ACTION for frontend dispatch.
    """
    if tool_name not in TOOL_REGISTRY:
        return ToolExecutionResult(
            tool_name=tool_name,
            output=f"Error: Unknown tool '{tool_name}'."
        )

    tool_def = TOOL_REGISTRY[tool_name]
    tool_type = tool_def["type"]

    try:
        # --- 1. DATA TOOLS ---
        if tool_name == "search_web":
            search_fn = _get_web_search()
            query = params.get("query", "")
            max_results = int(params.get("max_results", 3))
            output = search_fn(query, max_results=max_results)
            return ToolExecutionResult(tool_name=tool_name, output=output)

        elif tool_name == "search_documents":
            doc_fn = _get_document_search()
            if not doc_fn:
                return ToolExecutionResult(tool_name=tool_name, output="Document search service is not loaded.")
            query = params.get("query", "")
            top_k = int(params.get("top_k", 3))
            chunks = doc_fn(query, top_k=top_k)
            if not chunks:
                output = f"No relevant content found in documents for query: '{query}'."
            else:
                output = f"Found {len(chunks)} relevant document sections:\n\n" + "\n\n---\n\n".join(chunks)
            return ToolExecutionResult(tool_name=tool_name, output=output)

        elif tool_name == "remember_fact":
            try:
                from backend.memory import save_memory
            except ImportError:
                from memory import save_memory
            fact = params.get("fact", "")
            cat = params.get("category", "preference")
            m_id = save_memory(fact, category=cat)
            return ToolExecutionResult(
                tool_name=tool_name,
                output=f"Stored in long-term memory: '{fact}' (ID: {m_id})"
            )

        # --- 2. STATE TOOLS ---
        elif tool_name == "get_tasks":
            tasks = (state_snapshot or {}).get("tasks", [])
            filt = params.get("filter", "pending").lower()
            if not tasks:
                return ToolExecutionResult(tool_name=tool_name, output="No tasks currently exist in the user's workspace.")

            if filt == "completed":
                filtered = [t for t in tasks if t.get("status") == "completed"]
            elif filt == "pending":
                filtered = [t for t in tasks if t.get("status") != "completed"]
            elif filt == "high_priority":
                filtered = [t for t in tasks if t.get("priority") in ["High", "Critical"] and t.get("status") != "completed"]
            else:
                filtered = tasks

            summary_lines = [f"- [{t.get('priority', 'Medium')}] {t.get('title', 'Untitled')} (ID: {t.get('id')})" for t in filtered[:10]]
            return ToolExecutionResult(
                tool_name=tool_name,
                output=f"User Tasks ({filt}, total: {len(filtered)}):\n" + "\n".join(summary_lines)
            )

        # --- 3. UI ACTIONS ---
        elif tool_type == "ui_action":
            action_name = tool_def["zustand_action"]

            # Normalize parameters
            payload = dict(params)
            if tool_name == "add_task":
                # Ensure priority is normalized
                prio = payload.get("priority", "Medium")
                if prio not in ["Low", "Medium", "High", "Critical"]:
                    payload["priority"] = "Medium"
                if "estimatedMinutes" in payload:
                    payload["estimatedMinutes"] = int(payload["estimatedMinutes"])

            elif tool_name == "add_flashcard":
                if not payload.get("deckId"):
                    payload["deckId"] = "general"

            return ToolExecutionResult(
                tool_name=tool_name,
                output=f"Successfully staged action '{action_name}' for UI execution.",
                is_ui_action=True,
                ui_action_name=action_name,
                ui_payload=payload
            )

    except Exception as e:
        logger.exception("Error executing tool %s: %s", tool_name, e)
        return ToolExecutionResult(
            tool_name=tool_name,
            output=f"Error executing tool '{tool_name}': {str(e)}"
        )

    return ToolExecutionResult(tool_name=tool_name, output=f"Unhandled tool type: {tool_type}")
