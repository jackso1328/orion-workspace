import { Task, Exam, Assignment } from "../../store/useOrionStore";

export type TimelineItemType = 'task' | 'exam';
export type AllDayItemType = 'assignment' | 'task';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  start: Date;
  end: Date;
  color?: string;
}

export interface AllDayItem {
  id: string;
  type: AllDayItemType;
  title: string;
}

export interface TodayScheduleState {
  todayTasks: Task[];
  todayCompleted: Task[];
  todayExams: Exam[];
  todayAssignments: Assignment[];
  priorities: Task[];
  nowItem: TimelineItem | null;
  nextItem: Task | null;
  timelineItems: TimelineItem[];
  allDayItems: AllDayItem[];
}

export interface TodayContext {
  tasks: Task[];
  exams: Exam[];
  assignments: Assignment[];
  currentTime: Date;
}

