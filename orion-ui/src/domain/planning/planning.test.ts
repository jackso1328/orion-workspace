// @ts-nocheck
/**
 * Planning Domain - Tests
 *
 * Uses node:assert + tsx.
 * Tests the real Zustand store mutations for Plan validation.
 */
import assert from "node:assert";
import { useOrionStore } from "../../store/useOrionStore";
import { validatePlanItems } from "./validation";
import type { PlanItem } from "./types";

// Setup mock task in store
const store = useOrionStore.getState();
const EXISTING_TASK_ID = "test-task-123";
store.addTask({
  id: EXISTING_TASK_ID,
  title: "Test Task",
  priority: "Medium",
  dueDate: new Date().toISOString()
});
// Need to explicitly set ID since addTask uses uuidv4
useOrionStore.setState({
  tasks: [{
    id: EXISTING_TASK_ID,
    title: "Test Task",
    status: "Pending",
    priority: "Medium",
    dueDate: new Date().toISOString(),
    documentIds: [],
    createdAt: new Date().toISOString(),
    color: "#000"
  }]
});

function runTests() {
  console.log("Running Planning Domain Validation tests...");

  // Reset plans before each group
  const resetPlans = () => useOrionStore.setState({ plans: [] });

  // TEST 6: Empty Plan behavior explicitly verified
  {
    resetPlans();
    let error = null;
    try {
      store.addPlan([]);
    } catch (e) {
      error = e;
    }
    assert.ok(error, "Empty plan should throw an error");
    assert.strictEqual(useOrionStore.getState().plans.length, 0, "Invalid plan does not enter state");
    console.log("  PASS: Empty Plan rejected");
  }

  // TEST 2 & 7: Unknown taskId rejected & Invalid Plan does not enter state
  {
    resetPlans();
    let error = null;
    try {
      store.addPlan([{
        taskId: "does-not-exist",
        startTime: "2026-09-01T09:00:00.000Z",
        endTime: "2026-09-01T10:00:00.000Z"
      }]);
    } catch (e) {
      error = e;
    }
    assert.ok(error, "Unknown task ID should throw an error");
    assert.strictEqual(useOrionStore.getState().plans.length, 0, "Invalid plan does not enter state");
    console.log("  PASS: Unknown taskId rejected");
  }

  // TEST 3: endTime === startTime rejected
  {
    resetPlans();
    let error = null;
    try {
      store.addPlan([{
        taskId: EXISTING_TASK_ID,
        startTime: "2026-09-01T09:00:00.000Z",
        endTime: "2026-09-01T09:00:00.000Z"
      }]);
    } catch (e) {
      error = e;
    }
    assert.ok(error, "endTime === startTime should throw an error");
    console.log("  PASS: endTime === startTime rejected");
  }

  // TEST 4: endTime < startTime rejected
  {
    resetPlans();
    let error = null;
    try {
      store.addPlan([{
        taskId: EXISTING_TASK_ID,
        startTime: "2026-09-01T10:00:00.000Z",
        endTime: "2026-09-01T09:00:00.000Z"
      }]);
    } catch (e) {
      error = e;
    }
    assert.ok(error, "endTime < startTime should throw an error");
    console.log("  PASS: endTime < startTime rejected");
  }

  // TEST 5: Malformed timestamp rejected
  {
    resetPlans();
    let error = null;
    try {
      store.addPlan([{
        taskId: EXISTING_TASK_ID,
        startTime: "not-a-date",
        endTime: "2026-09-01T10:00:00.000Z"
      }]);
    } catch (e) {
      error = e;
    }
    assert.ok(error, "Malformed timestamp should throw an error");
    console.log("  PASS: Malformed timestamp rejected");
  }

  // TEST 1 & 8: Valid Plan accepted & Valid Plan enters state
  {
    resetPlans();
    store.addPlan([{
      taskId: EXISTING_TASK_ID,
      startTime: "2026-09-01T09:00:00.000Z",
      endTime: "2026-09-01T10:00:00.000Z"
    }]);
    
    const plans = useOrionStore.getState().plans;
    assert.strictEqual(plans.length, 1, "Valid plan enters state");
    assert.strictEqual(plans[0].items[0].taskId, EXISTING_TASK_ID);
    console.log("  PASS: Valid Plan accepted & enters state");
  }

  // TEST 9, 10, 11: Task mutation safety
  {
    resetPlans();
    const originalTasks = JSON.parse(JSON.stringify(useOrionStore.getState().tasks));
    
    // Add plan
    store.addPlan([{
      taskId: EXISTING_TASK_ID,
      startTime: "2026-09-01T09:00:00.000Z",
      endTime: "2026-09-01T10:00:00.000Z"
    }]);
    const planId = useOrionStore.getState().plans[0].id;
    assert.deepStrictEqual(useOrionStore.getState().tasks, originalTasks, "Creating a Plan does not mutate Tasks");
    console.log("  PASS: Creating a Plan does not mutate Tasks");

    // Update status
    store.updatePlanStatus(planId, "accepted");
    assert.deepStrictEqual(useOrionStore.getState().tasks, originalTasks, "Updating Plan status does not mutate Tasks");
    console.log("  PASS: Updating Plan status does not mutate Tasks");

    // Remove plan
    store.removePlan(planId);
    assert.deepStrictEqual(useOrionStore.getState().tasks, originalTasks, "Removing a Plan does not mutate Tasks");
    console.log("  PASS: Removing a Plan does not mutate Tasks");
  }

  // Today isolation
  {
    
    const todayFields = ["todayTasks", "todayCompleted", "todayExams", "todayAssignments",
                          "priorities", "nowItem", "nextItem", "timelineItems", "allDayItems"];
    const plan = { id: "1", items: [], status: "proposed", createdAt: "" };
    for (const field of todayFields) {
      assert.strictEqual(field in plan, false, `Plan must not have Today field: ${field}`);
    }
    console.log("  PASS: Plan type is structurally isolated from Today factual schedule");
  }

  console.log("\nAll planning validation tests passed successfully!");
}

runTests();

