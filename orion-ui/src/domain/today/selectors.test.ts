// @ts-nocheck
import assert from "node:assert";
import { getTodaySchedule } from "./selectors";
import { Task, Exam, Assignment } from "../../store/useOrionStore";

// Mock Data
const currentTime = new Date("2026-08-30T12:00:00.000Z"); // fixed mid-day
const todayISO = "2026-08-30T12:00:00.000Z";
const pastISO = "2026-08-29T12:00:00.000Z";
const futureISO = "2026-08-31T12:00:00.000Z";

const mockTasks: Task[] = [
  // 1. Task due today (unscheduled)
  { id: "t1", title: "Task 1", status: "Pending", priority: "Low", dueDate: todayISO, documentIds: [], createdAt: pastISO, color: "red" },
  // 2. Task due today (past time)
  { id: "t2", title: "Task 2", status: "Pending", priority: "High", dueDate: todayISO, startTime: "2026-08-30T10:00:00.000Z", endTime: "2026-08-30T11:00:00.000Z", documentIds: [], createdAt: pastISO, color: "blue" },
  // 3. Task active right now
  { id: "t3", title: "Task 3", status: "In Progress", priority: "Critical", dueDate: todayISO, startTime: "2026-08-30T11:30:00.000Z", endTime: "2026-08-30T12:30:00.000Z", documentIds: [], createdAt: pastISO, color: "green" },
  // 4. Task completed today
  { id: "t4", title: "Task 4", status: "Completed", priority: "Medium", dueDate: todayISO, completedAt: todayISO, documentIds: [], createdAt: pastISO, color: "pink" },
  // 5. Task due tomorrow
  { id: "t5", title: "Task 5", status: "Pending", priority: "Medium", dueDate: futureISO, documentIds: [], createdAt: pastISO, color: "pink" },
];

const mockExams: Exam[] = [
  // 1. Exam upcoming today
  { id: "e1", title: "Exam 1", courseId: "c1", date: "2026-08-30T14:00:00.000Z", durationMinutes: 60, topics: [] }
];

const mockAssignments: Assignment[] = [
  // 1. Assignment due today
  { id: "a1", courseId: "c1", title: "Assignment 1", description: "", dueDate: todayISO, status: "Not Started", maxGrade: 100 }
];

function runTests() {
  console.log("Running Today Domain tests...");

  const schedule = getTodaySchedule({
    tasks: mockTasks,
    exams: mockExams,
    assignments: mockAssignments,
    currentTime
  });

  // Test: Today Tasks (t1, t2, t3) - completed and future excluded
  assert.strictEqual(schedule.todayTasks.length, 3, "Should find 3 uncompleted tasks due today");
  
  // Test: Completed Today (t4)
  assert.strictEqual(schedule.todayCompleted.length, 1, "Should find 1 completed task today");
  assert.strictEqual(schedule.todayCompleted[0].id, "t4");

  // Test: Today Exams (e1)
  assert.strictEqual(schedule.todayExams.length, 1, "Should find 1 exam today");

  // Test: Today Assignments (a1)
  assert.strictEqual(schedule.todayAssignments.length, 1, "Should find 1 assignment today");

  // Test: Priorities sorting (t3 Critical, t2 High, t1 Low)
  assert.strictEqual(schedule.priorities.length, 3, "Priorities should have 3 items");
  assert.strictEqual(schedule.priorities[0].id, "t3", "Highest priority first");
  assert.strictEqual(schedule.priorities[1].id, "t2", "Second priority");
  assert.strictEqual(schedule.priorities[2].id, "t1", "Lowest priority");

  // Test: Timeline Ordering (t2 at 10am, t3 at 11:30am, e1 at 2pm)
  assert.strictEqual(schedule.timelineItems.length, 3, "Timeline should have 3 items");
  assert.strictEqual(schedule.timelineItems[0].id, "t2");
  assert.strictEqual(schedule.timelineItems[1].id, "t3");
  assert.strictEqual(schedule.timelineItems[2].id, "e1");

  // Test: All Day Items (a1 assignment, t1 task without time)
  assert.strictEqual(schedule.allDayItems.length, 2, "Should have 2 all-day items");
  assert.ok(schedule.allDayItems.find(i => i.id === "a1"), "Contains assignment");
  assert.ok(schedule.allDayItems.find(i => i.id === "t1"), "Contains unscheduled task");

  // Test: NOW Item (currentTime 12:00 falls in t3 11:30-12:30)
  assert.ok(schedule.nowItem !== null, "NOW item should exist");
  assert.strictEqual(schedule.nowItem?.id, "t3", "Task 3 should be NOW");

  // Test: NEXT Item (since NOW exists, NEXT is null in the original logic fallback... wait, no. NEXT is null if NOW exists in current code? 
  // Let us re-read Workspace logic: `if (!currentNow && prioritiesList.length > 0) { currentNext = prioritiesList[0]; }` 
  // Yes! If NOW exists, NEXT is null!)
  assert.strictEqual(schedule.nextItem, null, "NEXT item should be null if NOW is populated");

  console.log("All tests passed successfully!");
}

runTests();

