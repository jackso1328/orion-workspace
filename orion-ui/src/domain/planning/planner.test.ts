// @ts-nocheck
import assert from "node:assert";
import { validateAIProposal } from "./planner";

const MOCK_TASKS = [
  { id: 'task-1', title: 'Task 1', priority: 'High', color: '#ff0000', status: 'To Do', documentIds: [] },
  { id: 'task-2', title: 'Task 2', priority: 'Medium', color: '#00ff00', status: 'To Do', documentIds: [] }
];

function runTests() {
  console.log("Running AI Planning Boundary tests...");

  // Valid proposal
  {
    const validProposal = {
      items: [
        { taskId: 'task-1', startTime: '2026-08-30T10:00:00Z', endTime: '2026-08-30T11:00:00Z' }
      ]
    };
    const result = validateAIProposal(validProposal, MOCK_TASKS);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].taskId, 'task-1');
    console.log("  PASS: Valid proposal becomes a Plan (validateAIProposal works)");
  }

  // Invalid task ID
  {
    const invalidProposal = {
      items: [
        { taskId: 'invalid-task', startTime: '2026-08-30T10:00:00Z', endTime: '2026-08-30T11:00:00Z' }
      ]
    };
    assert.throws(() => validateAIProposal(invalidProposal, MOCK_TASKS), /invalid-task/);
    console.log("  PASS: Invalid task ID is rejected");
  }

  // Malformed timestamp
  {
    const invalidProposal = {
      items: [
        { taskId: 'task-1', startTime: 'not-a-date', endTime: '2026-08-30T11:00:00Z' }
      ]
    };
    assert.throws(() => validateAIProposal(invalidProposal, MOCK_TASKS), /not-a-date/);
    console.log("  PASS: Malformed timestamp is rejected");
  }

  // endTime <= startTime
  {
    const invalidProposal = {
      items: [
        { taskId: 'task-1', startTime: '2026-08-30T11:00:00Z', endTime: '2026-08-30T10:00:00Z' }
      ]
    };
    assert.throws(() => validateAIProposal(invalidProposal, MOCK_TASKS), /strictly after startTime/);
    console.log("  PASS: endTime <= startTime is rejected");
  }

  // Empty proposal
  {
    const emptyProposal = { items: [] };
    assert.throws(() => validateAIProposal(emptyProposal, MOCK_TASKS), /contain at least one item/);
    console.log("  PASS: Empty proposal is rejected");
  }

  // Malformed provider output
  {
    assert.throws(() => validateAIProposal(null, MOCK_TASKS), /not an object/);
    assert.throws(() => validateAIProposal("plan", MOCK_TASKS), /not an object/);
    assert.throws(() => validateAIProposal({}, MOCK_TASKS), /items is not an array/);
    console.log("  PASS: Malformed provider output is rejected");
  }

  console.log("\nAll AI Planning Boundary tests passed successfully!");
}

runTests();
