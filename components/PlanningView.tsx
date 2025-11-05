import React, { useState } from 'react';
import { DailyPlan, User, PomodoroSession } from '../types';
import { generateDailyPlan } from '../services/geminiService';
import { SparklesIcon } from './icons';

interface PlanningViewProps {
  user: User;
  onPlanGenerated: (plan: DailyPlan) => void;
}

type DayType = 'Productive' | 'Lazy' | 'Creative' | 'Reset';
type PreferredMode = 'Timeflow' | 'Quota';
type Unit = 'minutes' | 'pomodoros';

const getLearnedDurations = (history: PomodoroSession[]): string => {
    if (!history || history.length === 0) return '';
    
    const taskDurations = new Map<string, number>();
    // Iterate backwards to get the most recent session for each task
    for (let i = history.length - 1; i >= 0; i--) {
        const session = history[i];
        if (session.taskText && !taskDurations.has(session.taskText)) {
            taskDurations.set(session.taskText, session.duration);
        }
    }

    if(taskDurations.size === 0) return '';

    let learnedString = '';
    taskDurations.forEach((duration, task) => {
        learnedString += `- For tasks like '${task}', the user typically focuses for about ${duration} minutes.\n`;
    });
    
    return learnedString;
};

const PlanningView: React.FC<PlanningViewProps> = ({ user, onPlanGenerated }) => {
    const [dayType, setDayType] = useState<DayType>('Productive');
    const [focusTasks, setFocusTasks] = useState('');
    const [workPattern, setWorkPattern] = useState('50 min work, 10 min break');
    const [preferredMode, setPreferredMode] = useState<PreferredMode>('Timeflow');
    const [unit, setUnit] = useState<Unit>('minutes');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!focusTasks.trim()) {
            setError('Please enter your main focus for the day.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const learnedDurations = getLearnedDurations(user.pomodoroHistory);
            
            const plan = await generateDailyPlan({
                dayType,
                focusTasks,
                workPattern,
                preferredMode,
                unit: preferredMode === 'Timeflow' ? 'minutes' : unit,
                learnedDurations,
                environments: user.environments.map(({ id, name }) => ({ id, name })),
            });

            if (plan) {
                onPlanGenerated(plan);
            } else {
                setError("Sorry, I couldn't create a plan. Please try again.");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please check the console.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center py-12 px-4 animate-fade-in">
            <div className="w-full max-w-2xl p-8 space-y-8 bg-white dark:bg-gray-800/50 rounded-2xl shadow-2xl">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Plan Your Day</h1>
                    <p className="text-gray-600 dark:text-gray-300">Tell Skylar your goals, and let's build your flow.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What's the vibe for today?</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(['Productive', 'Lazy', 'Creative', 'Reset'] as DayType[]).map(type => (
                                <button key={type} type="button" onClick={() => setDayType(type)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${dayType === type ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{type}</button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="focus" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What are your main focus areas?</label>
                        <textarea
                            id="focus"
                            value={focusTasks}
                            onChange={(e) => setFocusTasks(e.target.value)}
                            placeholder="e.g., Finish thesis (Academics), Presentation slides, Workout (Health)"
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0 transition"
                            required
                        />
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">How do you want to plan?</label>
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <button type="button" onClick={() => setPreferredMode('Timeflow')} className={`flex-1 py-2 text-sm rounded-md transition ${preferredMode === 'Timeflow' ? 'bg-white dark:bg-gray-800 shadow text-indigo-500' : ''}`}>Structured (Timeflow)</button>
                                <button type="button" onClick={() => setPreferredMode('Quota')} className={`flex-1 py-2 text-sm rounded-md transition ${preferredMode === 'Quota' ? 'bg-white dark:bg-gray-800 shadow text-indigo-500' : ''}`}>Flexible (Quota)</button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Measure your quota in?</label>
                            <div className={`flex p-1 rounded-lg ${preferredMode === 'Quota' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'}`}>
                                <button type="button" onClick={() => setUnit('minutes')} disabled={preferredMode !== 'Quota'} className={`flex-1 py-2 text-sm rounded-md transition ${unit === 'minutes' && preferredMode === 'Quota' ? 'bg-white dark:bg-gray-800 shadow text-indigo-500' : ''} disabled:cursor-not-allowed disabled:text-gray-400`}>Minutes</button>
                                <button type="button" onClick={() => setUnit('pomodoros')} disabled={preferredMode !== 'Quota'} className={`flex-1 py-2 text-sm rounded-md transition ${unit === 'pomodoros' && preferredMode === 'Quota' ? 'bg-white dark:bg-gray-800 shadow text-indigo-500' : ''} disabled:cursor-not-allowed disabled:text-gray-400`}>Pomodoros</button>
                            </div>
                        </div>
                    </div>
                    
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-transform transform hover:scale-105 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating your plan...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5"/>
                                Generate My Day
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PlanningView;