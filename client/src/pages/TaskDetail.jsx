import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentSuccess, setCommentSuccess] = useState(null);

  useEffect(() => {
    fetchTaskAndComments();
  }, [taskId, navigate]);

  useEffect(() => {
    if (!taskId) return;

    // Realtime subscription for comments on this task
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          if (payload.new && payload.new.user_id) {
            // Fetch commenter user details
            const { data: userData } = await supabase
              .from('users')
              .select('id, full_name, email')
              .eq('id', payload.new.user_id)
              .single();

            const incomingComment = {
              ...payload.new,
              users: userData || { full_name: 'Unknown User' },
            };

            setComments((prevComments) => {
              if (prevComments.some((c) => c.id === incomingComment.id)) {
                return prevComments;
              }
              return [...prevComments, incomingComment];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const fetchTaskAndComments = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check Authentication
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/');
        return;
      }
      setCurrentUser(user);

      // 2. Fetch Task details with assignee and creator
      const { data: taskData, error: taskFetchErr } = await supabase
        .from('tasks')
        .select('*, users!assignee_id(id, full_name, email), creator:users!created_by(id, full_name, email)')
        .eq('id', taskId)
        .single();

      if (taskFetchErr || !taskData) {
        setError('Task not found or invalid task ID.');
        setLoading(false);
        return;
      }

      // 3. Fetch associated project for access check
      const { data: projectData, error: projectErr } = await supabase
        .from('projects')
        .select('id, name, owner_id')
        .eq('id', taskData.project_id)
        .single();

      if (projectErr || !projectData) {
        setError('Associated project could not be found.');
        setLoading(false);
        return;
      }

      // 4. Access control check: user must be project owner OR project member
      const isOwner = projectData.owner_id === user.id;
      let isMember = false;

      const { data: memberRows } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', taskData.project_id)
        .eq('user_id', user.id);

      if (memberRows && memberRows.length > 0) {
        isMember = true;
      }

      if (!isOwner && !isMember) {
        setError('You do not have permission to view this task.');
        setLoading(false);
        return;
      }

      setTask(taskData);
      setProject(projectData);

      // 5. Fetch Comments
      const { data: commentsData, error: commentsErr } = await supabase
        .from('comments')
        .select('id, comment_text, created_at, user_id, users(id, full_name, email)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (commentsErr) throw commentsErr;
      setComments(commentsData || []);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching task details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError(null);
    setCommentSuccess(null);

    const trimmedText = newComment.trim();
    if (!trimmedText) {
      setCommentError('Comment cannot be empty.');
      return;
    }

    if (!currentUser || !taskId) return;

    setSubmittingComment(true);

    try {
      const { data: insertedData, error: insertErr } = await supabase
        .from('comments')
        .insert([
          {
            task_id: taskId,
            user_id: currentUser.id,
            comment_text: trimmedText,
          },
        ])
        .select('id, comment_text, created_at, user_id, users(id, full_name, email)');

      if (insertErr) throw insertErr;

      setNewComment('');
      setCommentSuccess('Comment added successfully!');

      if (insertedData && insertedData.length > 0) {
        const added = insertedData[0];
        setComments((prev) => {
          if (prev.some((c) => c.id === added.id)) return prev;
          return [...prev, added];
        });
      }

      setTimeout(() => setCommentSuccess(null), 3000);
    } catch (err) {
      setCommentError(err.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
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

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 antialiased text-left w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
              {task?.task_token || `TASK-${taskId}`}
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0 leading-tight">
              {task?.title || 'Task Details'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/kanban"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              <span>📋</span> Kanban Board
            </Link>
            {project?.id && (
              <Link
                to={`/project/${project.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              >
                ← Back to {project.name || 'Project'}
              </Link>
            )}
          </div>
        </header>

        <main className="p-8 flex-1">
          {error ? (
            <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-xl mx-auto text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold mx-auto mb-4 border border-red-100">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Task</h3>
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
              <p className="mt-4 text-sm font-medium text-slate-600">Loading task details...</p>
            </div>
          ) : (
            <div className="space-y-8 max-w-5xl mx-auto">
              {/* Task Header Summary Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                      Project: {project?.name}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">{task?.title}</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400 font-medium mb-1">Status</span>
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border capitalize ${getTaskStatusBadge(
                          task?.status
                        )}`}
                      >
                        {task?.status?.replace('_', ' ') || 'todo'}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400 font-medium mb-1">Priority</span>
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border capitalize ${getPriorityBadge(
                          task?.priority
                        )}`}
                      >
                        {task?.priority || 'medium'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Requirements / Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Requirements & Description
                  </h3>
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {task?.description || 'No detailed requirements or description provided for this task.'}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Assignee</span>
                    <span className="font-semibold text-slate-900">
                      {task?.users?.full_name || 'Unassigned'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Due Date</span>
                    <span className="font-semibold text-slate-900">
                      {task?.due_date
                        ? new Date(task.due_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'No deadline'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Created By</span>
                    <span className="font-semibold text-slate-900">
                      {task?.creator?.full_name || 'Unknown User'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Created Date</span>
                    <span className="font-semibold text-slate-900">
                      {task?.created_at
                        ? new Date(task.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Comments Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                    <span>💬</span> Task Discussion & Updates
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                    {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                  </span>
                </div>

                {/* Comment List */}
                <div className="space-y-4 mb-8">
                  {comments.length === 0 ? (
                    <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-sm font-medium text-slate-600 m-0">
                        No comments yet. Start the discussion for this task.
                      </p>
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {c.users?.full_name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {c.created_at
                              ? new Date(c.created_at).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap m-0">
                          {c.comment_text}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Add Progress Update or Comment</h4>

                  {commentError && (
                    <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                      <span>⚠️</span> {commentError}
                    </div>
                  )}

                  {commentSuccess && (
                    <div className="mb-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                      <span>✓</span> {commentSuccess}
                    </div>
                  )}

                  <form onSubmit={handleAddComment} className="space-y-4">
                    <div>
                      <textarea
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment or status update regarding this task..."
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {submittingComment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Posting Comment...</span>
                          </>
                        ) : (
                          'Add Comment'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
