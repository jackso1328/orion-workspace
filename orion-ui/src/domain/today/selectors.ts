import { isSameDay, parseISO, addMinutes } from "date-fns";
import { Task, Exam, Assignment } from "../../store/useOrionStore";
import { TodayContext, TodayScheduleState, TimelineItem, AllDayItem } from "./types";

const PRIORITY_WEIGHT: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function getTodayTasks(tasks: Task[], currentTime: Date): Task[] {
  return tasks.filter(t => t.status !== "Completed" && t.dueDate && isSameDay(parseISO(t.dueDate), currentTime));
}

export function getCompletedTodayTasks(tasks: Task[], currentTime: Date): Task[] {
  return tasks.filter(t => t.status === "Completed" && t.completedAt && isSameDay(parseISO(t.completedAt), currentTime));
}

export function getTodayExams(exams: Exam[], currentTime: Date): Exam[] {
  return exams.filter(e => e.date && isSameDay(parseISO(e.date), currentTime));
}

export function getTodayAssignments(assignments: Assignment[], currentTime: Date): Assignment[] {
  return assignments.filter(a => a.dueDate && isSameDay(parseISO(a.dueDate), currentTime));
}

export function getPriorities(uncompletedDueToday: Task[]): Task[] {
  return [...uncompletedDueToday].sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
}

export function getTimelineItems(uncompletedDueToday: Task[], todayExams: Exam[]): TimelineItem[] {
  const timedItems: TimelineItem[] = [];

  uncompletedDueToday.forEach(t => {
    if (t.startTime && t.endTime) {
      timedItems.push({
        id: t.id,
        type: "task",
        title: t.title,
        start: parseISO(t.startTime),
        end: parseISO(t.endTime),
        color: t.color
      });
    }
  });

  todayExams.forEach(e => {
    if (e.date && e.durationMinutes) {
      const start = parseISO(e.date);
      timedItems.push({
        id: e.id,
        type: "exam",
        title: e.title,
        start,
        end: addMinutes(start, e.durationMinutes),
        color: "#f43f5e"
      });
    }
  });

  timedItems.sort((a, b) => a.start.getTime() - b.start.getTime());
  return timedItems;
}

export function getAllDayItems(todayAssignments: Assignment[], uncompletedDueToday: Task[]): AllDayItem[] {
  const allDayItemsList: AllDayItem[] = [];
  
  todayAssignments.forEach(a => {
    allDayItemsList.push({ id: a.id, type: "assignment", title: a.title });
  });
  
  uncompletedDueToday.forEach(t => {
    if (!t.startTime) {
      allDayItemsList.push({ id: t.id, type: "task", title: t.title });
    }
  });

  return allDayItemsList;
}

export function getNowItem(timelineItems: TimelineItem[], currentTime: Date): TimelineItem | null {
  for (const item of timelineItems) {
    if (currentTime >= item.start && currentTime <= item.end) {
      return item;
    }
  }
  return null;
}

export function getNextItem(currentNow: TimelineItem | null, priorities: Task[]): Task | null {
  if (!currentNow && priorities.length > 0) {
    return priorities[0];
  }
  return null;
}

export function getTodaySchedule(context: TodayContext): TodayScheduleState {
  const todayTasks = getTodayTasks(context.tasks, context.currentTime);
  const todayCompleted = getCompletedTodayTasks(context.tasks, context.currentTime);
  const todayExams = getTodayExams(context.exams, context.currentTime);
  const todayAssignments = getTodayAssignments(context.assignments, context.currentTime);
  
  const priorities = getPriorities(todayTasks);
  const timelineItems = getTimelineItems(todayTasks, todayExams);
  const allDayItems = getAllDayItems(todayAssignments, todayTasks);
  
  const nowItem = getNowItem(timelineItems, context.currentTime);
  const nextItem = getNextItem(nowItem, priorities);

  return {
    todayTasks,
    todayCompleted,
    todayExams,
    todayAssignments,
    priorities,
    nowItem,
    nextItem,
    timelineItems,
    allDayItems
  };
}
