import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUserRole } from '../hooks/useUserRole';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isSuperAdmin, canManage } = useUserRole();

  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        setCurrentUser(user);

        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (isMounted && profile) {
          setUserProfile(profile);
        }
      } catch (err) {
        console.error('Error loading user profile in sidebar:', err);
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, []);

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
    { name: 'Dashboard', path: '/dashboard', aliases: ['/dashboard'], icon: '📊', visible: true },
    { name: 'New Project', path: '/create-project', aliases: ['/create-project', '/new-project'], icon: '➕', visible: canManage },
    { name: 'New Task', path: '/create-task', aliases: ['/create-task', '/new-task'], icon: '📝', visible: canManage },
    { name: 'Task Board', path: '/kanban', aliases: ['/kanban', '/task-board'], icon: '📋', visible: true },
    { name: 'Team', path: '/add-member', aliases: ['/add-member', '/team'], icon: '👥', visible: isSuperAdmin },
  ].filter((item) => item.visible);

  const getRoleBadge = (currentRole) => {
    const r = (currentRole || role)?.toLowerCase();
    if (r === 'super_admin') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Super Admin
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
        Member
      </span>
    );
  };

  const userName =
    userProfile?.full_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const userRole = userProfile?.role || role || 'member';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <aside className="w-64 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/70 flex flex-col justify-between shrink-0 min-h-screen z-30 font-sans select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/60">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <span className="text-blue-500 text-xl font-bold transition-transform group-hover:scale-110">⚡</span>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
              TaskFlow
            </span>
          </Link>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/40">
            PRO
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navLinks.map((item) => {
            const isActive =
              location.pathname === item.path ||
              item.aliases.includes(location.pathname) ||
              (item.path === '/create-project' && location.pathname.startsWith('/project/'));

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout Section */}
      <div className="p-4 bg-slate-950/50">
        {/* User Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md shadow-blue-500/20">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-100 truncate leading-tight">
              {userName}
            </p>
            <div className="mt-1 flex items-center">
              {getRoleBadge(userRole)}
            </div>
          </div>
        </div>

        {/* Thin Divider */}
        <div className="border-t border-slate-800/80 my-2" />

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border border-transparent hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
