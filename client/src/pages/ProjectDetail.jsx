import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id || params.projectId;
  const navigate = useNavigate();
  const { role, userId, loading: roleLoading, isSuperAdmin, isAdmin, isMember } = useUserRole();

  const [project, setProject] = useState(null);
  const [owner, setOwner] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roleLoading) {
      fetchProjectDetails();
    }
  }, [projectId, navigate, roleLoading, role, userId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Authenticate user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/');
        return;
      }

      // Fetch user profile for role verification
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const effectiveRole = profile?.role || role || 'member';

      // 2. Fetch project information
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !projectData) {
        setError('Project not found or invalid project ID.');
        setLoading(false);
        return;
      }

      // 3. Verify access control:
      // super_admin: can view any project
      // admin/member: user must be owner OR in project_members
      const isOwner = projectData.owner_id === user.id;
      let isProjectMember = false;

      const { data: memberRows, error: memberCheckError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (!memberCheckError && memberRows && memberRows.length > 0) {
        isProjectMember = true;
      }

      if (effectiveRole !== 'super_admin' && !isOwner && !isProjectMember) {
        setError('You do not have permission to view this project.');
        setLoading(false);
        return;
      }

      setProject(projectData);

      // 4. Fetch Owner profile
      if (projectData.owner_id) {
        const { data: ownerData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', projectData.owner_id)
          .single();

        setOwner(ownerData || null);
      }

      // 5. Fetch Project Members joined with users
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('id, role_in_project, joined_at, users(id, full_name, email)')
        .eq('project_id', projectId);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // 6. Fetch Project Tasks scoped to this project
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, task_token, title, status, priority, due_date, assignee_id, users!assignee_id(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (err) {
      setError(err.message || 'An error occurred while loading project details.');
    } finally {
      setLoading(false);
    }
  };

  const canManageProject = isSuperAdmin || (isAdmin && project && (project.owner_id === userId));

  const getProjectStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'on_hold':
      case 'on hold':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getTaskStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'done':
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getProjectRoleBadge = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const completedTasksCount = tasks.filter(
    (t) => (t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'completed'
  ).length;

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            {project?.name || 'Project Details'}
          </h1>
          {project?.status && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getProjectStatusBadge(
                project.status
              )}`}
            >
              {project.status.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Header navigation actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/kanban"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700"
          >
            <span>📋</span> Task Board
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="p-8 flex-1 font-sans">
        {error ? (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 max-w-xl mx-auto text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-xl font-bold mx-auto mb-4 border border-red-500/20">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Unable to Load Project</h3>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 text-xs font-semibold cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col justify-center items-center py-28">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-blue-500"></div>
            <p className="mt-4 text-sm font-medium text-slate-400">Loading project details...</p>
          </div>
        ) : (
          <div className="space-y-8 max-w-6xl mx-auto animate-fade-in-up">
            {/* Overview Card */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/60">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 m-0">
                    {project?.name}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 mb-0 leading-relaxed">
                    {project?.description || 'No description provided for this project.'}
                  </p>
                </div>

                {canManageProject && (
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      to={`/create-task?projectId=${project?.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>+</span> Add Task
                    </Link>
                  </div>
                )}
              </div>

              {/* Stats & Meta info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Project Owner</span>
                  <span className="font-semibold text-slate-200">
                    {owner?.full_name || owner?.email || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Created Date</span>
                  <span className="font-semibold text-slate-200">
                    {project?.created_at
                      ? new Date(project.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Team Members</span>
                  <span className="font-semibold text-slate-200">
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Task Progress</span>
                  <span className="font-semibold text-slate-200">
                    {completedTasksCount} / {tasks.length} Completed
                  </span>
                </div>
              </div>
            </div>

            {/* Team Members Section */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-100 m-0 flex items-center gap-2">
                  <span>👥</span> Team Members ({members.length})
                </h3>
                {canManageProject && (
                  <Link
                    to="/add-member"
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    + Add Member
                  </Link>
                )}
              </div>

              {members.length === 0 ? (
                <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60">
                  <p className="text-xs text-slate-500 font-medium m-0">No members in this project yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Project Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {members.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-200">
                            {m.users?.full_name || 'Unnamed Member'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-medium">
                            {m.users?.email || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${getProjectRoleBadge(
                                m.role_in_project
                              )}`}
                            >
                              {m.role_in_project || 'member'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Project Tasks Section */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-100 m-0 flex items-center gap-2">
                  <span>📝</span> Project Tasks ({tasks.length})
                </h3>
                {canManageProject && (
                  <Link
                    to={`/create-task?projectId=${project?.id}`}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    + Add Task
                  </Link>
                )}
              </div>

              {tasks.length === 0 ? (
                <div className="py-10 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60 flex flex-col items-center justify-center">
                  <p className="text-xs text-slate-500 font-medium mb-3">No tasks in this project yet.</p>
                  {canManageProject && (
                    <Link
                      to={`/create-task?projectId=${project?.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      + Create First Task
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Token</th>
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Assignee</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-blue-400">
                            {task.task_token || `TASK-${task.id}`}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-200">
                            {task.title}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${getTaskStatusBadge(
                                task.status
                              )}`}
                            >
                              {task.status ? task.status.replace('_', ' ') : 'todo'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${getPriorityBadge(
                                task.priority
                              )}`}
                            >
                              {task.priority || 'medium'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {task.users?.full_name || 'Unassigned'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'No deadline'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              to={`/task/${task.id}`}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 group cursor-pointer inline-flex items-center gap-1"
                            >
                              Details <span className="transform group-hover:translate-x-0.5 transition-transform">→</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
