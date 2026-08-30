import { Task } from '../../store/useOrionStore';
import { PlanItem } from './types';
import { validatePlanItems } from './validation';

/**
 * AI Input Contract
 * Minimal factual context provided to the LLM to generate a plan.
 */
export interface PlanningContext {
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string;
    estimatedMinutes?: number;
    startTime?: string;
    endTime?: string;
  }>;
  currentTime: string; // ISO 8601
  timeZone: string;
  activeModeContext?: string;
}

/**
 * AI Output Contract
 * The exact JSON schema we expect the LLM to return.
 */
export interface StructuredProposal {
  items: Array<{
    taskId: string;
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
  }>;
}

/**
 * Validates untrusted LLM output and converts it to the format required by addPlan().
 * Uses the existing validatePlanItems logic to ensure task ID mapping and temporal validity.
 */
export function validateAIProposal(untrustedOutput: any, tasks: Task[]): Omit<PlanItem, 'id'>[] {
  if (!untrustedOutput || typeof untrustedOutput !== 'object') {
    throw new Error('AI Provider returned malformed output: not an object');
  }

  if (!Array.isArray(untrustedOutput.items)) {
    throw new Error('AI Provider returned malformed output: items is not an array');
  }

  // Map to the internal PlanItem format without 'id'
  const items = untrustedOutput.items.map((item: any) => ({
    taskId: item.taskId,
    startTime: item.startTime,
    endTime: item.endTime
  }));

  // Rely on existing robust domain validation
  validatePlanItems(items, tasks);

  return items;
}

/**
 * Provider-Neutral Planning Boundary
 * This function orchestrates the prompt creation and calling of the actual provider.
 * Currently throws because no secure credential infrastructure exists.
 */
export async function generatePlanProposal(_context: PlanningContext, _allTasks: Task[]): Promise<Omit<PlanItem, 'id'>[]> {
  throw new Error("SECURE AI BOUNDARY REQUIRED: No credential infrastructure exists for live provider calls.");
}

