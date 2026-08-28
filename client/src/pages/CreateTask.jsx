import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProject = searchParams.get('project') || searchParams.get('projectId') || '';
  const { role, loading: roleLoading, isMember } = useUserRole();

  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProject);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (!roleLoading && isMember) {
      navigate('/dashboard', { state: { error: 'Access denied: Members cannot create tasks.' }, replace: true });
      return;
    }

    const fetchProjects = async () => {
      try {
        setFetchingData(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate('/');
          return;
        }

        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const effectiveRole = profile?.role || role || 'member';

        let availableProjects = [];
        if (effectiveRole === 'super_admin') {
          const { data: allProjects, error: allProjectsErr } = await supabase
            .from('projects')
            .select('id, name')
            .order('name', { ascending: true });

          if (allProjectsErr) throw allProjectsErr;
          availableProjects = allProjects || [];
        } else {
          const { data: ownedProjects, error: ownedError } = await supabase
            .from('projects')
            .select('id, name')
            .eq('owner_id', user.id)
            .order('name', { ascending: true });

          if (ownedError) throw ownedError;
          availableProjects = ownedProjects || [];
        }

        setProjects(availableProjects);

        // If pre-selected project is passed in URL query
        if (preselectedProject) {
          setSelectedProjectId(preselectedProject);
          await loadMembersForProject(preselectedProject);
        }
      } catch (err) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setFetchingData(false);
      }
    };

    if (!roleLoading) {
      fetchProjects();
    }
  }, [navigate, preselectedProject, roleLoading, isMember, role]);

  const loadMembersForProject = async (pId) => {
    if (!pId) {
      setMembers([]);
      return;
    }

    try {
      setFetchingMembers(true);
      const { data, error: membersError } = await supabase
        .from('project_members')
        .select('user_id, users(id, full_name, email)')
        .eq('project_id', pId);

      if (membersError) throw membersError;
      setMembers(data || []);
    } catch (err) {
      console.error('Error loading project members:', err);
    } finally {
      setFetchingMembers(false);
    }
  };

  const handleProjectChange = async (pId) => {
    setSelectedProjectId(pId);
    setAssigneeId('');
    await loadMembersForProject(pId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    const taskToken = `TASK-${String(Date.now()).slice(-4)}`;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/');
        return;
      }

      const { error: insertError } = await supabase
        .from('tasks')
        .insert([
          {
            task_token: taskToken,
            project_id: selectedProjectId,
            title: title.trim(),
            description: description.trim(),
            status: 'todo',
            priority,
            assignee_id: assigneeId || null,
            due_date: dueDate || null,
            created_by: user.id,
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      try {
        await fetch('http://localhost:3001/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'Task Created',
            user: 'current user',
            page: 'Create Task',
            details: `New task ${taskToken} created`
          })
        });
      } catch { /* ignore */ }

      setSuccess(`Task created successfully with token ${taskToken}!`);

      // Reset form fields
      setTitle('');
      setDescription('');
      if (!preselectedProject) {
        setSelectedProjectId('');
        setMembers([]);
      }
      setAssigneeId('');
      setPriority('medium');
      setDueDate('');
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            New Task
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Assign a new task to your project team</p>
        </div>

        {/* Back Navigation Button */}
        <div className="flex items-center gap-3">
          {preselectedProject ? (
            <Link
              to={`/project/${preselectedProject}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
            >
              ← Back to Project
            </Link>
          ) : (
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
            >
              ← Back to Projects
            </Link>
          )}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="p-8 flex-1 flex justify-center items-start font-sans">
        {fetchingData ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-blue-500"></div>
            <p className="mt-4 text-sm font-medium text-slate-400">Loading form options...</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-slate-800/80 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-6">
              <h2 className="text-xl font-bold text-white m-0">
                Task Details
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Fields marked <span className="text-rose-500">*</span> are required
              </span>
            </div>

            {error && (
              <div className="mb-6 bg-rose-950/30 border border-rose-900/50 p-4 rounded-xl text-xs font-semibold text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span>⚠️</span> <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-rose-200 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-emerald-950/30 border border-emerald-900/50 p-4 rounded-xl text-xs font-semibold text-emerald-300 flex items-center justify-between gap-2 animate-fade-in-up">
                <div className="flex items-center gap-2">
                  <span>✓</span> <span>{success}</span>
                </div>
                {preselectedProject && (
                  <Link
                    to={`/project/${preselectedProject}`}
                    className="text-xs font-bold text-emerald-400 hover:underline shrink-0"
                  >
                    View in Project →
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="project" className="block text-sm font-semibold text-slate-300">
                    Project <span className="text-rose-500">*</span>
                  </label>
                  {preselectedProject && (
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                      Locked to current project
                    </span>
                  )}
                </div>
                <select
                  id="project"
                  value={selectedProjectId}
                  disabled={Boolean(preselectedProject)}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    preselectedProject ? 'opacity-70 cursor-not-allowed bg-slate-950/90' : 'cursor-pointer hover:border-slate-700'
                  }`}
                >
                  <option value="" className="bg-slate-950 text-slate-100">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id} className="bg-slate-950 text-slate-100">
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-300 mb-2">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  placeholder="e.g., Design System Migration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium placeholder-slate-500 shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Task Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Provide detailed context, acceptance criteria, and relevant links..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium placeholder-slate-500 shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Assignee Selection */}
              <div>
                <label htmlFor="assignee" className="block text-sm font-semibold text-slate-300 mb-2">
                  Assignee
                </label>
                <select
                  id="assignee"
                  value={assigneeId}
                  disabled={fetchingMembers || !selectedProjectId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-slate-100">
                    {!selectedProjectId
                      ? 'Select a project first'
                      : fetchingMembers
                      ? 'Loading members...'
                      : 'Unassigned'}
                  </option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id} className="bg-slate-950 text-slate-100">
                      {member.users?.full_name || member.users?.email} ({member.users?.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority & Due Date Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="priority" className="block text-sm font-semibold text-slate-300 mb-2">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="low" className="bg-slate-950 text-slate-100">Low Priority</option>
                    <option value="medium" className="bg-slate-950 text-slate-100">Medium Priority</option>
                    <option value="high" className="bg-slate-950 text-slate-100">High Priority</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dueDate" className="block text-sm font-semibold text-slate-300 mb-2">
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => navigate(preselectedProject ? `/project/${preselectedProject}` : '/projects')}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-98"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Task...</span>
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      <span>Create Task</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </Layout>
  );
}