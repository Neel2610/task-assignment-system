import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [owner, setOwner] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId, navigate]);

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

      // 3. Verify access control: user must be owner OR in project_members
      let isOwner = projectData.owner_id === user.id;
      let isMember = false;

      const { data: memberRows, error: memberCheckError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (!memberCheckError && memberRows && memberRows.length > 0) {
        isMember = true;
      }

      if (!isOwner && !isMember) {
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

      // 5. Fetch Project Members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('id, role_in_project, joined_at, users(id, full_name, email)')
        .eq('project_id', projectId);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // 6. Fetch Project Tasks (scoped to project_id)
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

  const getProjectStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'on_hold':
      case 'on hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getTaskStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'done':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getProjectRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 antialiased text-left w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0 leading-tight flex items-center gap-3">
              {project?.name || 'Project Details'}
              {project?.status && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getProjectStatusBadge(
                    project.status
                  )}`}
                >
                  {project.status.replace('_', ' ')}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Project overview, team members, and tasks</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/kanban"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              <span>📋</span> Kanban Board
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="p-8 flex-1">
          {error ? (
            <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold mx-auto mb-4 border border-red-100">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Project</h3>
              <p className="text-sm text-slate-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col justify-center items-center py-28">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading project details...</p>
            </div>
          ) : (
            <div className="space-y-8 max-w-6xl mx-auto">
              {/* Project Information Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-2 m-0">About Project</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {project?.description || 'No description provided for this project.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Project Owner</span>
                    <span className="font-semibold text-slate-800">
                      {owner?.full_name || owner?.email || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Created On</span>
                    <span className="font-semibold text-slate-800">
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
                    <span className="text-slate-400 font-medium block mb-1">Total Members</span>
                    <span className="font-semibold text-slate-800">{members.length}</span>
                  </div>
                </div>
              </div>

              {/* Members Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 m-0">Project Members</h2>
                  <Link
                    to="/add-member"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    + Add Member
                  </Link>
                </div>

                {members.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 font-medium m-0">No members in this project yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs tracking-wider">
                          <th className="py-3 px-4">Member Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Project Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {m.users?.full_name || 'Unnamed Member'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {m.users?.email || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getProjectRoleBadge(
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

              {/* Tasks Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 m-0">Project Tasks</h2>
                  <Link
                    to="/create-task"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    + Create Task
                  </Link>
                </div>

                {tasks.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 font-medium m-0">No tasks in this project yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs tracking-wider">
                          <th className="py-3 px-4">Token</th>
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Assignee</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tasks.map((task) => (
                          <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-600">
                              {task.task_token || `TASK-${task.id}`}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {task.title}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getTaskStatusBadge(
                                  task.status
                                )}`}
                              >
                                {task.status?.replace('_', ' ') || 'todo'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getPriorityBadge(
                                  task.priority
                                )}`}
                              >
                                {task.priority || 'medium'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-medium">
                              {task.users?.full_name || 'Unassigned'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-xs">
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
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                View Details →
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
      </div>
    </div>
  );
}
