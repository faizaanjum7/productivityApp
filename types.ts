// FIX: Removed self-import of 'Subtask' which caused a declaration conflict.
export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  subtasks: Subtask[];
  duration: number; // Quota in minutes OR number of pomodoros
  plannedStartTime?: string; // e.g., "09:00" for Timeflow
  actualDuration: number; // ALWAYS in minutes
  environmentId?: string;
  actualPomodoros: number; // Number of pomodoros completed
  isProcessing?: boolean; // Flag to show loading state for tasks being processed
}

export interface Routine {
  id:string;
  name: string;
  tasks: Pick<Task, 'text'>[];
}

export interface Resource {
    id: string;
    title: string;
    type: 'link' | 'text';
    content: string;
}

export interface Environment {
    id: string;
    name: string;
    color: string; // hex code
    tasks: Task[];
    resources: Resource[];
}

export interface DailyPlan {
    date: string; // YYYY-MM-DD
    mode: 'Timeflow' | 'Quota';
    unit: 'minutes' | 'pomodoros';
    tasks: Task[];
    completedPomodoros: number; // Number of pomodoros completed today
}

export interface SessionLog {
    id: string;
    taskId: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    duration: number; // in minutes
}

export interface PomodoroSession {
    id: string;
    date: string; // ISO string
    duration: number; // in minutes
    taskId?: string; // Link session to a specific task
    taskText?: string; // The name of the task for learning purposes
}

export interface User {
  name: string;
  themeColor: string;
  environments: Environment[];
  activeEnvironmentId: string | null;
  routines: Routine[];
  pomodoroHistory: PomodoroSession[];
  sessionLogs: SessionLog[];
  praisePhrases: string[];
}