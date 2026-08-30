import { Task } from '../../store/useOrionStore';
import { PlanItem } from './types';

/**
 * Validates a proposed list of plan items against the current task state.
 * Throws an Error if the plan is invalid.
 * 
 * Invariants enforced:
 * - The plan must not be empty.
 * - Every taskId must reference an existing Task.
 * - startTime and endTime must be valid ISO 8601 strings.
 * - endTime must be strictly after startTime.
 */
export function validatePlanItems(items: Omit<PlanItem, 'id'>[], tasks: Task[]): void {
  if (!items || items.length === 0) {
    throw new Error('Plan must contain at least one item.');
  }

  const taskIds = new Set(tasks.map(t => t.id));

  for (const item of items) {
    if (!taskIds.has(item.taskId)) {
      throw new Error(`Invalid PlanItem: taskId '${item.taskId}' does not exist.`);
    }

    const start = new Date(item.startTime);
    const end = new Date(item.endTime);

    if (isNaN(start.getTime())) {
      throw new Error(`Invalid PlanItem: startTime '${item.startTime}' is not a valid date.`);
    }
    if (isNaN(end.getTime())) {
      throw new Error(`Invalid PlanItem: endTime '${item.endTime}' is not a valid date.`);
    }

    if (end <= start) {
      throw new Error(`Invalid PlanItem: endTime must be strictly after startTime.`);
    }
  }
}
