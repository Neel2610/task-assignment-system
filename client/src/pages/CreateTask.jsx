import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';
  const { role, userId, loading: roleLoading, isSuperAdmin, isMember } = useUserRole();

  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
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
      const timer = setTimeout(() => setSuccess(null), 3000);
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

        // Fetch user profile to ensure up-to-date role
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const effectiveRole = profile?.role || role || 'member';

        if (effectiveRole === 'super_admin') {
          // super_admin can select from all projects
          const { data: allProjects, error: allProjectsErr } = await supabase
            .from('projects')
            .select('id, name')
            .order('name', { ascending: true });

          if (allProjectsErr) throw allProjectsErr;
          setProjects(allProjects || []);
        } else {
          // admin can only select from their own projects
          const { data: ownedProjects, error: ownedError } = await supabase
            .from('projects')
            .select('id, name')
            .eq('owner_id', user.id)
            .order('name', { ascending: true });

          if (ownedError) throw ownedError;
          setProjects(ownedProjects || []);
        }

        // If pre-selected project is passed in URL query
        if (initialProjectId) {
          setSelectedProjectId(initialProjectId);
          await loadMembersForProject(initialProjectId);
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
  }, [navigate, initialProjectId, roleLoading, isMember, role]);

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

      setSuccess(`Task created successfully with token ${taskToken}!`);

      // Reset form after successful submission
      setTitle('');
      setDescription('');
      setSelectedProjectId('');
      setAssigneeId('');
      setPriority('medium');
      setDueDate('');
      setMembers([]);
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
          {initialProjectId ? (
            <Link
              to={`/project/${initialProjectId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
            >
              ← Back to Project
            </Link>
          ) : null}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
          >
            ← Back to Dashboard
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

            {success && (
              <div className="mb-6 bg-emerald-950/25 border border-emerald-900/50 p-4 rounded-xl text-sm font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in-up">
                <span>✓</span> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Selection */}
              <div>
                <label htmlFor="project" className="block text-sm font-semibold text-slate-300 mb-2">
                  Project <span className="text-rose-500">*</span>
                </label>
                <select
                  id="project"
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. Implement OAuth Flow"
                />
              </div>

              {/* Task Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Provide task details and acceptance criteria..."
                />
              </div>

              {/* Assignee & Priority (Member list shown only after project is selected) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-semibold text-slate-300 mb-2">
                    Assign To
                  </label>
                  {!selectedProjectId ? (
                    <div className="px-4 py-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-medium">
                      Select a project above to view members
                    </div>
                  ) : fetchingMembers ? (
                    <div className="px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs font-medium flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                      <span>Loading project members...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="px-4 py-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-amber-400/80 text-xs font-medium">
                      No members in this project yet (Unassigned)
                    </div>
                  ) : (
                    <select
                      id="assignedTo"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="" className="bg-slate-950 text-slate-100">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id} className="bg-slate-950 text-slate-100">
                          {member.users?.full_name || member.users?.email || member.user_id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

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
                    <option value="high" className="bg-slate-950 text-slate-100">High</option>
                    <option value="medium" className="bg-slate-950 text-slate-100">Medium</option>
                    <option value="low" className="bg-slate-950 text-slate-100">Low</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="dueDate" className="block text-sm font-semibold text-slate-300 mb-2">
                  Due Date
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer [color-scheme:dark]"
                />
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating Task...</span>
                    </div>
                  ) : (
                    'Create Task'
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