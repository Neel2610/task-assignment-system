import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

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

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold text-blue-400 bg-blue-950/30 px-2.5 py-1 rounded border border-blue-900/40">
            {task?.task_token || `TASK-${taskId}`}
          </span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            {task?.title || 'Task Details'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/kanban"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer"
          >
            <span>📋</span> Kanban Board
          </Link>
          {project?.id && (
            <Link
              to={`/project/${project.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/60 rounded-xl transition-all border border-slate-800/60"
            >
              ← Back
            </Link>
          )}
        </div>
      </header>

      <main className="p-8 flex-1 font-sans">
        {error ? (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 max-w-xl mx-auto text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-xl font-bold mx-auto mb-4 border border-red-500/20">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Unable to Load Task</h3>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 text-sm font-semibold cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col justify-center items-center py-28">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-850 border-t-blue-500"></div>
            <p className="mt-4 text-sm font-medium text-slate-400">Loading task details...</p>
          </div>
        ) : (
          <div className="space-y-8 max-w-5xl mx-auto animate-fade-in-up">
            {/* Task Header Summary Card */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                    Project: {project?.name}
                  </span>
                  <h2 className="text-2xl font-bold text-white m-0">{task?.title}</h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 font-medium mb-1">Status</span>
                    <span
                      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border capitalize ${getTaskStatusBadge(
                        task?.status
                      )}`}
                    >
                      {task?.status?.replace('_', ' ') || 'todo'}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 font-medium mb-1">Priority</span>
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
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">
                  Requirements & Description
                </h3>
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {task?.description || 'No detailed requirements or description provided for this task.'}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800/60 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Assignee</span>
                  <span className="font-semibold text-slate-300">
                    {task?.users?.full_name || 'Unassigned'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block mb-1">Due Date</span>
                  <span className="font-semibold text-slate-300">
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
                  <span className="text-slate-500 font-medium block mb-1">Created By</span>
                  <span className="font-semibold text-slate-300">
                    {task?.creator?.full_name || 'Unknown User'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block mb-1">Created Date</span>
                  <span className="font-semibold text-slate-300">
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
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/60">
                <h3 className="text-lg font-bold text-slate-100 m-0 flex items-center gap-2">
                  <span>💬</span> Task Discussion & Updates
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800/60 text-slate-300 border border-slate-700/50 rounded-full">
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </span>
              </div>

              {/* Comment List */}
              <div className="space-y-4 mb-8">
                {comments.length === 0 ? (
                  <div className="py-10 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60">
                    <p className="text-sm font-medium text-slate-500 m-0">
                      No comments yet. Start the discussion for this task.
                    </p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-200 text-sm">
                          {c.users?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
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
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap m-0 font-sans">
                        {c.comment_text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <div className="pt-4 border-t border-slate-800/60">
                <h4 className="text-sm font-bold text-slate-200 mb-3">Add Progress Update or Comment</h4>

                {commentError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-950/20 border border-red-900/50 text-xs font-semibold text-red-300 flex items-center gap-2">
                    <span>⚠️</span> {commentError}
                  </div>
                )}

                {commentSuccess && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-xs font-semibold text-emerald-300 flex items-center gap-2">
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
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-blue-500/50 rounded-xl text-slate-100 text-sm font-medium placeholder-slate-500 shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
    </Layout>
  );
}
