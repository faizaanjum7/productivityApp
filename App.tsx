import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, DailyPlan } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';

export const STORAGE_KEYS = {
  USER: 'skylarUser',
  USER_BACKUP: 'skylarUser_backup',
  DAILY_PLAN: 'skylarDailyPlan',
  THEME: 'skylarTheme',
  LAST_BACKUP: 'skylarLastBackup'
} as const;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingLogout, setPendingLogout] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  // Backup user data every hour
  const backupUserData = useCallback((userData: User) => {
    try {
      const now = Date.now();
      const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      
      // Only backup once per hour
      if (lastBackup && (now - parseInt(lastBackup)) < 3600000) {
        return;
      }
      
      // Save current user data as backup
      localStorage.setItem(STORAGE_KEYS.USER_BACKUP, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, now.toString());
    } catch (error) {
      console.error("Failed to backup user data", error);
    }
  }, []);

  // Try to recover from backup if main data is corrupted
  const tryRecoverFromBackup = useCallback((): User | null => {
    try {
      const backupData = localStorage.getItem(STORAGE_KEYS.USER_BACKUP);
      if (backupData) {
        const parsed = JSON.parse(backupData);
        if (parsed && parsed.name) {
          localStorage.setItem(STORAGE_KEYS.USER, backupData);
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to recover from backup", error);
    }
    return null;
  }, []);

  // Export user data
  const exportUserData = useCallback((userData: User) => {
    try {
      const data = {
        user: userData,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skylar-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error("Failed to export data", error);
      return false;
    }
  }, []);

  // Import user data
  const importUserData = useCallback((file: File): Promise<{success: boolean, user?: User, error?: string}> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data && data.user && data.user.name && data.user.environments) {
            // Validate the imported data structure
            const userData = data.user as User;
            resolve({ success: true, user: userData });
          } else {
            resolve({ success: false, error: 'Invalid data format' });
          }
        } catch (error) {
          console.error("Failed to parse imported file", error);
          resolve({ success: false, error: 'Invalid file format' });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };
      reader.readAsText(file);
    });
  }, []);

  // Load saved data on initial render
  useEffect(() => {
    try {
      // Try to load user data
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Corrupted user data, trying to recover from backup");
          const recoveredUser = tryRecoverFromBackup();
          if (recoveredUser) {
            setUser(recoveredUser);
          }
        }
      }

      // Load daily plan
      const today = new Date().toISOString().slice(0, 10);
      const savedPlan = localStorage.getItem(STORAGE_KEYS.DAILY_PLAN);
      if (savedPlan) {
        try {
          const parsedPlan = JSON.parse(savedPlan);
          if (parsedPlan.date === today) {
            setDailyPlan(parsedPlan);
          } else {
            localStorage.removeItem(STORAGE_KEYS.DAILY_PLAN);
          }
        } catch (e) {
          console.error("Failed to parse daily plan", e);
          localStorage.removeItem(STORAGE_KEYS.DAILY_PLAN);
        }
      }
    } catch (error) {
      console.error("Failed to load data", error);
      // Try to recover from backup
      const recoveredUser = tryRecoverFromBackup();
      if (recoveredUser) {
        setUser(recoveredUser);
      }
    }

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const triggerSaveStatus = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus('saved');
      saveTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 1500);
    }, 500);
  };

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    try {
      const userString = JSON.stringify(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, userString);
      // Create a backup in case of corruption
      backupUserData(updatedUser);
      triggerSaveStatus();
    } catch (e) {
      setSaveStatus('error');
      console.error("Failed to save user data", e);
    }
  }, [backupUserData]);

  const handleUpdatePlan = useCallback((plan: DailyPlan | null) => {
    setDailyPlan(plan);
    try {
      if (plan) {
        localStorage.setItem(STORAGE_KEYS.DAILY_PLAN, JSON.stringify(plan));
      } else {
        localStorage.removeItem(STORAGE_KEYS.DAILY_PLAN);
      }
      triggerSaveStatus();
    } catch (e) {
      setSaveStatus('error');
      console.error("Failed to save plan data", e);
    }
  }, []);

  const handleLogin = (newUser: User) => {
    // Check if this is a returning user by looking for existing data
    const existingUser = localStorage.getItem(STORAGE_KEYS.USER);
    const isFirstTime = !existingUser;
    
    if (existingUser) {
      try {
        // If user exists, merge any new data with existing data
        const existingUserData = JSON.parse(existingUser);
        const mergedUser = {
          ...existingUserData,
          // Only update fields that should change on login
          lastLogin: new Date().toISOString(),
          // Preserve existing data
          environments: existingUserData.environments || newUser.environments || [],
          // Update other fields from new login
          name: newUser.name,
          themeColor: newUser.themeColor,
          // Keep any existing data that wasn't in the new user object
          ...newUser
        };
        handleUpdateUser(mergedUser);
      } catch (e) {
        console.error('Error merging user data, using new user data', e);
        handleUpdateUser(newUser);
      }
    } else {
      handleUpdateUser(newUser);
    }
    
    setShowOnboarding(isFirstTime);
  };

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setPendingLogout(true);
    // Only clear the user from state, keeping all data in localStorage
    setUser(null);
    setDailyPlan(null);
    setShowLogoutConfirm(false);
    setPendingLogout(false);
  }, []);

  const cancelLogout = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);
  
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  const handleOnboardingComplete = (updatedUser: User) => {
    handleUpdateUser(updatedUser);
    setShowOnboarding(false);
  };

  // Logout confirmation dialog
  const LogoutConfirmation = () => (
    showLogoutConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Confirm Logout</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to log out? All your data will be saved and available when you log back in.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={cancelLogout}
              disabled={pendingLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              disabled={pendingLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {pendingLogout ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging out...
                </>
              ) : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    )
  );

  const renderContent = () => {
    if (!user) {
      return <Login onLogin={handleLogin} />;
    }
    if (showOnboarding) {
      return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
    }
    return (
      <Dashboard 
        user={user}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
        updateUser={handleUpdateUser}
        dailyPlan={dailyPlan}
        updatePlan={handleUpdatePlan}
        saveStatus={saveStatus}
      />
    );
  };

  // App context value
  const appContextValue = {
    user,
    dailyPlan,
    theme,
    saveStatus,
    updateUser: handleUpdateUser,
    updatePlan: handleUpdatePlan,
    onLogin: handleLogin,
    onLogout: handleLogout,
    toggleTheme,
    exportData: () => user ? exportUserData(user) : false,
    importData: importUserData,
    clearAllData: () => {
      if (window.confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
        localStorage.clear();
        setUser(null);
        setDailyPlan(null);
        return true;
      }
      return false;
    }
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-500 font-sans">
        {renderContent()}
        <LogoutConfirmation />
      </div>
    </AppContext.Provider>
  );
};

// Create a context for app-wide state and actions
export const AppContext = React.createContext<{
  user: User | null;
  dailyPlan: DailyPlan | null;
  theme: 'light' | 'dark';
  saveStatus: SaveStatus;
  updateUser: (user: User) => void;
  updatePlan: (plan: DailyPlan | null) => void;
  onLogin: (user: User) => void;
  onLogout: () => void;
  toggleTheme: () => void;
  exportData: () => boolean;
  importData: (file: File) => Promise<{success: boolean, user?: User, error?: string}>;
  clearAllData: () => boolean;
}>({
  user: null,
  dailyPlan: null,
  theme: 'light',
  saveStatus: 'idle',
  updateUser: () => {},
  updatePlan: () => {},
  onLogin: () => {},
  onLogout: () => {},
  toggleTheme: () => {},
  exportData: () => false,
  importData: async () => ({ success: false, error: 'Not implemented' }),
  clearAllData: () => false
});

export default App;