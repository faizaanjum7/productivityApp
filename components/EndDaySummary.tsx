import React, { useMemo, useState, useRef, useEffect } from 'react';
import { User, DailyPlan, PomodoroSession, Task } from '../types';
import { CloseIcon, ChartBarIcon, ClockIcon, CheckCircleIcon, CoffeeIcon } from './icons';

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
  const [isMounted, setIsMounted] = useState(false);
  
  // Track previous values to prevent unnecessary recalculations
  const prevDeps = useRef<{user: User | null, dailyPlan: DailyPlan | null | undefined, timeRange: TimeRange}>({
    user: null,
    dailyPlan: null,
    timeRange: 'today'
  });
  
  const [currentSummary, setCurrentSummary] = useState(() => ({
    tasksCompleted: 0,
    focusTime: 0,
    completedPomodoros: 0,
    estimatedPomodoros: 0,
    estimatedTimeMinutes: 0,
    actualPomodoros: 0,
    actualTimeMinutes: 0,
    randomPraise: 'Keep up the good work!',
    actualTime: 0,
    estimatedTime: 0
  }));

  useEffect(() => {
    // Skip calculation on initial render
    if (!isMounted) {
      setIsMounted(true);
      return;
    }
    
    // Check if dependencies have actually changed
    if (
      prevDeps.current.user === user && 
      prevDeps.current.dailyPlan === dailyPlan && 
      prevDeps.current.timeRange === timeRange
    ) {
      return; // Skip if no changes
    }
    
    // Update previous dependencies
    prevDeps.current = { user, dailyPlan, timeRange };
    
    // Calculate the summary
    const calculateSummary = () => {
      const { start: startDate, end: endDate } = getTimeRangeDates(timeRange);
    const startIso = startDate.toISOString().split('T')[0];
    const endIso = endDate.toISOString().split('T')[0];

    // Get all completed tasks from all environments
    const allCompletedTasks: Task[] = [];
    
    // Get completed tasks from environments
    user.environments.forEach(env => {
      env.tasks.forEach(task => {
        if (task.completed) {
          allCompletedTasks.push({ 
            ...task, 
            environmentId: env.id,
            // Ensure all required task properties have default values
            subtasks: task.subtasks || [],
            actualPomodoros: task.actualPomodoros || 0,
            actualDuration: task.actualDuration || 0,
            duration: task.duration || 0
          });
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

    // Calculate focus time and completed pomodoros from pomodoro sessions
    let totalFocusTime = 0;
    let completedPomodoros = 0;
    
    user.pomodoroHistory.forEach(session => {
      const sessionDate = new Date(session.date);
      if (sessionDate >= startDate && sessionDate < endDate) {
        totalFocusTime += session.duration;
        completedPomodoros++;
      }
    });

    // Add any additional focus time from the current session if it's today
    if (timeRange === 'today' && dailyPlan?.completedPomodoros) {
      const alreadyCountedPomodoros = user.pomodoroHistory.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startDate && sessionDate < endDate;
      }).length;
      
      const additionalPomodoros = dailyPlan.completedPomodoros - alreadyCountedPomodoros;
      if (additionalPomodoros > 0) {
        completedPomodoros += additionalPomodoros;
        totalFocusTime += additionalPomodoros * 25; // 25 minutes per pomodoro
      }
    }

    // Calculate total estimated and actual time in pomodoros and minutes for completed tasks only
    const completedTasks = filteredTasks.filter(task => task.completed);
    
    // For each completed task, log its details for debugging
    console.log('Completed tasks analysis:');
    completedTasks.forEach(task => {
      console.log(`Task: ${task.text}`);
      console.log(`- Duration: ${task.duration} ${dailyPlan?.unit === 'pomodoros' ? 'pomodoros' : 'mins'}`);
      console.log(`- Actual pomodoros: ${task.actualPomodoros}`);
    });
    
    // Calculate total estimated pomodoros (sum of estimated pomodoros for completed tasks)
    const estimatedPomodoros = completedTasks.reduce(
      (total, task) => {
        // If the daily plan uses pomodoros as unit, use duration directly as pomodoros
        // Otherwise, convert minutes to pomodoros (25 min per pomodoro)
        const taskEstimatedPomodoros = dailyPlan?.unit === 'pomodoros' 
          ? task.duration 
          : Math.ceil((task.duration || 0) / 25);
          
        console.log(`Task estimated pomodoros: ${taskEstimatedPomodoros} (${dailyPlan?.unit === 'pomodoros' ? 'direct' : 'converted from ' + task.duration + ' mins'})`);
        return total + (taskEstimatedPomodoros || 0);
      }, 
      0
    );
    
    // Calculate total actual pomodoros used (sum of actualPomodoros for completed tasks)
    const actualPomodoros = completedTasks.reduce(
      (total, task) => {
        console.log(`Task actual pomodoros: ${task.actualPomodoros} for task: ${task.text}`);
        return total + (task.actualPomodoros || 0);
      }, 
      0
    );
    
    console.log(`Total estimated pomodoros: ${estimatedPomodoros}`);
    console.log(`Total actual pomodoros: ${actualPomodoros}`);
    
    // Convert to minutes for display
    const estimatedTimeMinutes = estimatedPomodoros * 25;
    const actualTimeMinutes = actualPomodoros * 25;

    // Calculate total focus time (from pomodoro history + current session)
    const totalFocusTimeMinutes = completedPomodoros * 25;

    const defaultPraise = 'Great job today! 🎉';
    const randomPraise = user.praisePhrases && user.praisePhrases.length > 0 
      ? user.praisePhrases[Math.floor(Math.random() * user.praisePhrases.length)]
      : defaultPraise;

      setCurrentSummary({ 
        tasksCompleted: filteredTasks.length, 
        focusTime: totalFocusTimeMinutes,
        completedPomodoros,
        estimatedPomodoros,
        estimatedTimeMinutes,
        actualPomodoros,
        actualTimeMinutes,
        randomPraise,
        actualTime: actualTimeMinutes,
        estimatedTime: estimatedTimeMinutes
      });
    };

    // Use requestAnimationFrame for better performance
    const frameId = requestAnimationFrame(calculateSummary);
    return () => cancelAnimationFrame(frameId);
  }, [user, dailyPlan, timeRange, isMounted]);

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

        <p className="text-gray-500 dark:text-gray-400 text-center mb-6 animate-pulse">
          {currentSummary.randomPraise}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: `${user.themeColor}20` }}>
              <CheckCircleIcon className="w-6 h-6" color={user.themeColor} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentSummary.tasksCompleted}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tasks</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: `${user.themeColor}20` }}>
              <ClockIcon className="w-6 h-6" color={user.themeColor} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentSummary.completedPomodoros}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentSummary.completedPomodoros === 1 ? 'Pomodoro' : 'Pomodoros'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: `${user.themeColor}20` }}>
              <CoffeeIcon className="w-6 h-6" color={user.themeColor} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatTime(currentSummary.focusTime)}
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
                <span className="text-gray-600 dark:text-gray-400">
                  Estimated ({currentSummary.estimatedPomodoros} pomo)
                </span>
                <span className="font-medium">{formatTime(currentSummary.estimatedTimeMinutes)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (currentSummary.estimatedTimeMinutes / Math.max(currentSummary.estimatedTimeMinutes, 1)) * 100)}%`,
                    backgroundColor: user.themeColor
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  Actual ({currentSummary.actualPomodoros} pomo)
                </span>
                <span className="font-medium">{formatTime(currentSummary.actualTimeMinutes)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (currentSummary.actualTime / Math.max(currentSummary.estimatedTime, 1)) * 100)}%`,
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
