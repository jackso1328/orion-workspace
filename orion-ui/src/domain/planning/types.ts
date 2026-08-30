/**
 * Planning Domain — Types
 *
 * A Plan represents a proposed or accepted schedule for existing Tasks.
 * Plans are strictly a planning layer — they NEVER mutate the underlying Task.
 *
 * Architecture:
 *   Domain Data (Tasks) → Today Selectors → Factual Schedule
 *   AI / User Intent   → Plan             → Proposed Schedule
 *
 * A Plan references Tasks by ID only. It never copies Task fields.
 */

/**
 * Lifecycle of a Plan:
 *   proposed  — created by the AI or user, not yet reviewed
 *   accepted  — user has reviewed and approved
 *   rejected  — user explicitly declined
 */
export type PlanStatus = 'proposed' | 'accepted' | 'rejected';

/**
 * A single scheduled work block inside a Plan.
 *
 * - taskId    : references an existing Task.id in the store
 * - startTime : ISO 8601 string (matches Task.startTime / Task.endTime convention)
 * - endTime   : ISO 8601 string
 *
 * The PlanItem does NOT copy any Task field other than the ID reference.
 * Changing a PlanItem does NOT modify the Task.
 */
export interface PlanItem {
  id: string;           // unique within the Plan; generated at creation time
  taskId: string;       // reference to Task.id — never a duplicated object
  startTime: string;    // ISO 8601 — planned start
  endTime: string;      // ISO 8601 — planned end (must be > startTime)
}

/**
 * A complete Plan — a proposed or accepted schedule composed of PlanItems.
 *
 * - id        : globally unique (uuid)
 * - items     : ordered list of planned work blocks
 * - status    : lifecycle state
 * - createdAt : ISO 8601 — when the plan was first generated
 */
export interface Plan {
  id: string;
  items: PlanItem[];
  status: PlanStatus;
  createdAt: string; // ISO 8601
}
