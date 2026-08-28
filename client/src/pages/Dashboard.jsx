import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isSuperAdmin, isAdmin, canManage } = useUserRole();

  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(location.state?.error || null);

  // Global Analytics State
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    totalMembers: 0,
  });

  // Recent Activity State
  const [recentActivities, setRecentActivities] = useState([]);

  function timeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.max(0, Math.floor((now - date) / 1000));
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Authenticate User
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/');
        return;
      }

      setCurrentUser(user);

      // Fetch user profile from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const effectiveRole = profile?.role || role || 'member';
      setUserProfile(
        profile || {
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: effectiveRole,
          email: user.email,
        }
      );

      // 1. Fetch Projects (same role logic as before)
      let fetchedProjectList = [];
      if (effectiveRole === 'super_admin') {
        const { data: allProjects, error: allProjectsErr } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (allProjectsErr) throw allProjectsErr;
        fetchedProjectList = allProjects || [];
      } else if (effectiveRole === 'admin') {
        const { data: ownedProjects, error: ownedError } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', user.id);

        if (ownedError) throw ownedError;

        const { data: memberProjects, error: memberError } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        let memberProjectList = [];
        const memberProjectIds = (memberProjects || [])
          .map((m) => m.project_id)
          .filter(Boolean);

        if (memberProjectIds.length > 0) {
          const { data: fetchedProjects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .in('id', memberProjectIds);

          if (projectsError) throw projectsError;
          memberProjectList = fetchedProjects || [];
        }

        const combined = [...(ownedProjects || []), ...memberProjectList];
        fetchedProjectList = combined.filter(
          (p, i, arr) => p && p.id && arr.findIndex((x) => x && x.id === p.id) === i
        );
        fetchedProjectList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      } else {
        const { data: memberProjects, error: memberError } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        const memberProjectIds = (memberProjects || [])
          .map((m) => m.project_id)
          .filter(Boolean);

        if (memberProjectIds.length > 0) {
          const { data: fetchedProjects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .in('id', memberProjectIds);

          if (projectsError) throw projectsError;
          fetchedProjectList = fetchedProjects || [];
          fetchedProjectList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }
      }

      setProjects(fetchedProjectList);

      // Fetch task & member counts for project cards
      if (fetchedProjectList.length > 0) {
        const projectIds = fetchedProjectList.map((p) => p.id);
        const [{ data: memberRows }, { data: taskRows }] = await Promise.all([
          supabase.from('project_members').select('project_id').in('project_id', projectIds),
          supabase.from('tasks').select('project_id').in('project_id', projectIds),
        ]);

        const statsMap = {};
        projectIds.forEach((id) => {
          statsMap[id] = { memberCount: 0, taskCount: 0 };
        });

        (memberRows || []).forEach((m) => {
          if (statsMap[m.project_id]) statsMap[m.project_id].memberCount += 1;
        });
        (taskRows || []).forEach((t) => {
          if (statsMap[t.project_id]) statsMap[t.project_id].taskCount += 1;
        });

        setProjectStats(statsMap);
      }

      // 2. Fetch Global Stats for Top Stat Cards & Summary
      const [
        { count: totalProjectsCount },
        { count: totalTasksCount },
        { count: doneTasksCount },
        { count: inProgressTasksCount },
        { count: todoTasksCount },
        { count: totalMembersCount },
        { data: recentTasksData },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'todo'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase
          .from('tasks')
          .select('task_token, title, created_at, project_id, projects(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const done = doneTasksCount || 0;
      const inProg = inProgressTasksCount || 0;
      const todo = todoTasksCount || 0;
      const total = totalTasksCount || 0;
      const active = inProg + todo;

      setStats({
        totalProjects: totalProjectsCount || fetchedProjectList.length,
        activeTasks: active,
        todoTasks: todo,
        inProgressTasks: inProg,
        completedTasks: done,
        totalTasks: total,
        totalMembers: totalMembersCount || 0,
      });

      setRecentActivities(recentTasksData || []);
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  const userName =
    userProfile?.full_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const userRole = userProfile?.role || role || 'member';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const getRoleBadge = (currentRole) => {
    const r = currentRole?.toLowerCase();
    if (r === 'super_admin') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Super Admin
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
        Member
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || 'active';
    if (s === 'active' || s === 'in_progress' || s === 'in progress') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
          Active
        </span>
      );
    }
    if (s === 'on_hold' || s === 'on hold' || s === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
          On Hold
        </span>
      );
    }
    if (s === 'completed' || s === 'done') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5" />
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
        {status || 'Unknown'}
      </span>
    );
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const recentFourProjects = projects.slice(0, 4);

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Welcome Section (Cleaned up & Compact) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{userName}</span>
            </h1>
            <div>{getRoleBadge(userRole)}</div>
          </div>

          {(canManage || isSuperAdmin || isAdmin) && (
            <div className="flex items-center gap-3">
              <Link
                to="/create-project"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span>+</span> New Project
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs font-medium animate-fade-in flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-rose-400/80 hover:text-rose-200">
              ✕
            </button>
          </div>
        )}

        {/* Row 1 — 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Projects */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-blue-500/30 transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Projects</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {loading ? '...' : stats.totalProjects}
              </h3>
              <p className="text-[11px] text-blue-400/90 mt-0.5">across all workspaces</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xl shrink-0">
              📁
            </div>
          </div>

          {/* Card 2: Active Tasks */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-amber-500/30 transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Active Tasks</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {loading ? '...' : stats.activeTasks}
              </h3>
              <p className="text-[11px] text-amber-400/90 mt-0.5">tasks in progress</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
              ⏱️
            </div>
          </div>

          {/* Card 3: Completed Tasks */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-emerald-500/30 transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Completed Tasks</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {loading ? '...' : stats.completedTasks}
              </h3>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">tasks completed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
              ✅
            </div>
          </div>

          {/* Card 4: Team Members */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl hover:border-purple-500/30 transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Team Members</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {loading ? '...' : stats.totalMembers}
              </h3>
              <p className="text-[11px] text-purple-400/90 mt-0.5">team members</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-xl shrink-0">
              👥
            </div>
          </div>
        </div>

        {/* Row 2 — Two Columns (60% Recent Projects / 40% Task Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (60% width -> 7 cols in 12 grid) */}
          <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📂</span> Recent Projects
                </h2>
                <Link
                  to="/projects"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View All Projects →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentFourProjects.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-slate-400">No projects found in your workspace.</p>
                  {(canManage || isSuperAdmin || isAdmin) && (
                    <Link
                      to="/create-project"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
                    >
                      <span>+</span> Create Project
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {recentFourProjects.map((project) => {
                    const pStat = projectStats[project.id] || { taskCount: 0 };
                    return (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="bg-slate-950/60 border border-slate-800/70 hover:border-blue-500/40 rounded-xl p-4 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                              {project.name}
                            </h4>
                            <div className="shrink-0">{getStatusBadge(project.status)}</div>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {project.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                          <span>📋 {pStat.taskCount} tasks</span>
                          <span className="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/60 text-right">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                View All Projects ({stats.totalProjects}) →
              </Link>
            </div>
          </div>

          {/* Right Column (40% width -> 5 cols in 12 grid) */}
          <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <span>📊</span> Task Summary
              </h2>

              {/* Status Breakdown List */}
              <div className="space-y-3 bg-slate-950/60 border border-slate-800/70 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-300 font-medium">To-Do</span>
                  </div>
                  <span className="font-bold text-white">{stats.todoTasks} tasks</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-300 font-medium">In Progress</span>
                  </div>
                  <span className="font-bold text-white">{stats.inProgressTasks} tasks</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-300 font-medium">Done</span>
                  </div>
                  <span className="font-bold text-white">{stats.completedTasks} tasks</span>
                </div>
              </div>
            </div>

            {/* Progress Bar & Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Completion Rate</span>
                <span className="font-bold text-emerald-400">{completionRate}%</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  style={{ width: `${completionRate}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                />
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-1">
                {completionRate}% of all tasks completed ({stats.completedTasks} of {stats.totalTasks})
              </p>
            </div>
          </div>
        </div>

        {/* Row 3 — Recent Activity Feed */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚡</span> Recent Activity
            </h2>
            <span className="text-xs text-slate-500">Latest 5 tasks created</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No recent activity found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((act, index) => {
                const projectName = act.projects?.name || 'Project';
                return (
                  <div
                    key={act.task_token || index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-slate-200">
                      <span className="text-base leading-none">📝</span>
                      <span>
                        Task <span className="font-mono font-bold text-blue-400">{act.task_token}</span>
                        {act.title ? ` ("${act.title}")` : ''} created in{' '}
                        <span className="font-semibold text-slate-100">{projectName}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono shrink-0 pl-7 sm:pl-0">
                      {timeAgo(act.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}