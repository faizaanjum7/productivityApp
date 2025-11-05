import React, { useState } from 'react';
import { User } from '../types';
import { CloseIcon, CheckIcon } from './icons';
import { THEME_COLORS } from '../constants';

interface SettingsProps {
  user: User;
  onClose: () => void;
  updateUser: (user: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onClose, updateUser }) => {
    const [name, setName] = useState(user.name);
    const [themeColor, setThemeColor] = useState(user.themeColor);
    const [praise1, setPraise1] = useState(user.praisePhrases[0]);
    const [praise2, setPraise2] = useState(user.praisePhrases[1]);
    const [praise3, setPraise3] = useState(user.praisePhrases[2]);

    const handleSave = () => {
        updateUser({
            ...user,
            name,
            themeColor,
            praisePhrases: [praise1, praise2, praise3]
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 space-y-6 relative animate-modal-in" 
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <CloseIcon />
                </button>
                
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>

                <div className="space-y-4">
                    <label className="block text-md font-semibold text-gray-700 dark:text-gray-300">Your Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"/>
                </div>

                 <div className="space-y-4">
                    <label className="block text-md font-semibold text-gray-700 dark:text-gray-300">Theme Color</label>
                    <div className="flex space-x-3">
                        {THEME_COLORS.map(color => (
                            // FIX: Replaced invalid `ringColor` style property with `--tw-ring-color` CSS variable to work with Tailwind's ring utilities.
// FIX: Cast style object to React.CSSProperties to allow CSS custom property '--tw-ring-color'.
<button key={color} onClick={() => setThemeColor(color)} className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${themeColor === color ? 'ring-4 ring-offset-2 dark:ring-offset-gray-800' : ''}`} style={{ backgroundColor: color, '--tw-ring-color': color } as React.CSSProperties}/>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="block text-md font-semibold text-gray-700 dark:text-gray-300">Encouragement Phrases</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Skylar will use these to celebrate your progress.</p>
                    <div className="space-y-2">
                         <input type="text" value={praise1} onChange={e => setPraise1(e.target.value)} className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg"/>
                         <input type="text" value={praise2} onChange={e => setPraise2(e.target.value)} className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg"/>
                         <input type="text" value={praise3} onChange={e => setPraise3(e.target.value)} className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg"/>
                    </div>
                </div>

                <button onClick={handleSave} className="w-full mt-4 px-4 py-3 font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 flex items-center justify-center gap-2">
                    <CheckIcon className="w-5 h-5" /> Save Changes
                </button>
            </div>
        </div>
    );
};

export default Settings;