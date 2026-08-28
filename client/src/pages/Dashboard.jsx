import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({}); // { [projectId]: { memberCount: 0, taskCount: 0 } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(location.state?.error || null);
  const [successMessage, setSuccessMessage] = useState(null);

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
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchUserAndProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check current user
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

      setUserProfile(
        profile || {
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: 'member',
          email: user.email,
        }
      );

      // PROBLEM 1: Fetch owned projects + member projects
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedError) throw ownedError;

      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const allProjects = [
        ...(ownedProjects || []),
        ...(memberProjects?.map((m) => m.projects).filter(Boolean) || []),
      ];

      // Remove duplicates by id
      const uniqueProjects = allProjects.filter(
        (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
      );

      setProjects(uniqueProjects);

      // Fetch member counts and task counts for all these projects
      if (uniqueProjects.length > 0) {
        const projectIds = uniqueProjects.map((p) => p.id);

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
    fetchUserAndProjects();
  }, [navigate]);

  // Open Edit Modal
  const handleOpenEdit = (e, project) => {
    e.stopPropagation();
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

      // Update state without full reload
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

  // Open Delete Confirm
  const handleOpenDelete = (e, project) => {
    e.stopPropagation();
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

      // Remove from state without page reload
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      setSuccessMessage(`Project "${deletingProject.name}" deleted successfully.`);
      setDeletingProject(null);
    } catch (err) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setDeletingLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in progress':
      case 'in_progress':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'on_hold':
      case 'on hold':
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getRoleBadge = (role) => {
    const normalizedRole = role?.toLowerCase();
    if (normalizedRole === 'super_admin') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Super Admin
        </span>
      );
    }
    if (normalizedRole === 'admin') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
        Member
      </span>
    );
  };

  const userName =
    userProfile?.full_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const userRole = userProfile?.role || 'member';

  // Counts summary
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => (p.status || 'active').toLowerCase() === 'active' || (p.status || '').toLowerCase() === 'in_progress'
  ).length;
  const completedProjects = projects.filter(
    (p) => (p.status || '').toLowerCase() === 'completed'
  ).length;

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Overview of your workspace projects and team activity
          </p>
        </div>
        <button
          onClick={() => navigate('/create-project')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span className="text-sm leading-none font-bold">+</span> New Project
        </button>
      </header>

      <main className="p-8 flex-1 font-sans">
        {/* Welcome message & User Role Badge */}
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-white tracking-tight m-0">
                Welcome back, <span className="text-blue-400">{userName}</span>!
              </h2>
              {getRoleBadge(userRole)}
            </div>
            <p className="text-sm text-slate-400 mt-1.5 mb-0">
              Manage your workspace projects, track sprint tasks, and collaborate with your team.
            </p>
          </div>

          {/* Project count summary metric */}
          {!loading && (
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 shrink-0">
              <span className="font-bold text-white">{totalProjects} Projects</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">{activeProjects} Active</span>
              <span className="text-slate-600">·</span>
              <span className="text-blue-400 font-semibold">{completedProjects} Completed</span>
            </div>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 bg-red-950/25 border border-red-900/50 p-4 rounded-xl text-sm font-semibold text-red-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>⚠️</span> <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-emerald-950/25 border border-emerald-900/50 p-4 rounded-xl text-sm font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in-up">
            <span>✓</span> {successMessage}
          </div>
        )}

        {/* Skeleton Loader while loading */}
        {loading ? (
          <div>
            <div className="mb-6 h-5 w-40 bg-slate-800/60 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 h-[220px] flex flex-col justify-between animate-pulse"
                >
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <div className="h-5 w-3/5 bg-slate-800/70 rounded"></div>
                      <div className="h-5 w-16 bg-slate-800/70 rounded-full"></div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="h-3.5 w-full bg-slate-800/50 rounded"></div>
                      <div className="h-3.5 w-4/5 bg-slate-800/50 rounded"></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="h-4 w-16 bg-slate-800/60 rounded"></div>
                      <div className="h-4 w-16 bg-slate-800/60 rounded"></div>
                    </div>
                    <div className="h-5 w-12 bg-slate-800/60 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-6 bg-slate-900/40 backdrop-blur-md border border-dashed border-slate-800 rounded-2xl max-w-xl mx-auto text-center mt-6 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl font-bold mb-4 border border-blue-500/20 shadow-lg shadow-blue-500/5">
              📁
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1.5">No projects found</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm leading-relaxed">
              You are not involved in any projects yet. Create your first project or get added to an existing one.
            </p>
            <button
              onClick={() => navigate('/create-project')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              + Create Project
            </button>
          </div>
        ) : (
          /* Projects Grid */
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 m-0">Your Projects</h2>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-900/80 text-slate-300 border border-slate-800 rounded-full">
                Total: {projects.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => {
                const stats = projectStats[project.id] || { memberCount: 0, taskCount: 0 };

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className="opacity-0 animate-fade-in-up group bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between cursor-pointer relative"
                  >
                    {/* Card Top: Title, Status, and Action Icons */}
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="min-w-0 pr-2">
                          <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors leading-snug m-0 line-clamp-1">
                            {project.name}
                          </h3>
                        </div>

                        {/* Top-Right Action Icons (Edit & Delete) */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Edit Project"
                            onClick={(e) => handleOpenEdit(e, project)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/60 rounded-lg border border-slate-700/50 transition-all cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            title="Delete Project"
                            onClick={(e) => handleOpenDelete(e, project)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/40 rounded-lg border border-rose-900/40 transition-all cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeColor(
                            project.status
                          )}`}
                        >
                          {project.status ? project.status.replace('_', ' ') : 'Active'}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-6">
                        {project.description || 'No description provided for this project.'}
                      </p>
                    </div>

                    {/* Card Bottom: Member count, Task count & Details Link */}
                    <div>
                      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-4">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                            <span>👥</span> {stats.memberCount} {stats.memberCount === 1 ? 'member' : 'members'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                            <span>📝</span> {stats.taskCount} {stats.taskCount === 1 ? 'task' : 'tasks'}
                          </span>
                        </div>

                        <div className="flex items-center text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                          <span>View →</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EDIT PROJECT MODAL */}
        {editingProject && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditingProject(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white m-0">Edit Project</h3>
                <button
                  onClick={() => setEditingProject(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project Description..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingProject && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeletingProject(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl font-bold mb-4 border border-rose-500/20">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Project</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-200">"{deletingProject.name}"</span>? This action will remove the project and its associated task records.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingProject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingLoading}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {deletingLoading ? 'Deleting...' : 'Yes, Delete Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}