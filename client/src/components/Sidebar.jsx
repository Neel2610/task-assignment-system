import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err.message);
      navigate('/');
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Create Project', path: '/create-project', icon: '➕' },
    { name: 'Create Task', path: '/create-task', icon: '📝' },
    { name: 'Kanban Board', path: '/kanban', icon: '📋' },
    { name: 'Add Member', path: '/add-member', icon: '👤' },
  ];

  return (
    <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col justify-between shrink-0 min-h-screen z-30">
      <div>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/60">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-blue-500 animate-pulse">⚡</span> TaskFlow
          </span>
        </div>

        <nav className="p-4 space-y-1.5">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
