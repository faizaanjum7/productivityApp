import React, { useMemo } from 'react';
import { User, DailyPlan } from '../types';
import { CloseIcon } from './icons';

interface EndDaySummaryProps {
  user: User;
  onClose: () => void;
  dailyPlan?: DailyPlan | null;
}

const EndDaySummary: React.FC<EndDaySummaryProps> = ({ user, onClose, dailyPlan }) => {
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    // Collect completed task ids from environments and from dailyPlan to avoid double counting
    const envCompletedIds = new Set(user.environments.flatMap(env => env.tasks.filter(t => t.completed).map(t => t.id)));
    const planCompletedIds = new Set((dailyPlan?.tasks || []).filter(t => t.completed).map(t => t.id));

  const uniqueCompletedIds = new Set<string>();
  for (const id of Array.from(envCompletedIds)) uniqueCompletedIds.add(id as string);
  for (const id of Array.from(planCompletedIds)) uniqueCompletedIds.add(id as string);
  const tasksCompleted = uniqueCompletedIds.size;

    const focusTime = user.pomodoroHistory
      .filter(session => session.date.startsWith(today))
      .reduce((total, session) => total + session.duration, 0);

    const randomPraise = user.praisePhrases[Math.floor(Math.random() * user.praisePhrases.length)];

    return { tasksCompleted, focusTime, randomPraise };
  }, [user, dailyPlan]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6 relative text-center animate-modal-in" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <CloseIcon />
        </button>
        
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Today's Summary</h2>
            <p className="text-gray-500 dark:text-gray-400">{summary.randomPraise}</p>
        </div>

        <div className="flex justify-around pt-4">
            <div className="text-center">
                <p className="text-4xl font-bold" style={{color: user.themeColor}}>{summary.tasksCompleted}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</p>
            </div>
             <div className="text-center">
                <p className="text-4xl font-bold" style={{color: user.themeColor}}>{summary.focusTime}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Minutes Focused</p>
            </div>
        </div>

        <button 
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600"
        >
            Keep Going
        </button>
      </div>
    </div>
  );
};

export default EndDaySummary;
