import React, { useState } from 'react';
import { User, Environment } from '../types';
import { THEME_COLORS } from '../constants';
import { TrashIcon, PlusIcon } from './icons';

interface OnboardingProps {
  user: User;
  onComplete: (user: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [name, setName] = useState(user.name);
  const [themeColor, setThemeColor] = useState(user.themeColor);
  const [environments, setEnvironments] = useState<Environment[]>(user.environments);

  const handleEnvChange = (id: string, newName: string) => {
    setEnvironments(envs => envs.map(env => env.id === id ? { ...env, name: newName } : env));
  };

  const handleAddEnv = () => {
    const newEnv: Environment = {
        id: Date.now().toString(),
        name: "New Environment",
        color: THEME_COLORS[environments.length % THEME_COLORS.length],
        tasks: [],
        resources: []
    };
    setEnvironments(envs => [...envs, newEnv]);
  }

  const handleDeleteEnv = (id: string) => {
    setEnvironments(envs => envs.filter(env => env.id !== id));
  }

  const handleSubmit = () => {
    onComplete({ ...user, name, themeColor, environments, activeEnvironmentId: environments[0]?.id || null });
  };

  return (
    <div className="flex items-center justify-center min-h-screen animate-fade-in p-4">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome to Skylar, {user.name}!</h1>
            <p className="text-gray-600 dark:text-gray-300">Let's set up your calm space.</p>
        </div>
        
        <div className="space-y-4">
            <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">1. Confirm your name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg focus:border-indigo-500 focus:outline-none"/>
        </div>

        <div className="space-y-4">
            <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">2. Choose your theme color</label>
            <div className="flex justify-center space-x-3">
                {THEME_COLORS.map(color => (
                    // FIX: Replaced invalid `ringColor` style property with `--tw-ring-color` CSS variable to work with Tailwind's ring utilities.
// FIX: Cast style object to React.CSSProperties to allow CSS custom property '--tw-ring-color'.
<button key={color} onClick={() => setThemeColor(color)} className={`w-10 h-10 rounded-full transition-transform transform hover:scale-110 ${themeColor === color ? 'ring-4 ring-offset-2 dark:ring-offset-gray-800' : ''}`} style={{ backgroundColor: color, '--tw-ring-color': color } as React.CSSProperties}/>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">3. Set up your environments</label>
                <button onClick={handleAddEnv} className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-500 rounded-full hover:bg-indigo-600 transition">
                    <PlusIcon className="w-4 h-4" /> Add
                </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Environments are spaces for different parts of your life, like 'Work' or 'Study'.</p>
            <div className="space-y-2">
                {environments.map(env => (
                    <div key={env.id} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: env.color }}></span>
                        <input type="text" value={env.name} onChange={e => handleEnvChange(env.id, e.target.value)} className="flex-grow px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-md" />
                        <button onClick={() => handleDeleteEnv(env.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                ))}
            </div>
        </div>
        
        <button onClick={handleSubmit} className="w-full px-4 py-3 font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-transform transform hover:scale-105">
            Let's Go!
        </button>

      </div>
    </div>
  );
};

export default Onboarding;