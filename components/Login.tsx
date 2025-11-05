import React, { useState } from 'react';
import { User } from '../types';
import { DEFAULT_USER } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const newUser: User = {
        name: name.trim(),
        ...DEFAULT_USER
      };
      onLogin(newUser);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen animate-fade-in">
      <div className="w-full max-w-md p-8 space-y-8 bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl shadow-2xl text-center">
        <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Welcome to Skylar</h1>
            <p className="text-gray-600 dark:text-gray-300">Your calm space for focus and productivity.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="sr-only">What should we call you?</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-lg text-center text-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0 transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-3 font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-transform transform hover:scale-105"
          >
            Begin
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
