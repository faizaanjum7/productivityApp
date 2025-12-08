import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DailyPlan, Task, Environment } from '../types';
import { ClockIcon, ListBulletIcon, PlayIcon, EditIcon, CheckIcon, SparklesIcon, TrashIcon, CloseIcon, EllipsisHorizontalIcon, ArrowRightIcon, PlusIcon } from './icons';
import { generateTimeflowSchedule } from '../services/geminiService';

// Helper to convert hex to rgba for the glow effect
const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface PlannerProps {
  plan: DailyPlan;
  onUpdatePlan: (plan: DailyPlan) => void;
  themeColor: string;
  environments: Environment[];
  activeEnvironmentId: string;
  onMoveTask: (taskId: string, targetEnvId: string) => void;
  // Simplified props for new workflow
  activeFocusTaskId: string | null;
  onStartFocus: (taskId: string) => void;
}

const EditableDuration: React.FC<{
    task: Task;
    unit: 'minutes' | 'pomodoros';
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (newDuration: number) => void;
}> = ({ task, unit, isEditing, onStartEdit, onSave }) => {
    const [duration, setDuration] = useState(String(task.duration));

    const handleSave = () => {
        const newDuration = parseInt(duration, 10);
        if (!isNaN(newDuration) && newDuration >= 0) {
            onSave(newDuration);
        }
    }

    const progressText = unit === 'pomodoros'
        ? `${task.actualPomodoros} / ${task.duration} pomodoros`
        : `${task.actualDuration} / ${task.duration} min`;

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="w-16 text-xs text-right bg-gray-200 dark:bg-gray-600 rounded-md px-1"
                    autoFocus
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{unit === 'pomodoros' ? 'poms' : 'min'}</span>
                <button onClick={handleSave}><CheckIcon className="w-4 h-4 text-green-500"/></button>
            </div>
        )
    }

    return (
        <div onClick={onStartEdit} className="flex items-center gap-1 cursor-pointer group/duration">
            <span className="text-xs text-gray-500 dark:text-gray-400">{progressText}</span>
            <EditIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover/duration:opacity-100 transition-opacity" />
        </div>
    )
}

