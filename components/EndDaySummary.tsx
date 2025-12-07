import React, { useMemo, useState } from 'react';
import { User, DailyPlan, PomodoroSession, Task } from '../types';
import { CloseIcon, ChartBarIcon, ClockIcon, CheckCircleIcon } from './icons';

interface EndDaySummaryProps {
  user: User;
  onClose: () => void;
  dailyPlan?: DailyPlan | null;
}

type TimeRange = 'today' | 'week' | 'month';

const getTimeRangeDates = (range: TimeRange) => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  if (range === 'today') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { start: today, end: tomorrow };
  } else if (range === 'week') {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  } else { 
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
};

const formatRangeLabel = (range: TimeRange) => {
  const now = new Date();
  if (range === 'today') return 'Today';
  if (range === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    return 'This Week';
  }
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now) + ' ' + now.getFullYear();
};

const EndDaySummary: React.FC<EndDaySummaryProps> = ({ user, onClose, dailyPlan }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  
  const summary = useMemo(() => {
    const { start: startDate, end: endDate } = getTimeRangeDates(timeRange);
    const startIso = startDate.toISOString().split('T')[0];
    const endIso = endDate.toISOString().split('T')[0];

    // Get all completed tasks from all environments
    const allCompletedTasks: Task[] = [];
    
    // Get completed tasks from environments
    user.environments.forEach(env => {
      env.tasks.forEach(task => {
        if (task.completed) {
          allCompletedTasks.push({ ...task, environmentId: env.id });
        }
      });
    });

    // Get completed tasks from daily plans (if any)
    if (dailyPlan?.tasks) {
      dailyPlan.tasks.forEach(task => {
        if (task.completed && !allCompletedTasks.some(t => t.id === task.id)) {
          allCompletedTasks.push(task);
        }
      });
    }

    // Filter tasks by date range
    const filteredTasks = allCompletedTasks.filter(task => {
      // For tasks without a completion date, we'll include them in today's count
      if (timeRange === 'today') return true;
      
      // If we had completion dates, we would filter them here
      // For now, we'll include all completed tasks in the weekly/monthly view
      return true;
    });

    // Calculate focus time from pomodoro sessions
    const focusTime = user.pomodoroHistory
      .filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startDate && sessionDate < endDate;
      })
      .reduce((total, session) => total + session.duration, 0);

    // Calculate total estimated time for completed tasks
    const estimatedTime = filteredTasks.reduce(
      (total, task) => total + (task.duration || 0), 0
    );

    // Calculate actual time spent from session logs
    const actualTime = user.sessionLogs
      .filter(log => {
        const logDate = new Date(log.startTime);
        return logDate >= startDate && logDate < endDate;
      })
      .reduce((total, log) => total + log.duration, 0);

    const randomPraise = user.praisePhrases[Math.floor(Math.random() * user.praisePhrases.length)];

    return { 
      tasksCompleted: filteredTasks.length, 
      focusTime, 
      estimatedTime,
      actualTime,
      randomPraise 
    };
  }, [user, dailyPlan, timeRange]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 relative animate-modal-in" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <CloseIcon />
        </button>
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {formatRangeLabel(timeRange)} Summary
          </h2>
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range 
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
          {summary.randomPraise}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: `${user.themeColor}20` }}>
              <CheckCircleIcon className="w-6 h-6" style={{ color: user.themeColor }} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.tasksCompleted}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: `${user.themeColor}20` }}>
              <ClockIcon className="w-6 h-6" style={{ color: user.themeColor }} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatTime(summary.focusTime)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Focused</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-6">
          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Time Analysis
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Estimated</span>
                <span className="font-medium">{formatTime(summary.estimatedTime)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (summary.estimatedTime / Math.max(summary.estimatedTime, 1)) * 100)}%`,
                    backgroundColor: user.themeColor
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Actual</span>
                <span className="font-medium">{formatTime(summary.actualTime)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (summary.actualTime / Math.max(summary.estimatedTime, 1)) * 100)}%`,
                    backgroundColor: user.themeColor
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-2.5 font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: user.themeColor }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default EndDaySummary;
