import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';

export default function CreateTask({ onTaskCreated }) {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);

  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true);
        setError(null);

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name');

        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
        if (projectsData && projectsData.length > 0) {
          setProjectId(projectsData[0].id);
        }

        // Fetch project members joining users table to get full_name
        let membersList = [];
        try {
          const { data: joinedData, error: joinedError } = await supabase
            .from('project_members')
            .select('id, user_id, users:user_id(id, full_name, email)');

          if (!joinedError && joinedData) {
            membersList = joinedData;
          } else {
            // Fallback query if users relation alias differs
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('project_members')
              .select('id, user_id, users(id, full_name, email)');
            if (!fallbackError && fallbackData) {
              membersList = fallbackData;
            } else {
              // Direct select fallback without non-existent name column
              const { data: simpleData } = await supabase
                .from('project_members')
                .select('id, user_id');
              membersList = simpleData || [];
            }
          }
        } catch (e) {
          console.warn('Could not join users table for project members:', e);
        }

        setMembers(membersList);
        if (membersList && membersList.length > 0) {
          setAssignedTo(membersList[0].user_id || membersList[0].id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load form options');
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, []);

  const generateTaskToken = () => {
    const randomNum = Math.floor(100 + Math.random() * 900); // Ensures 3 digits (100-999)
    return `TASK-${randomNum}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const taskToken = generateTaskToken();

    try {
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert([
          {
            project_id: projectId,
            title,
            description,
            assigned_to: assignedTo || null,
            priority,
            due_date: dueDate || null,
            task_token: taskToken,
          },
        ])
        .select();

      if (insertError) {
        throw insertError;
      }

      setSuccess(`Task created successfully with ID: ${taskToken}`);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');

      if (onTaskCreated && typeof onTaskCreated === 'function') {
        onTaskCreated(data[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 antialiased text-left w-full">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0 leading-tight">
              Create Task
            </h1>
            <p className="text-xs text-slate-500 font-medium">Assign new task to team members</p>
          </div>
        </header>

        {/* Main Form Content */}
        <main className="p-8 flex-1 flex justify-center items-start">
          {fetchingData ? (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading form options...</p>
            </div>
          ) : (
            <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 m-0 border-b border-slate-100 pb-4">
                Task Details
              </h2>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl text-sm font-semibold text-red-700 flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              {success && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm font-semibold text-emerald-700 flex items-center gap-2">
                  <span>✓</span> {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="project" className="block text-sm font-semibold text-slate-900 mb-2">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="project"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                  >
                    <option value="" disabled>
                      Select a project
                    </option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-slate-900 mb-2">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="e.g. Implement OAuth Flow"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Provide task details and acceptance criteria..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="assignedTo" className="block text-sm font-semibold text-slate-900 mb-2">
                      Assign To
                    </label>
                    <select
                      id="assignedTo"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => {
                        const displayName =
                          member.users?.full_name ||
                          member.users?.email ||
                          member.full_name ||
                          member.email ||
                          `User (${member.user_id || member.id})`;
                        return (
                          <option key={member.id} value={member.user_id || member.id}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-semibold text-slate-900 mb-2">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="dueDate" className="block text-sm font-semibold text-slate-900 mb-2">
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
      </div>
    </div>
  );
}