import React, { useState } from 'react';
import { User, Environment } from '../types';
import { PlusIcon, EditIcon, TrashIcon, CheckIcon, CloseIcon } from './icons';
import { THEME_COLORS } from '../constants';

interface EnvironmentSelectorProps {
  user: User;
  updateUser: (user: User) => void;
}

const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({ user, updateUser }) => {
    const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
    const [editingEnvName, setEditingEnvName] = useState('');

    const handleSelectEnv = (id: string) => {
        if (editingEnvId !== id) {
            handleCancelEdit();
            updateUser({ ...user, activeEnvironmentId: id });
        }
    };

    const handleStartEdit = (env: Environment) => {
        setEditingEnvId(env.id);
        setEditingEnvName(env.name);
    }
    
    const handleCancelEdit = () => {
        setEditingEnvId(null);
        setEditingEnvName('');
    }

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!editingEnvId || !editingEnvName.trim()) return;
        const updatedEnvs = user.environments.map(env => 
            env.id === editingEnvId ? { ...env, name: editingEnvName.trim() } : env
        );
        updateUser({ ...user, environments: updatedEnvs });
        handleCancelEdit();
    }

    const handleAddEnv = () => {
        const newEnv: Environment = {
            id: Date.now().toString(),
            name: "New Space",
            color: THEME_COLORS[user.environments.length % THEME_COLORS.length],
            tasks: [],
            resources: []
        };
        const updatedEnvs = [...user.environments, newEnv];
        updateUser({ ...user, environments: updatedEnvs, activeEnvironmentId: newEnv.id });
    }

    const handleDeleteEnv = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (user.environments.length <= 1) return; // Prevent deleting the last environment
        const updatedEnvs = user.environments.filter(env => env.id !== id);
        const newActiveId = user.activeEnvironmentId === id ? updatedEnvs[0]?.id || null : user.activeEnvironmentId;
        updateUser({ ...user, environments: updatedEnvs, activeEnvironmentId: newActiveId });
    }

    return (
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 space-x-1 pb-2 overflow-x-auto">
            {user.environments.map(env => {
                const isActive = user.activeEnvironmentId === env.id;
                const isEditing = editingEnvId === env.id;
                
                return (
                    <div key={env.id} className="group relative flex-shrink-0">
                        <button
                            onClick={() => handleSelectEnv(env.id)}
                            className={`flex items-center justify-between w-full gap-4 pl-3 pr-2 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                                isActive 
                                ? 'text-white border-b-2' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                             style={isActive ? { backgroundColor: env.color, borderColor: env.color } : {}}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: env.color }}></span>
                                {isEditing ? (
                                    <input type="text" value={editingEnvName} 
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setEditingEnvName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(e as any)}
                                        className="w-32 text-sm bg-transparent outline-none ring-0 border-b border-white/50" autoFocus />
                                ) : (
                                    <span>{env.name}</span>
                                )}
                            </div>
                            
                            <div className="flex items-center">
                                {isActive && isEditing ? (
                                    <>
                                        <div onClick={handleSaveEdit} className="p-1 rounded-full hover:bg-white/20"><CheckIcon className="w-4 h-4" /></div>
                                        <div onClick={(e) => { e.stopPropagation(); handleCancelEdit();}} className="p-1 rounded-full hover:bg-white/20"><CloseIcon className="w-4 h-4" /></div>
                                    </>
                                ) : isActive ? (
                                    <div className="flex opacity-30 group-hover:opacity-100 transition-opacity">
                                        <div onClick={(e) => { e.stopPropagation(); handleStartEdit(env)}} className="p-1 rounded-full hover:bg-white/20"><EditIcon className="w-3 h-3" /></div>
                                        {user.environments.length > 1 &&
                                            <div onClick={(e) => handleDeleteEnv(e, env.id)} className="p-1 rounded-full hover:bg-white/20"><TrashIcon className="w-3 h-3" /></div>
                                        }
                                    </div>
                                ) : null}
                           </div>
                        </button>
                    </div>
                )}
            )}
            <button onClick={handleAddEnv} className="p-2 text-gray-400 hover:text-indigo-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <PlusIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default EnvironmentSelector;