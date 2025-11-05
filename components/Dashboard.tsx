import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { User, Environment, Task, Routine, DailyPlan } from '../types';
import WelcomeHeader from './WelcomeHeader';
import TaskList from './TaskList';
import RoutineManager from './RoutineManager';
import EnvironmentSelector from './EnvironmentSelector';
import Planner from './Planner';
import ResourceVault from './ResourceVault';
import EndDaySummary from './EndDaySummary';
import Settings from './Settings';
import PlanningView from './PlanningView';
import { parseTaskAndAssignEnvironment } from '../services/geminiService';
import { CheckCircleIcon, PauseIcon, PlayIcon, StopIcon, RefreshIcon } from './icons';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type FocusMode = 'stopwatch' | 'pomodoro' | 'short_break' | 'long_break';

const POMODORO_TIME = 25 * 60;
const SHORT_BREAK_TIME = 5 * 60;
const LONG_BREAK_TIME = 15 * 60;

const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface DashboardProps {
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  updateUser: (user: User) => void;
  dailyPlan: DailyPlan | null;
  updatePlan: (plan: DailyPlan | null) => void;
  saveStatus: SaveStatus;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { user, dailyPlan, updatePlan, ...rest } = props;
  const [showSummary, setShowSummary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [activeFocusTaskId, setActiveFocusTaskId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode | null>(null);
  const [timerValue, setTimerValue] = useState(0); // in seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [pomodoroCycle, setPomodoroCycle] = useState(0);
  
  const timerIntervalRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedElapsedRef = useRef<number>(0); // for stopwatch pauses
  const STORAGE_KEY_BASE = 'skylarfocus:timerState';
  const getStorageKey = () => `${STORAGE_KEY_BASE}:${user?.name || 'anon'}:${dailyPlan?.date || 'global'}`;
  const clearPersistedTimerState = () => { try { localStorage.removeItem(getStorageKey()); } catch (e) {} };
  const dailyPlanRef = useRef(dailyPlan);

  const [restoredToastVisible, setRestoredToastVisible] = useState(false);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);

  const showDesktopNotification = (title: string, body?: string) => {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } catch (e) {}
  };
  
  useEffect(() => {
    dailyPlanRef.current = dailyPlan;
  }, [dailyPlan]);


  const activeEnvironment = useMemo(() => 
    user.environments.find(env => env.id === user.activeEnvironmentId) || user.environments[0],
    [user.activeEnvironmentId, user.environments]
  );
  
  const activeFocusTask = useMemo(() => {
    if (!dailyPlan || !activeFocusTaskId) return null;
    return dailyPlan.tasks.find(t => t.id === activeFocusTaskId) || null;
  }, [dailyPlan, activeFocusTaskId]);

  const stopTimer = useCallback((shouldSaveProgress: boolean = true) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    // Pause timer but preserve logical time using refs
    if (focusMode === 'stopwatch') {
      if (startTimeRef.current) {
        accumulatedElapsedRef.current += Math.round((Date.now() - startTimeRef.current) / 1000);
        startTimeRef.current = null;
      }
      setTimerValue(accumulatedElapsedRef.current);
    } else if (focusMode) {
      if (endTimeRef.current) {
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        setTimerValue(remaining);
        // keep endTimeRef cleared when paused so resume will set a new end time
        endTimeRef.current = null;
      }
    }
    setIsTimerActive(false);
    // Persist pause state immediately
    try {
      const toSave = {
        focusMode,
        activeFocusTaskId,
        pomodoroCycle,
        timerValue: focusMode === 'stopwatch' ? accumulatedElapsedRef.current : timerValue,
        isTimerActive: false,
        endTime: endTimeRef.current,
        startTime: startTimeRef.current,
        accumulated: accumulatedElapsedRef.current,
      };
  localStorage.setItem(getStorageKey(), JSON.stringify(toSave));
    } catch (e) {
      // ignore storage errors
    }

    if (!shouldSaveProgress || !dailyPlanRef.current || !activeFocusTaskId || !focusMode) {
      return;
    }

    let timeSpentInSeconds = 0;
    if (focusMode === 'stopwatch') {
      timeSpentInSeconds = timerValue;
    } else if (focusMode === 'pomodoro') {
      timeSpentInSeconds = POMODORO_TIME - timerValue;
    }

    const timeSpentInMinutes = Math.floor(timeSpentInSeconds / 60);

    if (timeSpentInMinutes > 0) {
      const updatedPlanTasks = dailyPlanRef.current.tasks.map(t => {
        if (t.id === activeFocusTaskId) {
          return { ...t, actualDuration: t.actualDuration + timeSpentInMinutes };
        }
        return t;
      });
      updatePlan({ ...dailyPlanRef.current, tasks: updatedPlanTasks });
    }
  }, [activeFocusTaskId, focusMode, timerValue, updatePlan]);

  // Persist timer state on key changes so reloads can restore
  useEffect(() => {
    try {
      const toSave = {
        focusMode,
        activeFocusTaskId,
        pomodoroCycle,
        timerValue,
        isTimerActive,
        endTime: endTimeRef.current,
        startTime: startTimeRef.current,
        accumulated: accumulatedElapsedRef.current,
      };
  localStorage.setItem(getStorageKey(), JSON.stringify(toSave));
    } catch (e) {}
  }, [focusMode, activeFocusTaskId, pomodoroCycle, timerValue, isTimerActive]);

  // On mount, try to restore timer state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed) return;

      // Restore values
      if (parsed.focusMode) setFocusMode(parsed.focusMode);
      if (parsed.activeFocusTaskId) setActiveFocusTaskId(parsed.activeFocusTaskId);
      if (typeof parsed.pomodoroCycle === 'number') setPomodoroCycle(parsed.pomodoroCycle);
      if (typeof parsed.timerValue === 'number') setTimerValue(parsed.timerValue);
      // restore refs
      endTimeRef.current = parsed.endTime ?? null;
      startTimeRef.current = parsed.startTime ?? null;
      accumulatedElapsedRef.current = parsed.accumulated ?? 0;

      // If it was running, resume and show toast
      if (parsed.isTimerActive) {
        setIsTimerActive(true);
        setRestoredMessage('Timer restored and running');
        setRestoredToastVisible(true);
        setTimeout(() => setRestoredToastVisible(false), 3500);
      } else if (parsed.timerValue) {
        setRestoredMessage('Timer restored (paused)');
        setRestoredToastVisible(true);
        setTimeout(() => setRestoredToastVisible(false), 3000);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // ask for Notification permission once on mount (non-blocking)
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isTimerActive) {
      // Ensure refs are set appropriately when starting
      if (focusMode === 'stopwatch') {
        if (!startTimeRef.current) startTimeRef.current = Date.now();
      } else if (focusMode) {
        if (!endTimeRef.current) endTimeRef.current = Date.now() + timerValue * 1000;
      }

      timerIntervalRef.current = window.setInterval(() => {
        // Compute logical time from system clock so background throttling doesn't affect correctness
        if (focusMode === 'stopwatch') {
          let elapsed = accumulatedElapsedRef.current;
          if (startTimeRef.current) elapsed += Math.round((Date.now() - startTimeRef.current) / 1000);
          setTimerValue(elapsed);
        } else if (focusMode) {
          const remaining = endTimeRef.current ? Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000)) : timerValue;
          if (remaining <= 0) {
            // Timer finished
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setIsTimerActive(false);

            if(focusMode === 'pomodoro' && dailyPlanRef.current && activeFocusTaskId) {
                const updatedPlanTasks = dailyPlanRef.current.tasks.map(t => {
                    if (t.id === activeFocusTaskId) {
                        const newPomodoros = t.actualPomodoros + 1;
                        const completed = (t.duration && t.duration > 0) ? newPomodoros >= t.duration : t.completed;
                        return { 
                            ...t, 
                            actualDuration: t.actualDuration + 25,
                            actualPomodoros: newPomodoros,
                            completed,
                        };
                    }
                    return t;
                });
                updatePlan({ ...dailyPlanRef.current, tasks: updatedPlanTasks });

                // If task reached completion (quota), also update the user's environment tasks so EndDaySummary counts it
                try {
                  const finished = updatedPlanTasks.find(t => t.id === activeFocusTaskId && t.completed);
                  if (finished && finished.environmentId) {
                    const updatedEnvironments = user.environments.map(env => {
                      if (env.id !== finished.environmentId) return env;
                      const updatedEnvTasks = env.tasks.map(et => et.id === finished.id ? { ...et, completed: true } : et);
                      return { ...env, tasks: updatedEnvTasks };
                    });
                    props.updateUser({ ...user, environments: updatedEnvironments });
                  }
                } catch (e) {}

          // desktop notification: pomodoro finished
          try {
            const taskText = dailyPlanRef.current.tasks.find(t => t.id === activeFocusTaskId)?.text;
            showDesktopNotification('Pomodoro finished', taskText ? `Completed one pomodoro for: ${taskText}` : 'Pomodoro finished');
          } catch (e) {}

                const nextCycle = pomodoroCycle + 1;
                setPomodoroCycle(nextCycle);
                if(nextCycle % 4 === 0) {
                    setFocusMode('long_break');
                    setTimerValue(LONG_BREAK_TIME);
                    endTimeRef.current = Date.now() + LONG_BREAK_TIME * 1000;
                } else {
                    setFocusMode('short_break');
                    setTimerValue(SHORT_BREAK_TIME);
                    endTimeRef.current = Date.now() + SHORT_BREAK_TIME * 1000;
                }
          setIsTimerActive(true); // Auto-start break
          try { showDesktopNotification('Break started', nextCycle % 4 === 0 ? 'Long break started' : 'Short break started'); } catch (e) {}
        } else if (focusMode?.includes('break')) {
          setFocusMode(null);
          // Don't reset active task, user can start next pomodoro
          try { showDesktopNotification('Break ended', 'Break is over — ready to focus!'); } catch (e) {}
        }
            return;
          }

          setTimerValue(remaining);
        }
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerActive, focusMode, activeFocusTaskId, pomodoroCycle, updatePlan]);

  // If active focus task is removed from the daily plan (planner deletion), clear persisted timer
  useEffect(() => {
    try {
      if (activeFocusTaskId && dailyPlan && !dailyPlan.tasks.find(t => t.id === activeFocusTaskId)) {
        stopTimer(false);
        clearPersistedTimerState();
        startTimeRef.current = null;
        endTimeRef.current = null;
        accumulatedElapsedRef.current = 0;
        setActiveFocusTaskId(null);
        setFocusMode(null);
        setTimerValue(0);
      }
    } catch (e) {}
  }, [dailyPlan, activeFocusTaskId]);

  const handleStartFocus = (taskId: string) => {
    if (activeFocusTaskId) stopTimer(); // Stop previous timer if any

    const task = dailyPlan?.tasks.find(t => t.id === taskId);
    if (!task || !dailyPlan) return;

    setActiveFocusTaskId(taskId);
    setIsTimerActive(true);

    if (dailyPlan.unit === 'pomodoros') {
      setFocusMode('pomodoro');
      // set remaining time and endTime
      setTimerValue(POMODORO_TIME);
      endTimeRef.current = Date.now() + POMODORO_TIME * 1000;
      // clear stopwatch refs
      startTimeRef.current = null;
      accumulatedElapsedRef.current = 0;
    } else {
      setFocusMode('stopwatch');
      setTimerValue(0);
      // set start time for stopwatch
      accumulatedElapsedRef.current = 0;
      startTimeRef.current = Date.now();
      endTimeRef.current = null;
    }
  };

  const handlePauseFocus = () => {
    if (isTimerActive) {
        stopTimer();
    }
  };
  
  const handleResumeFocus = () => {
      if (!isTimerActive && focusMode && activeFocusTask) {
          // resume by reconstructing times from stored timerValue
          if (focusMode === 'stopwatch') {
            startTimeRef.current = Date.now();
            // accumulatedElapsedRef.current already holds paused elapsed
          } else {
            // for pomodoro/break, timerValue holds remaining seconds when paused
            endTimeRef.current = Date.now() + timerValue * 1000;
          }
          setIsTimerActive(true);
      }
  }

  const handleStopFocus = () => {
    stopTimer();
    // reset refs and UI
    startTimeRef.current = null;
    endTimeRef.current = null;
    accumulatedElapsedRef.current = 0;
    setActiveFocusTaskId(null);
    setFocusMode(null);
    setTimerValue(0);
  }

  const handleCompleteFocusTask = () => {
    stopTimer(focusMode === 'stopwatch'); // Only save stopwatch time, pomodoro saves automatically
    
    if (!dailyPlan || !activeFocusTask) return;
    
    const updatedPlanTasks = dailyPlan.tasks.map(t => {
      if (t.id === activeFocusTask.id) return { ...t, completed: true };
      return t;
    });
    updatePlan({ ...dailyPlan, tasks: updatedPlanTasks });

    // Also mark the corresponding task in the user's environments as completed so summary counts it
    try {
      const envId = activeFocusTask.environmentId;
      if (envId) {
        const updatedEnvironments = user.environments.map(env => {
          if (env.id !== envId) return env;
          const updatedTasks = env.tasks.map(t => t.id === activeFocusTask.id ? { ...t, completed: true } : t);
          return { ...env, tasks: updatedTasks };
        });
        props.updateUser({ ...user, environments: updatedEnvironments });
      }
    } catch (e) {}

    setActiveFocusTaskId(null);
    setFocusMode(null);
    startTimeRef.current = null;
    endTimeRef.current = null;
    accumulatedElapsedRef.current = 0;
    setTimerValue(0);
  }

  // Pass updateUser down
  const handleUpdateEnvironment = (updatedEnv: Environment) => {
      const updatedEnvironments = user.environments.map(env => env.id === updatedEnv.id ? updatedEnv : env);
      props.updateUser({ ...user, environments: updatedEnvironments });
  }

  const handleUpdateTasks = (newTasks: Task[]) => {
    // If the active focus task is removed from environment tasks, stop and clear persisted timer state
    if (activeFocusTaskId && !newTasks.find(t => t.id === activeFocusTaskId)) {
      stopTimer(false);
      clearPersistedTimerState();
      startTimeRef.current = null;
      endTimeRef.current = null;
      accumulatedElapsedRef.current = 0;
      setActiveFocusTaskId(null);
      setFocusMode(null);
      setTimerValue(0);
    }

      const updatedEnv = { ...activeEnvironment, tasks: newTasks };
      handleUpdateEnvironment(updatedEnv);

      // Also sync completion state to dailyPlan if those tasks are part of today's plan
      try {
        if (dailyPlan) {
          const updatedPlanTasks = dailyPlan.tasks.map(pt => {
            const match = newTasks.find(nt => nt.id === pt.id);
            if (!match) return pt;
            return { ...pt, completed: match.completed };
          });
          updatePlan({ ...dailyPlan, tasks: updatedPlanTasks });
        }
      } catch (e) {}
  };
  
  const handleUpdateRoutines = (newRoutines: Routine[]) => {
      props.updateUser({ ...user, routines: newRoutines });
  }

  const handleMovePlanTask = (taskId: string, targetEnvId: string) => {
    if (!dailyPlan) return;
    const updatedPlanTasks = dailyPlan.tasks.map(task => 
      task.id === taskId ? { ...task, environmentId: targetEnvId } : task
    );
    updatePlan({ ...dailyPlan, tasks: updatedPlanTasks });
  };
  
  const handleMoveTask = (taskId: string, targetEnvId: string) => {
    const sourceEnv = activeEnvironment;
    const targetEnv = user.environments.find(env => env.id === targetEnvId);
    const taskToMove = sourceEnv.tasks.find(t => t.id === taskId);

    if (!targetEnv || !taskToMove || sourceEnv.id === targetEnv.id) return;

    const newSourceTasks = sourceEnv.tasks.filter(t => t.id !== taskId);
    const newTargetTasks = [...targetEnv.tasks, { ...taskToMove, environmentId: targetEnvId }];

    const updatedEnvironments = user.environments.map(env => {
        if (env.id === sourceEnv.id) return { ...env, tasks: newSourceTasks };
        if (env.id === targetEnv.id) return { ...env, tasks: newTargetTasks };
        return env;
    });
    
    props.updateUser({ ...user, environments: updatedEnvironments });
  };

  const handleCopyTask = (taskId: string, targetEnvId: string) => {
      const sourceEnv = activeEnvironment;
      const targetEnv = user.environments.find(env => env.id === targetEnvId);
      const taskToCopy = sourceEnv.tasks.find(t => t.id === taskId);

      if (!targetEnv || !taskToCopy) return;

      const copiedTask: Task = { 
          ...taskToCopy, 
          id: Date.now().toString(),
          completed: false, 
          subtasks: taskToCopy.subtasks.map(st => ({...st, id: Date.now().toString() + st.id, completed: false})),
          actualDuration: 0,
          actualPomodoros: 0,
          environmentId: targetEnvId,
      };

      const newTargetTasks = [...targetEnv.tasks, copiedTask];

      const updatedEnvironments = user.environments.map(env => {
          if (env.id === targetEnv.id) return { ...env, tasks: newTargetTasks };
          return env;
      });
      
      props.updateUser({ ...user, environments: updatedEnvironments });
  };
  
  const handleCreateAdHocTask = async (taskString: string) => {
    if (!taskString.trim()) return;

    const envs = user.environments.map(({ id, name }) => ({ id, name }));
    const parsedTask = await parseTaskAndAssignEnvironment(taskString, envs);

    if (!parsedTask) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: parsedTask.taskText,
      completed: false,
      subtasks: [],
      duration: 0,
      actualDuration: 0,
      actualPomodoros: 0,
      environmentId: parsedTask.environmentId,
    };

    const updatedEnvironments = user.environments.map(env => {
        if (env.id === parsedTask.environmentId) {
            return { ...env, tasks: [...env.tasks, newTask] };
        }
        return env;
    });

    props.updateUser({ ...user, environments: updatedEnvironments });
  };
  
  const handleAddRoutineTasks = (routineTasks: Pick<Task, 'text'>[]) => {
    const newTasks: Task[] = routineTasks.map((rt, i) => ({
      id: `${Date.now()}-${i}`,
      text: rt.text,
      completed: false,
      subtasks: [],
      duration: 0,
      actualDuration: 0,
      actualPomodoros: 0,
      environmentId: activeEnvironment.id,
    }));
    handleUpdateTasks([...activeEnvironment.tasks, ...newTasks]);
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const InProgressPanel = () => {
    if(!activeFocusTask || !dailyPlan) {
        return (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                 <p className="text-gray-500 dark:text-gray-400">No task in progress.</p>
                 <p className="text-sm text-gray-400 dark:text-gray-500">Click ▶ on a task to start.</p>
            </div>
        );
    }
    
    const progressText = dailyPlan.unit === 'pomodoros'
        ? `${activeFocusTask.actualPomodoros} / ${activeFocusTask.duration} pomodoros`
        : `${activeFocusTask.actualDuration + Math.floor(timerValue / 60)} / ${activeFocusTask.duration} min`;
    
    const pomodorosCompletedVis = Array.from({ length: activeFocusTask.duration }, (_, i) => i < activeFocusTask.actualPomodoros);

    let progress = 0;
    if(dailyPlan.unit === 'minutes') {
        const totalElapsed = activeFocusTask.actualDuration * 60 + (focusMode === 'stopwatch' ? timerValue : 0);
        progress = activeFocusTask.duration > 0 ? (totalElapsed / (activeFocusTask.duration * 60)) * 100 : 0;
    } else { // pomodoros
        const pomodoroProgress = focusMode === 'pomodoro' ? ((POMODORO_TIME - timerValue) / POMODORO_TIME) : 0;
        progress = activeFocusTask.duration > 0 ? ((activeFocusTask.actualPomodoros + pomodoroProgress) / activeFocusTask.duration) * 100 : 0;
    }

    const focusStatusText = {
        pomodoro: `Focusing... (${activeFocusTask.actualPomodoros + 1} of ${activeFocusTask.duration})`,
        stopwatch: 'Focusing...',
        short_break: 'Short Break',
        long_break: 'Long Break',
    }[focusMode || 'stopwatch'];
    
    return (
        <div 
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-breathing-glow"
            style={{ 
                '--glow-color-start': hexToRgba(user.themeColor, 0.2), 
                '--glow-color-end': hexToRgba(user.themeColor, 0.4),
                animationPlayState: isTimerActive ? 'running' : 'paused'
            } as React.CSSProperties}
        >
            <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{activeFocusTask.text}</p>
            <div className="flex justify-between items-baseline">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{progressText}</p>
                <p className="text-sm font-semibold" style={{color: user.themeColor}}>{focusStatusText}</p>
            </div>
            {dailyPlan.unit === 'pomodoros' && activeFocusTask.duration > 0 && (
                <div className="flex gap-2 my-2">
                    {pomodorosCompletedVis.map((completed, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${completed ? '' : 'bg-gray-300 dark:bg-gray-600'}`} style={{backgroundColor: completed ? user.themeColor : undefined}}></div>
                    ))}
                </div>
            )}
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full" style={{ width: `${progress}%`, backgroundColor: user.themeColor, transition: 'width 0.5s linear' }}></div>
            </div>
            
            <p className="text-center text-5xl font-mono font-bold my-4 text-gray-800 dark:text-white">{formatTime(timerValue)}</p>

            <div className="flex items-center justify-center gap-4 mt-2">
                {!focusMode?.includes('break') && (isTimerActive 
                    ? <button onClick={handlePauseFocus} className="p-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><PauseIcon className="w-6 h-6" /></button>
                    : <button onClick={handleResumeFocus} className="p-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><PlayIcon className="w-6 h-6" /></button>
                )}

                {!focusMode?.includes('break') && (
                    <button onClick={handleStopFocus} className="p-3 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <StopIcon className="w-6 h-6"/>
                    </button>
                )}

                {focusMode?.includes('break') && (
                    <button onClick={() => { setIsTimerActive(false); setFocusMode(null); }} className="text-sm font-semibold text-gray-500 dark:text-gray-400">Skip Break</button>
                )}

                 <button 
                    onClick={handleCompleteFocusTask}
                    className="flex items-center gap-2 px-4 py-2 font-semibold text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
                >
                    <CheckCircleIcon className="w-5 h-5"/>
                    Done
                </button>
            </div>
        </div>
    );
  }

  const mainContent = () => {
    if (!dailyPlan) {
      return <PlanningView user={user} onPlanGenerated={updatePlan} />;
    }
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">
        <div className="lg:col-span-1 space-y-8 animate-slide-in-up">
            <Planner 
              plan={dailyPlan} 
              onUpdatePlan={updatePlan}
              themeColor={user.themeColor} 
              environments={user.environments}
              activeEnvironmentId={activeEnvironment.id}
              onMoveTask={handleMovePlanTask}
              activeFocusTaskId={activeFocusTaskId}
              onStartFocus={handleStartFocus}
            />
        </div>
        <div className="lg:col-span-1 space-y-8 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">In Progress</h2>
                <InProgressPanel />
            </div>
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg">
              <TaskList 
                tasks={activeEnvironment.tasks} 
                onUpdateTasks={handleUpdateTasks} 
                onCreateTask={handleCreateAdHocTask}
                themeColor={user.themeColor} 
                environments={user.environments}
                currentEnvironmentId={activeEnvironment.id}
                onMoveTask={handleMoveTask}
                onCopyTask={handleCopyTask}
              />
            </div>
        </div>
        <div className="space-y-8 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
          <ResourceVault environment={activeEnvironment} onUpdateEnvironment={handleUpdateEnvironment} />
          <RoutineManager routines={user.routines} onUpdateRoutines={handleUpdateRoutines} onAddRoutineTasks={handleAddRoutineTasks} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <WelcomeHeader 
        user={user} 
        onLogout={props.onLogout} 
        theme={props.theme} 
        toggleTheme={props.toggleTheme} 
        onOpenSummary={() => setShowSummary(true)}
        onOpenSettings={() => setShowSettings(true)}
        saveStatus={props.saveStatus}
        />
      {restoredToastVisible && (
        <div className="fixed top-4 right-4 z-50">
          <div className="px-4 py-2 bg-indigo-600 text-white rounded shadow">{restoredMessage}</div>
        </div>
      )}
      
      <EnvironmentSelector user={user} updateUser={props.updateUser} />
      
      <main>
        {mainContent()}
      </main>

  {showSummary && <EndDaySummary user={user} dailyPlan={dailyPlan} onClose={() => setShowSummary(false)} />}
      {showSettings && <Settings user={user} onClose={() => setShowSettings(false)} updateUser={props.updateUser} />}

    </div>
  );
};

export default Dashboard;