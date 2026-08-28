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
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

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
    {
      name: 'Dashboard',
      path: '/dashboard',
      aliases: ['/dashboard'],
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ),
      visible: true,
    },
    {
      name: 'All Projects',
      path: '/projects',
      aliases: ['/projects'],
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      visible: true,
    },
    {
      name: 'Task Board',
      path: '/kanban',
      aliases: ['/kanban', '/task-board'],
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      visible: true,
    },
    {
      name: 'Team',
      path: '/add-member',
      aliases: ['/add-member', '/team'],
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      visible: canManage || isSuperAdmin,
    },
  ].filter((item) => item.visible);

  const getRoleBadge = (currentRole) => {
    const r = (currentRole || role)?.toLowerCase();
    if (r === 'super_admin') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Super Admin
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
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
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/70 flex flex-col justify-between shrink-0 min-h-screen z-30 font-sans select-none transition-all duration-300 ease-in-out relative`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          } border-b border-slate-800/60 relative`}
        >
          {!collapsed ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2.5 group overflow-hidden">
                <span className="text-blue-500 text-xl font-bold transition-transform group-hover:scale-110">
                  ⚡
                </span>
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors truncate">
                  TaskFlow
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/40">
                  PRO
                </span>
              </Link>
              {/* Collapse button (Left arrow when expanded) */}
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="p-2 rounded-lg text-blue-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className={`p-2 space-y-1.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navLinks.map((item) => {
            const isActive =
              location.pathname === item.path ||
              item.aliases.includes(location.pathname) ||
              (item.path === '/projects' && location.pathname.startsWith('/project/'));

            return (
              <div key={item.name} className="relative group">
                <Link
                  to={item.path}
                  className={`flex items-center ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70'
                  }`}
                >
                  <span className="flex items-center justify-center">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>

                {/* Floating Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout Section */}
      <div className={`p-2 bg-slate-950/50 ${collapsed ? 'px-2' : 'p-3'}`}>
        {!collapsed ? (
          <>
            {/* User Card */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 mb-2">
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
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* User Avatar with Tooltip */}
            <div className="relative group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md shadow-blue-500/20 cursor-default">
                {userInitials}
              </div>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">
                <p className="font-bold">{userName}</p>
                <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
              </div>
            </div>

            {/* Logout Icon Button with Tooltip */}
            <div className="relative group w-full">
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="w-full flex items-center justify-center p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-rose-300 text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">
                Logout
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
