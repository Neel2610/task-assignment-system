import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

export default function AllProjects() {
  const navigate = useNavigate();
  const { role, userId, isSuperAdmin, isAdmin, canManage } = useUserRole();

  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({}); // { [projectId]: { memberCount: 0, taskCount: 0 } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Search, Filter and View preferences
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'on_hold' | 'completed'
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('projectsViewMode') || 'grid');

  // Edit Modal State
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirm Modal State
  const [deletingProject, setDeletingProject] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/');
        return;
      }

      setCurrentUser(user);

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const effectiveRole = profile?.role || role || 'member';
      setUserProfile(profile || { role: effectiveRole });

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

      // Fetch member & task counts
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
          if (statsMap[m.project_id]) {
            statsMap[m.project_id].memberCount += 1;
          }
        });

        (taskRows || []).forEach((t) => {
          if (statsMap[t.project_id]) {
            statsMap[t.project_id].taskCount += 1;
          }
        });

        setProjectStats(statsMap);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [navigate]);

  const canEditOrDelete = (project) => {
    if (isSuperAdmin || userProfile?.role === 'super_admin') return true;
    if ((isAdmin || userProfile?.role === 'admin') && (project.owner_id === userId || project.owner_id === currentUser?.id)) return true;
    return false;
  };

  const handleOpenEdit = (e, project) => {
    e.stopPropagation();
    if (!canEditOrDelete(project)) {
      setError('You do not have permission to edit this project.');
      return;
    }
    setEditingProject(project);
    setEditName(project.name || '');
    setEditDescription(project.description || '');
    setEditStatus(project.status || 'active');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProject) return;

    if (!editName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setSavingEdit(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('projects')
        .update({
          name: editName.trim(),
          description: editDescription.trim(),
          status: editStatus,
        })
        .eq('id', editingProject.id)
        .select();

      if (updateError) throw updateError;

      const updated = data && data[0] ? data[0] : { ...editingProject, name: editName, description: editDescription, status: editStatus };
      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? { ...p, ...updated } : p))
      );

      setSuccessMessage('Project updated successfully!');
      setEditingProject(null);
    } catch (err) {
      setError(err.message || 'Failed to update project');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDelete = (e, project) => {
    e.stopPropagation();
    if (!canEditOrDelete(project)) {
      setError('You do not have permission to delete this project.');
      return;
    }
    setDeletingProject(project);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;

    try {
      setDeletingLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingProject.id);

      if (deleteError) throw deleteError;

      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      setSuccessMessage(`Project "${deletingProject.name}" deleted successfully.`);
      setDeletingProject(null);
    } catch (err) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setDeletingLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || 'active';
    if (s === 'active' || s === 'in_progress' || s === 'in progress') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
          Active
        </span>
      );
    }
    if (s === 'on_hold' || s === 'on hold' || s === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
          On Hold
        </span>
      );
    }
    if (s === 'completed' || s === 'done') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5" />
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
        {status || 'Unknown'}
      </span>
    );
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const pStatus = (project.status || 'active').toLowerCase().replace(' ', '_');
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return pStatus === 'active' || pStatus === 'in_progress';
      if (statusFilter === 'on_hold') return pStatus === 'on_hold' || pStatus === 'pending';
      if (statusFilter === 'completed') return pStatus === 'completed' || pStatus === 'done';

      return true;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>📁</span> All Projects
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Browse, search, and manage all projects across your organization.
            </p>
          </div>

          {(canManage || isSuperAdmin || isAdmin) && (
            <Link
              to="/create-project"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 shrink-0 self-start sm:self-auto"
            >
              <span className="text-base leading-none">+</span>
              <span>New Project</span>
            </Link>
          )}
        </div>

        {/* Success / Error Alerts */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs font-medium animate-fade-in flex items-center justify-between">
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400/80 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs font-medium animate-fade-in flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-rose-400/80 hover:text-rose-200">
              ✕
            </button>
          </div>
        )}

        {/* Controls Bar: Search, Status Tabs, View Switcher */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search projects by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors"
            />
          </div>

          {/* Status Tabs & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              {[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'On Hold', value: 'on_hold' },
                { label: 'Completed', value: 'completed' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab.value
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-slate-800 text-blue-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-slate-800 text-blue-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Loading / Empty / Grid / List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 animate-pulse space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="h-5 bg-slate-800 rounded w-2/3" />
                  <div className="h-5 bg-slate-800 rounded-full w-16" />
                </div>
                <div className="h-4 bg-slate-800/60 rounded w-full" />
                <div className="h-4 bg-slate-800/60 rounded w-4/5" />
                <div className="pt-4 border-t border-slate-800/60 flex justify-between">
                  <div className="h-4 bg-slate-800 rounded w-20" />
                  <div className="h-4 bg-slate-800 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-3xl mx-auto">
              📁
            </div>
            <h3 className="text-lg font-bold text-white">No Projects Found</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {searchQuery || statusFilter !== 'all'
                ? 'No projects match your current search and filter criteria.'
                : "You don't have any projects assigned yet."}
            </p>
            {(canManage || isSuperAdmin || isAdmin) && (
              <Link
                to="/create-project"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all mt-2"
              >
                <span>+</span> Create your first project
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const stats = projectStats[project.id] || { memberCount: 0, taskCount: 0 };
              const canModify = canEditOrDelete(project);

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-6 shadow-xl hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {project.name}
                      </h3>
                      <div className="shrink-0">{getStatusBadge(project.status)}</div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-500">👥</span> {stats.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-500">📋</span> {stats.taskCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {canModify && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenEdit(e, project)}
                            title="Edit Project"
                            className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleOpenDelete(e, project)}
                            title="Delete Project"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {project.created_at
                          ? new Date(project.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View (Table) */
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-5">Project Name</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Members</th>
                    <th className="py-3.5 px-5">Tasks</th>
                    <th className="py-3.5 px-5">Created</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-300">
                  {filteredProjects.map((project) => {
                    const stats = projectStats[project.id] || { memberCount: 0, taskCount: 0 };
                    const canModify = canEditOrDelete(project);

                    return (
                      <tr
                        key={project.id}
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-5">
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                            {project.name}
                          </div>
                          {project.description && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {project.description}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-5">{getStatusBadge(project.status)}</td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            👥 {stats.memberCount}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            📋 {stats.taskCount}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-400">
                          {project.created_at
                            ? new Date(project.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/project/${project.id}`)}
                              className="px-2.5 py-1 rounded-lg text-blue-400 hover:bg-blue-500/10 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              View →
                            </button>
                            {canModify && (
                              <>
                                <button
                                  onClick={(e) => handleOpenEdit(e, project)}
                                  title="Edit Project"
                                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => handleOpenDelete(e, project)}
                                  title="Delete Project"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {editingProject && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Edit Project</h3>
                <button
                  onClick={() => setEditingProject(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingProject && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Project</h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to delete <span className="text-white font-semibold">"{deletingProject.name}"</span>? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingLoading}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
                >
                  {deletingLoading ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
