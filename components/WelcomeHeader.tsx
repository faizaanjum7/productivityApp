import React from 'react';
import { User } from '../types';
import { SunIcon, MoonIcon, LogoutIcon, SettingsIcon, ChartBarIcon } from './icons';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface WelcomeHeaderProps {
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenSummary: () => void;
  saveStatus: SaveStatus;
}

const SaveStatusIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => {
    if (status === 'idle') {
        return null;
    }
    
    const messages = {
        saving: 'Saving...',
        saved: 'Saved!',
        error: 'Error saving'
    };
    
    const colors = {
        saving: 'text-gray-500 dark:text-gray-400',
        saved: 'text-green-500',
        error: 'text-red-500'
    };

    // FIX: The original code had a redundant `if` statement and a ternary expression `status !== 'idle'` that caused a TypeScript error.
    // Because of the `if (status === 'idle')` check above, `status` can never be 'idle' here, making the comparison invalid for the narrowed type.
    // This simplified version correctly renders the status when it's not 'idle' and resolves the error.
    if (status === 'saving' || status === 'saved' || status === 'error') {
        return (
            <div className={`text-xs font-medium transition-opacity duration-300 opacity-100 ${colors[status]}`}>
                {messages[status]}
            </div>
        );
    }
    
    return null;
};

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ user, onLogout, theme, toggleTheme, onOpenSettings, onOpenSummary, saveStatus }) => {
  return (
    <header className="flex items-center justify-between p-4 sm:p-6 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
        Hello, <span style={{ color: user.themeColor }}>{user.name}</span>
      </h1>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <SaveStatusIndicator status={saveStatus} />
        <button
          onClick={onOpenSummary}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="View day summary"
        >
          <ChartBarIcon className="w-5 h-5" />
        </button>
         <button
          onClick={onOpenSettings}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
        </button>
        <button
          onClick={onLogout}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Logout"
        >
          <LogoutIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default WelcomeHeader;