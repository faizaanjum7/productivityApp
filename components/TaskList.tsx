import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, Subtask, Environment } from '../types';
import { TrashIcon, PlusIcon, EditIcon, CheckIcon, CloseIcon, EllipsisHorizontalIcon, ArrowRightIcon, DocumentDuplicateIcon } from './icons';

interface TaskListProps {
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onCreateTask: (taskString: string) => void;
  themeColor: string;
  environments: Environment[];
  currentEnvironmentId: string;
  onMoveTask: (taskId: string, targetEnvId: string) => void;
  onCopyTask: (taskId: string, targetEnvId: string) => void;
}

const SubtaskItem: React.FC<{ subtask: Subtask; onToggle: () => void; }> = ({ subtask, onToggle }) => (
    <div className="flex items-center pl-4">
        <input
            type="checkbox"
            checked={subtask.completed}
            onChange={onToggle}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            aria-labelledby={`subtask-${subtask.id}`}
        />
        <span id={`subtask-${subtask.id}`} className={`ml-3 text-sm text-gray-600 dark:text-gray-400 ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
            {subtask.text}
        </span>
    </div>
);


const TaskItem: React.FC<{ 
    task: Task; 
    onUpdate: (updatedTask: Task) => void; 
    onDelete: (id: string) => void;
    themeColor: string;
    environments: Environment[];
    currentEnvironmentId: string;
    onMoveTask: (taskId: string, targetEnvId: string) => void;
    onCopyTask: (taskId: string, targetEnvId: string) => void;
}> = (props) => {
    const { task, onUpdate, onDelete, environments, currentEnvironmentId, onMoveTask, onCopyTask } = props;
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const progress = useMemo(() => {
        if (!task.subtasks || task.subtasks.length === 0) return 0;
        const completedCount = task.subtasks.filter(st => st.completed).length;
        return (completedCount / task.subtasks.length) * 100;
    }, [task.subtasks]);

    const handleToggle = (completed: boolean) => {
        const updatedSubtasks = task.subtasks.map(st => ({ ...st, completed }));
        onUpdate({ ...task, completed, subtasks: updatedSubtasks });
    };

    const handleToggleSubtask = (subtaskId: string) => {
        const updatedSubtasks = task.subtasks.map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
        onUpdate({ ...task, subtasks: updatedSubtasks, completed: allCompleted });
    };

    const handleAddSubtask = (text: string) => {
        const newSubtask: Subtask = { id: Date.now().toString(), text, completed: false };
        const updatedSubtasks = [...task.subtasks, newSubtask];
        onUpdate({ ...task, subtasks: updatedSubtasks, completed: false });
        setIsAddingSubtask(false);
        setNewSubtaskText('');
    };

    const handleEditSubmit = () => {
        if (editText.trim()) {
            onUpdate({ ...task, text: editText.trim() });
            setIsEditing(false);
        }
    };
    
    return (
        <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg group transition-all duration-300 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center flex-grow min-w-0">
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => handleToggle(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        aria-labelledby={`task-${task.id}`}
                    />
                     {isEditing ? (
                        <div className="flex items-center ml-3 w-full gap-2">
                           <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                                autoFocus
                            />
                            <button onClick={handleEditSubmit}><CheckIcon className="w-5 h-5 text-green-500" /></button>
                            <button onClick={() => setIsEditing(false)}><CloseIcon className="w-5 h-5 text-red-500" /></button>
                        </div>
                    ) : (
                         <span id={`task-${task.id}`} className={`ml-3 text-gray-700 dark:text-gray-300 truncate ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                            {task.text}
                        </span>
                    )}
                </div>
                {!isEditing && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setIsAddingSubtask(prev => !prev)} className="p-1 text-gray-400 hover:text-indigo-500" aria-label={`Add sub-task to ${task.text}`}>
                          <PlusIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-indigo-500" aria-label={`Edit task: ${task.text}`}>
                          <EditIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-1 text-gray-400 hover:text-indigo-500" aria-label="More options">
                        <EllipsisHorizontalIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-500" aria-label={`Delete task: ${task.text}`}>
                          <TrashIcon className="w-4 h-4" />
                      </button>
                  </div>
                )}
            </div>
            
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: props.themeColor }}></div>
                    </div>
                    {task.subtasks.map(st => (
                        <SubtaskItem key={st.id} subtask={st} onToggle={() => handleToggleSubtask(st.id)} />
                    ))}
                </div>
            )}
            
            {isAddingSubtask && (
                 <form onSubmit={(e) => { e.preventDefault(); handleAddSubtask(newSubtaskText); }} className="ml-8 mt-2 flex gap-2">
                    <input
                        type="text" value={newSubtaskText} onChange={(e) => setNewSubtaskText(e.target.value)}
                        placeholder="Add a new step..."
                        className="flex-grow px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 border-2 border-transparent rounded-md focus:border-indigo-500 focus:outline-none focus:ring-0 transition"
                        autoFocus
                    />
                    <button type="submit" className="px-3 py-1 text-xs font-semibold text-white bg-indigo-500 rounded-md hover:bg-indigo-600">Add</button>
                 </form>
            )}

            {isMenuOpen && (
                <div ref={menuRef} className="absolute top-8 right-0 z-10 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                   <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2">Actions</p>
                   {environments.map(env => (
                       <div key={env.id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 p-1">
                           <span className="flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full" style={{backgroundColor: env.color}}></span>
                               {env.name}
                           </span>
                           <div className="flex items-center gap-1">
                            {env.id !== currentEnvironmentId &&
                               <button title="Move" onClick={() => { onMoveTask(task.id, env.id); setIsMenuOpen(false); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                   <ArrowRightIcon className="w-4 h-4 text-gray-500"/>
                               </button>
                            }
                               <button title="Copy" onClick={() => { onCopyTask(task.id, env.id); setIsMenuOpen(false); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                   <DocumentDuplicateIcon className="w-4 h-4 text-gray-500"/>
                               </button>
                           </div>
                       </div>
                   ))}
                </div>
            )}
        </div>
    );
};


const TaskList: React.FC<TaskListProps> = (props) => {
  const { tasks, onUpdateTasks, onCreateTask } = props;
  const [newTaskText, setNewTaskText] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      onCreateTask(newTaskText);
      setNewTaskText('');
    }
  };
  
  const handleUpdateTask = (updatedTask: Task) => {
    onUpdateTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteTask = (id: string) => {
    onUpdateTasks(tasks.filter(task => task.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Ad-hoc Tasks</h2>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">
            {tasks.filter(t => t.completed).length} / {tasks.length} Done
        </span>
      </div>
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add task... e.g., Read chapter 5 (Academics)"
          className="flex-grow px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-0 transition"
          aria-label="New task input"
        />
        <button type="submit" className="px-4 py-2 font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors">
          Add
        </button>
      </form>
      <div className="space-y-2">
          {tasks.length > 0 ? tasks.map(task => (
              <TaskItem 
                key={task.id} task={task} 
                onUpdate={handleUpdateTask} 
                onDelete={handleDeleteTask}
                {...props}
              />
          )) : <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">No ad-hoc tasks yet.</p>}
      </div>
    </div>
  );
};

export default TaskList;