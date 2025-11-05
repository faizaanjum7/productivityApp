import { Routine, User } from './types';

export const THEME_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
];

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'routine-1',
    name: 'Morning Ritual',
    tasks: [
      { text: '10-minute meditation' },
      { text: 'Write daily affirmations' },
      { text: "Review the day's plan" },
    ],
  },
  {
    id: 'routine-2',
    name: 'Deep Work Block',
    tasks: [
      { text: 'Turn off phone notifications' },
      { text: 'Set a focus timer for 50 minutes' },
      { text: 'Work on a high-priority task' },
    ],
  },
  {
    id: 'routine-3',
    name: 'Evening Wind-Down',
    tasks: [
      { text: 'Tidy up workspace' },
      { text: "Plan tomorrow's top 3 priorities" },
      { text: 'Read for 15 minutes' },
    ],
  },
];

export const DEFAULT_USER: Omit<User, 'name'> = {
    themeColor: THEME_COLORS[0],
    praisePhrases: [
        "Great progress today!",
        "You're building amazing momentum.",
        "Look at all you've accomplished!"
    ],
    pomodoroHistory: [],
    routines: INITIAL_ROUTINES,
    // FIX: Added missing sessionLogs property to satisfy the User type.
    sessionLogs: [],
    activeEnvironmentId: 'env-1',
    environments: [
        {
            id: 'env-1',
            name: 'Academics',
            color: '#3b82f6',
            tasks: [],
            resources: []
        },
        {
            id: 'env-2',
            name: 'Health',
            color: '#10b981',
            tasks: [],
            resources: []
        },
        {
            id: 'env-3',
            name: 'Projects',
            color: '#8b5cf6',
            tasks: [],
            resources: []
        }
    ]
};

export const FOCUS_TIME = 25 * 60;
export const SHORT_BREAK_TIME = 5 * 60;
export const LONG_BREAK_TIME = 15 * 60;