const MoveMenu: React.FC<{
    task: Task;
    environments: Environment[];
    onMoveTask: (taskId: string, targetEnvId: string) => void;
    onClose: () => void;
}> = ({ task, environments, onMoveTask, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    
    return (
        <div ref={menuRef} className="absolute top-8 right-0 z-10 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-2 space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2">Move to</p>
            {environments.filter(e => e.id !== task.environmentId).map(env => (
                <button 
                    key={env.id} 
                    onClick={() => { onMoveTask(task.id, env.id); onClose(); }}
                    className="w-full flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{backgroundColor: env.color}}></span>
                        {env.name}
                    </span>
                    <ArrowRightIcon className="w-4 h-4 text-gray-500"/>
                </button>
            ))}
        </div>
    );
}

const QuotaView: React.FC<PlannerProps> = (props) => {
    const { plan, onUpdatePlan, themeColor, environments, activeEnvironmentId, onMoveTask, activeFocusTaskId, onStartFocus } = props;
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');
    
    const [durationType, setDurationType] = useState<'minutes' | 'pomodoros'>('minutes');
    const [durationValue, setDurationValue] = useState('1');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        
        const duration = parseInt(durationValue, 10) || 1;
        
        const newTask: Task = {
            id: Date.now().toString(),
            text: newTaskText.trim(),
            completed: false,
            subtasks: [],
            duration: durationType === 'pomodoros' ? duration : duration,
            actualDuration: 0,
            actualPomodoros: 0,
            environmentId: activeEnvironmentId
        };
        
        onUpdatePlan({ ...plan, tasks: [...plan.tasks, newTask] });
        setNewTaskText('');
        setDurationValue('1');
    };
    
    const handleDeleteTask = (taskId: string) => {
        onUpdatePlan({
            ...plan,
            tasks: plan.tasks.filter(t => t.id !== taskId)
        });
    };

    const handleSaveDuration = (taskId: string, newDuration: number) => {
        const updatedTasks = plan.tasks.map(t =>
            t.id === taskId ? { ...t, duration: newDuration } : t
        );
        onUpdatePlan({ ...plan, tasks: updatedTasks });
        setEditingTaskId(null);
    }
    
    // Filter out the active task, as it's shown in the "In Progress" panel
    const uncompletedTasks = plan.tasks.filter(t => !t.completed && t.environmentId === activeEnvironmentId && t.id !== activeFocusTaskId);
    const completedTasks = plan.tasks.filter(t => t.completed && t.environmentId === activeEnvironmentId);

    return (
        <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2">
            {uncompletedTasks.length > 0 ? uncompletedTasks.map(task => {
                let progress = 0;
                if (plan.unit === 'pomodoros') {
                    progress = task.duration > 0 ? (task.actualPomodoros / task.duration) * 100 : 0;
                } else {
                    progress = task.duration > 0 ? (task.actualDuration / task.duration) * 100 : 0;
                }
                progress = Math.min(progress, 100);

                const taskEnv = environments.find(env => env.id === task.environmentId);

                return (
                    <div 
                        key={task.id} 
                        className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group transition-all duration-300" 
                    >
                        <div className="flex items-center justify-between">
                             <div className="flex-grow min-w-0 flex items-center gap-3">
                                {taskEnv && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: taskEnv.color }}></div>}
                                <div className="flex-grow min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{task.text}</p>
                                    <EditableDuration 
                                        task={task}
                                        unit={plan.unit}
                                        isEditing={editingTaskId === task.id}
                                        onStartEdit={() => setEditingTaskId(task.id)}
                                        onSave={(newDuration) => handleSaveDuration(task.id, newDuration)}
                                    />
                                </div>
                            </div>
                             <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => onStartFocus(task.id)}
                                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-white rounded-full transition-transform transform hover:scale-110" 
                                    style={{backgroundColor: themeColor}}
                                    aria-label={`Start focus session for ${task.text}`}
                                >
                                    <PlayIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                    aria-label={`Delete task ${task.text}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <div className="relative">
                                    <button 
                                        onClick={() => setMenuTaskId(prev => prev === task.id ? null : task.id)} 
                                        className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="More options"
                                    >
                                        <EllipsisHorizontalIcon className="w-5 h-5" />
                                    </button>
                                    {menuTaskId === task.id && (
                                        <MoveMenu 
                                            task={task} 
                                            environments={environments} 
                                            onMoveTask={onMoveTask} 
                                            onClose={() => setMenuTaskId(null)} 
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: themeColor, transition: 'width 0.5s ease-out' }}></div>
                        </div>
                    </div>
                )
            }) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic py-4">No tasks planned for this environment.</p>}

            {completedTasks.length > 0 && (
                <div className="pt-4">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Completed</h3>
                    <div className="space-y-2 mt-2">
                        {completedTasks.map(task => (
                            <div key={task.id} className="p-2 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{task.text}</p>
                                    <p className="text-xs text-gray-500">{plan.unit === 'pomodoros' ? `${task.actualPomodoros} / ${task.duration} pomodoros` : `${task.actualDuration} / ${task.duration} min`}</p>
                                </div>
                                <div className="text-green-600 font-semibold">Done</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const TimeflowView: React.FC<PlannerProps> = (props) => {
    const { plan, onUpdatePlan, themeColor, environments, activeEnvironmentId, onMoveTask, activeFocusTaskId, onStartFocus } = props;
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
    const [durationType, setDurationType] = useState<'minutes' | 'pomodoros'>('minutes');
    const [durationValue, setDurationValue] = useState('30');
    const [newTaskText, setNewTaskText] = useState('');
    
    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        const duration = parseInt(durationValue, 10) || (durationType === 'pomodoros' ? 1 : 30);
        
        const newTask: Task = {
            id: Date.now().toString(),
            text: newTaskText.trim(),
            completed: false,
            subtasks: [],
            duration: durationType === 'pomodoros' ? duration : duration,
            plannedStartTime: currentTime,
            actualDuration: 0,
            actualPomodoros: 0,
            environmentId: activeEnvironmentId
        };
        
        onUpdatePlan({ 
            ...plan, 
            tasks: [...plan.tasks, newTask] 
        });
        setNewTaskText('');
        setDurationValue('30');
    };

    // Convert pomodoros to minutes if needed
    const getDurationInMinutes = (task: Task) => {
        return plan.unit === 'pomodoros' ? task.duration * 30 : task.duration; // 25 min work + 5 min break = 30 min per pomodoro
    };
    
    // Get work duration only (without breaks)
    const getWorkDuration = (task: Task) => {
        return plan.unit === 'pomodoros' ? task.duration * 25 : task.duration;
    };

    const handleUpdateTask = (updatedTask: Task) => {
        const updatedTasks = plan.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        onUpdatePlan({ ...plan, tasks: updatedTasks });
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedTasks = plan.tasks.filter(t => t.id !== taskId);
        onUpdatePlan({ ...plan, tasks: updatedTasks });
    };

    const handleSaveEdit = () => {
        if (editingTask) {
            const sortedTasks = [...plan.tasks.filter(t => t.id !== editingTask.id), editingTask]
                .sort((a, b) => (a.plannedStartTime || "23:59").localeCompare(b.plannedStartTime || "23:59"));
            
            onUpdatePlan({ ...plan, tasks: sortedTasks });
            setEditingTask(null);
        }
    };
    
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const sortedTasks = [...plan.tasks]
        .filter(task => {
            if (task.environmentId !== activeEnvironmentId || !task.plannedStartTime || task.id === activeFocusTaskId) {
                return false;
            }
            
            // Only include tasks that are in the future or current time
            const taskTime = task.plannedStartTime;
            return taskTime >= currentTimeStr;
        })
        .sort((a, b) => (a.plannedStartTime || "23:59").localeCompare(b.plannedStartTime || "23:59"));
    
    const formatDisplayTime = (timeStr: string, duration: number = 0) => {
        const [hours, minutes] = timeStr.split(':');
        const startDate = new Date();
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Use getDurationInMinutes which includes breaks for pomodoros
        const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));
        
        const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        
        return `${formatTime(startDate)} - ${formatTime(endDate)}`;
    }

    return (
         <div className="space-y-1 max-h-[28rem] overflow-y-auto pr-2 -ml-4">
            <form onSubmit={handleAddTask} className="space-y-2 mb-4 ml-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="Add a new scheduled task..."
                        className="flex-grow px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                    />
                    <button 
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Add
                    </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Duration:</span>
                    <input
                        type="number"
                        min="1"
                        value={durationValue}
                        onChange={(e) => setDurationValue(e.target.value)}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <select
                        value={durationType}
                        onChange={(e) => setDurationType(e.target.value as 'minutes' | 'pomodoros')}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="minutes">Minutes</option>
                        <option value="pomodoros">Pomodoros</option>
                    </select>
                </div>
            </form>
            {sortedTasks.length > 0 ? sortedTasks.map((task, index) => {
                if(!task.plannedStartTime) return null;
                const isEditing = editingTask?.id === task.id;
                const taskEnv = environments.find(env => env.id === task.environmentId);
                const isCompleted = task.completed;
                const timelineColor = isCompleted ? '#9ca3af' : (taskEnv?.color || themeColor);

                if (isEditing) {
                    return (
                        <div key={task.id} className="flex items-start gap-3 py-2 animate-fade-in">
                             <div className="text-right flex-shrink-0 w-20 pt-1">
                                <input 
                                    type="time"
                                    value={editingTask.plannedStartTime}
                                    onChange={(e) => setEditingTask(t => t ? {...t, plannedStartTime: e.target.value} : null)}
                                    className="w-full text-sm font-semibold bg-gray-100 dark:bg-gray-600 rounded px-1 py-0.5 border border-gray-300 dark:border-gray-500"
                                />
                             </div>
                             <div className="relative flex-grow pl-4">
                                <div className="absolute top-4 -left-2 w-3 h-3 rounded-full z-10" style={{backgroundColor: timelineColor}}></div>
                                {index < sortedTasks.length - 1 && (
                                    <div className="absolute top-7 -left-[3px] w-0.5 bottom-0" style={{backgroundColor: timelineColor}}></div>
                                )}
                                
                                <div className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-2 border border-gray-200 dark:border-gray-700">
                                    <input 
                                        type="text"
                                        value={editingTask.text}
                                        onChange={(e) => setEditingTask(t => t ? {...t, text: e.target.value} : null)}
                                        className="w-full text-sm font-medium bg-transparent focus:outline-none border-b border-gray-300 dark:border-gray-600"
                                    />
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500">Duration:</label>
                                        <input 
                                            type="number"
                                            value={editingTask.duration}
                                            onChange={(e) => setEditingTask(t => t ? {...t, duration: parseInt(e.target.value, 10) || 0} : null)}
                                            className="w-16 text-xs bg-gray-200 dark:bg-gray-600 rounded px-1"
                                        />
                                        <span className="text-xs text-gray-500">min</span>
                                    </div>
                                     <div className="flex justify-end space-x-2 pt-2">
                                        <button onClick={() => setEditingTask(null)} className="p-1 text-gray-400 hover:text-red-500"><CloseIcon className="w-5 h-5"/></button>
                                        <button onClick={handleSaveEdit} className="p-1 text-gray-400 hover:text-green-500"><CheckIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                const totalDurationSeconds = task.duration * 60;
                const progress = totalDurationSeconds > 0 ? Math.min(((task.actualDuration * 60) / totalDurationSeconds) * 100, 100) : 0;
                
                return(
                <div key={task.id} className={`flex items-start gap-3 group transition-opacity ${isCompleted ? 'opacity-60' : ''}`}>
                    <div className="text-right flex-shrink-0 w-20 pt-3">
                         <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {formatDisplayTime(task.plannedStartTime, getDurationInMinutes(task))}
                         </p>
                         <p className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.unit === 'pomodoros' 
                                ? `${task.duration} pomodoro${task.duration !== 1 ? 's' : ''} (${getWorkDuration(task)} min work + ${task.duration * 5} min breaks)`
                                : `${task.duration} min`}
                         </p>
                    </div>
                    <div className="relative flex-grow pl-4 py-2">
                        <div className="absolute top-4 -left-2 w-3 h-3 rounded-full z-10" style={{backgroundColor: timelineColor}}></div>
                        {index < sortedTasks.length - 1 && (
                            <div className="absolute top-7 -left-[3px] w-0.5 bottom-0" style={{backgroundColor: timelineColor}}></div>
                        )}
                        
                        <div 
                            className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 transition-all" 
                            style={{borderColor: timelineColor}}
                        >
                             <div className="flex items-center justify-between">
                                <div className="flex-grow min-w-0 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => handleUpdateTask({ ...task, completed: !task.completed })}
                                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                    />
                                    <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 truncate ${isCompleted ? 'line-through' : ''}`}>{task.text}</p>
                                </div>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setEditingTask(task)} 
                                        className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label={`Edit task ${task.text}`}
                                    >
                                        <EditIcon className="w-4 h-4"/>
                                    </button>
                                    <button 
                                        onClick={() => onUpdatePlan({ ...plan, tasks: plan.tasks.filter(t => t.id !== task.id) })}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        aria-label={`Delete task ${task.text}`}
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                    <div className="relative">
                                        <button onClick={() => setMenuTaskId(prev => prev === task.id ? null : task.id)} className="p-1 text-gray-400 hover:text-indigo-500">
                                            <EllipsisHorizontalIcon className="w-5 h-5" />
                                        </button>
                                        {menuTaskId === task.id && (
                                            <MoveMenu task={task} environments={environments} onMoveTask={onMoveTask} onClose={() => setMenuTaskId(null)} />
                                        )}
                                    </div>
                                    {!isCompleted &&
                                    <button 
                                        onClick={() => onStartFocus(task.id)}
                                        className="ml-1 flex-shrink-0 flex items-center justify-center w-7 h-7 text-white rounded-full" 
                                        style={{backgroundColor: themeColor}}
                                    >
                                        <PlayIcon className="w-4 h-4" />
                                    </button>
                                    }
                                </div>
                            </div>
                            {task.duration > 0 && 
                                <div className="mt-2 ml-10 w-[calc(100%-2.5rem)] bg-gray-200 dark:bg-gray-600 rounded-full h-1 overflow-hidden">
                                    <div className="h-1 rounded-full" style={{ width: `${progress}%`, backgroundColor: themeColor, transition: 'width 0.5s ease-out' }}></div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            )}) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic py-4">No scheduled tasks for this environment.</p>}
        </div>
    );
};

