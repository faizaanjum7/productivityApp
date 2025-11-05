import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, DailyPlan } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('skylarUser');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      const today = new Date().toISOString().slice(0, 10);
      const savedPlan = localStorage.getItem('skylarDailyPlan');
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan);
        if (parsedPlan.date === today) {
          setDailyPlan(parsedPlan);
        } else {
          localStorage.removeItem('skylarDailyPlan');
        }
      }

    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      localStorage.removeItem('skylarUser');
      localStorage.removeItem('skylarDailyPlan');
    }

    const savedTheme = localStorage.getItem('skylarTheme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('skylarTheme', theme);
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
        }, 1500); // Keep 'Saved' message for 1.5s
    }, 500); // Show 'Saving...' for 0.5s
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    try {
        localStorage.setItem('skylarUser', JSON.stringify(updatedUser));
        triggerSaveStatus();
    } catch (e) {
        setSaveStatus('error');
        console.error("Failed to save user data", e);
    }
  }

  const handleUpdatePlan = (plan: DailyPlan | null) => {
    setDailyPlan(plan);
    try {
        if (plan) {
            localStorage.setItem('skylarDailyPlan', JSON.stringify(plan));
        } else {
            localStorage.removeItem('skylarDailyPlan');
        }
        triggerSaveStatus();
    } catch (e) {
        setSaveStatus('error');
        console.error("Failed to save plan data", e);
    }
  }

  const handleLogin = (newUser: User) => {
    const isFirstTime = !localStorage.getItem('skylarUser');
    handleUpdateUser(newUser); // Centralize saving logic and status updates
    if (isFirstTime) {
        setShowOnboarding(true);
    }
  };
  
  const handleLogout = useCallback(() => {
    setUser(null);
    setDailyPlan(null);
    localStorage.removeItem('skylarUser');
    localStorage.removeItem('skylarDailyPlan');
  }, []);
  
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  const handleOnboardingComplete = (updatedUser: User) => {
    handleUpdateUser(updatedUser);
    setShowOnboarding(false);
  }

  const renderContent = () => {
    if (!user) {
      return <Login onLogin={handleLogin} />;
    }
    if (showOnboarding) {
        return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
    }
    return <Dashboard 
              user={user} 
              onLogout={handleLogout} 
              theme={theme} 
              toggleTheme={toggleTheme} 
              updateUser={handleUpdateUser}
              dailyPlan={dailyPlan}
              updatePlan={handleUpdatePlan}
              saveStatus={saveStatus}
            />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-500 font-sans">
      {renderContent()}
    </div>
  );
};

export default App;
