import React, { useState } from 'react';
import { Routine, Task } from '../types';
import { PlusIcon, TrashIcon, EditIcon, CheckIcon, CloseIcon } from './icons';

interface RoutineManagerProps {
  routines: Routine[];
  onUpdateRoutines: (routines: Routine[]) => void;
  onAddRoutineTasks: (tasks: Pick<Task, 'text'>[]) => void;
}

const RoutineItem: React.FC<{
  routine: Routine,
  onUpdate: (updatedRoutine: Routine) => void,
  onDelete: (id: string) => void,
  onAddTasks: () => void,
}> = ({ routine, onUpdate, onDelete, onAddTasks }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(routine.name);
    const [editedTasks, setEditedTasks] = useState(routine.tasks.map(t => t.text).join('\n'));

    const handleSave = () => {
        const updatedTasks = editedTasks.split('\n').filter(t => t.trim() !== '').map(text => ({ text }));
        onUpdate({
            ...routine,
            name: editedName,
            tasks: updatedTasks
        });
        setIsEditing(false);
    }
    
    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
            {isEditing ? (
                 <div className="space-y-2">
                    <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} className="w-full font-semibold bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded" />
                    <textarea value={editedTasks} onChange={e => setEditedTasks(e.target.value)} rows={3} className="w-full text-sm bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded" placeholder="One task per line"></textarea>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsEditing(false)}><CloseIcon className="w-5 h-5 text-red-500"/></button>
                        <button onClick={handleSave}><CheckIcon className="w-5 h-5 text-green-500"/></button>
                    </div>
                 </div>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">{routine.name}</h3>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-indigo-500"><EditIcon className="w-4 h-4" /></button>
                             <button onClick={() => onDelete(routine.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                             <button onClick={onAddTasks}
                                className="flex items-center gap-1 ml-2 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900 transition"
                                >
                                <PlusIcon className="w-3 h-3"/> Add
                            </button>
                        </div>
                    </div>
                    <ul className="mt-2 ml-4 list-disc list-inside text-sm text-gray-500 dark:text-gray-400">
                        {routine.tasks.map((task, index) => <li key={index}>{task.text}</li>)}
                    </ul>
                </>
            )}
        </div>
    );
}

const RoutineManager: React.FC<RoutineManagerProps> = ({ routines, onUpdateRoutines, onAddRoutineTasks }) => {
    const handleAddRoutine = () => {
        const newRoutine: Routine = {
            id: Date.now().toString(),
            name: 'New Routine',
            tasks: [{ text: 'Task 1' }]
        };
        onUpdateRoutines([...routines, newRoutine]);
    };

    const handleUpdateRoutine = (updatedRoutine: Routine) => {
        onUpdateRoutines(routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r));
    }

    const handleDeleteRoutine = (id: string) => {
        onUpdateRoutines(routines.filter(r => r.id !== id));
    }

  return (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Routines</h2>
        <button onClick={handleAddRoutine} className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-500 rounded-full hover:bg-indigo-600 transition">
            <PlusIcon className="w-4 h-4"/> New
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {routines.map(routine => (
            <RoutineItem 
                key={routine.id}
                routine={routine}
                onUpdate={handleUpdateRoutine}
                onDelete={handleDeleteRoutine}
                onAddTasks={() => onAddRoutineTasks(routine.tasks)}
            />
        ))}
      </div>
    </div>
  );
};

export default RoutineManager;