const Planner: React.FC<PlannerProps> = (props) => {
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [scheduleExists, setScheduleExists] = useState(false);

    useEffect(() => {
        setScheduleExists(props.plan.tasks.some(t => t.plannedStartTime));
    }, [props.plan.tasks]);

    const handleGenerateSchedule = async () => {
        setIsGeneratingSchedule(true);
        
        // Get current time and round up to next 5 minutes
        const now = new Date();
        const minutesToAdd = 5 - (now.getMinutes() % 5);
        now.setMinutes(now.getMinutes() + minutesToAdd);
        const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Filter out tasks that are already in the past
        const uncompletedTasks = props.plan.tasks
            .filter(t => {
                if (t.completed || t.duration <= 0) return false;
                // If task already has a time, check if it's in the future
                if (t.plannedStartTime) {
                    return t.plannedStartTime >= startTime;
                }
                return true;
            })
            .map(task => ({
                ...task,
                // Keep the original duration, the scheduling service will handle the conversion
                duration: task.duration
            }));

        if (uncompletedTasks.length > 0) {
            // Use the start time we calculated earlier
            
            const schedule = await generateTimeflowSchedule({
                tasks: uncompletedTasks,
                startTime: startTime,
                workPattern: '50 min work, 10 min break',
                unit: props.plan.unit
            });

            if (schedule) {
                const scheduledTasksMap = new Map(schedule.map(t => [t.id, t.plannedStartTime]));
                const updatedTasks = props.plan.tasks.map(task => {
                    // Keep original duration as it was before scheduling
                    const duration = task.duration;
                    return {
                        ...task,
                        duration,
                        plannedStartTime: scheduledTasksMap.get(task.id) || task.plannedStartTime,
                    };
                });
                props.onUpdatePlan({ ...props.plan, tasks: updatedTasks });
            } else {
                // Show error to user
                alert("Failed to generate schedule. Please try again.");
            }
        }
        setIsGeneratingSchedule(false);
    };

    const handleAddTask = (task: Omit<Task, 'id' | 'completed' | 'subtasks' | 'actualDuration' | 'actualPomodoros'>) => {
        const newTask: Task = {
            ...task,
            id: Date.now().toString(),
            completed: false,
            subtasks: [],
            actualDuration: 0,
            actualPomodoros: 0,
            environmentId: props.activeEnvironmentId
        };
        
        const updatedPlan = {
            ...props.plan,
            tasks: [...props.plan.tasks, newTask]
        };
        
        props.onUpdatePlan(updatedPlan);
        setShowAddTaskModal(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Today's Plan</h2>
                <button 
                    onClick={() => setShowAddTaskModal(true)}
                    className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-indigo-500 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add
                </button>
            </div>
            <div className="space-y-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <ListBulletIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Quota</h3>
                    </div>
                    <QuotaView {...props} />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                     <div className="flex items-center gap-3 mb-4">
                        <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Timeflow</h3>
                    </div>
                    {scheduleExists ? (
                        <TimeflowView {...props} />
                    ) : (
                        <div className="text-center py-4 space-y-3">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Want a more structured plan? Generate a schedule for your remaining tasks.</p>
                            <button 
                                onClick={handleGenerateSchedule} 
                                disabled={isGeneratingSchedule}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-transform transform hover:scale-105 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                            >
                                {isGeneratingSchedule ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                            <circle className="opacity-25" cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 10a6 6 0 016-6v2a4 4 0 00-4 4H4z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-5 h-5" />
                                        Generate Timeflow Schedule
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <AddTaskModal
                isOpen={showAddTaskModal}
                onClose={() => setShowAddTaskModal(false)}
                onSubmit={handleAddTask}
                mode={props.plan.mode === 'Quota' ? 'quota' : 'timeflow'}
            />
        </div>
    );
};

const AddTaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: { 
        text: string; 
        duration: number; 
        durationType: 'minutes' | 'pomodoros';
        plannedStartTime?: string;
        plannedEndTime?: string;
    }) => void;
    mode: 'quota' | 'timeflow';
}> = ({ isOpen, onClose, onSubmit, mode }) => {
    const [text, setText] = useState('');
    const [taskType, setTaskType] = useState<'quota' | 'structured'>(mode === 'timeflow' ? 'structured' : 'quota');
    const [duration, setDuration] = useState('30');
    const [durationType, setDurationType] = useState<'minutes' | 'pomodoros'>('minutes');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        
        const task = {
            text: text.trim(),
            duration: parseInt(duration) || 30,
            durationType,
            ...(taskType === 'structured' && { 
                plannedStartTime: startTime,
                plannedEndTime: endTime
            })
        };
        
        onSubmit(task);
        setText('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add New Task</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Name</label>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter task name"
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            autoFocus
                            required
                        />
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Task Type
                            </label>
                            <select
                                value={taskType}
                                onChange={(e) => setTaskType(e.target.value as 'quota' | 'structured')}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="quota">Quota</option>
                                <option value="structured">Structured</option>
                            </select>
                        </div>

                        {taskType === 'structured' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Duration
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Duration Type
                                </label>
                                <select
                                    value={durationType}
                                    onChange={(e) => setDurationType(e.target.value as 'minutes' | 'pomodoros')}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="minutes">Minutes</option>
                                    <option value="pomodoros">Pomodoros</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Add Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Planner;