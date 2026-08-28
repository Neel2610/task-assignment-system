import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { useUserRole } from '../hooks/useUserRole';

const COLUMNS = {
  todo: {
    id: 'todo',
    title: 'To-Do',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-sm shadow-slate-500/5',
  },
  in_progress: {
    id: 'in_progress',
    title: 'In Progress',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/5',
  },
  done: {
    id: 'done',
    title: 'Done',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5',
  },
};

export default function KanbanBoard() {
  const navigate = useNavigate();
  const { role, userId, loading: roleLoading, isSuperAdmin, isAdmin, isMember, canManage } = useUserRole();

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Selected Task Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit Form Fields
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('todo');
  const [savingTask, setSavingTask] = useState(false);

  // Delete Confirm State
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (!roleLoading) {
      fetchTasks();
      fetchUsersList();
    }
  }, [roleLoading, role, userId]);

  const fetchUsersList = async () => {
    try {
      const { data } = await supabase.from('users').select('id, full_name, email');
      setUsers(data || []);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchTasks = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/');
        return;
      }

      // Fetch user profile for authoritative role check
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const effectiveRole = profile?.role || role || 'member';

      let query = supabase
        .from('tasks')
        .select('*, users!tasks_assignee_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      // Member sees only tasks assigned to them
      if (effectiveRole === 'member') {
        query = query.eq('assignee_id', user.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTasks(data || []);
      if (isManualRefresh) {
        setSuccess('Task board refreshed');
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPriorityBadgeStyle = (priority) => {
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

  const onDragEnd = async (result) => {
    if (isMember) return;

    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    const previousTasks = [...tasks];

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        String(task.id) === String(draggableId)
          ? { ...task, status: newStatus }
          : task
      )
    );

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', draggableId);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err.message || 'Failed to update task status');
      setTasks(previousTasks);
    }
  };

  // Open Task Modal
  const handleOpenTask = (task) => {
    setSelectedTask(task);
    setIsEditing(false);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'medium');
    setEditAssigneeId(task.assignee_id || '');
    setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setEditStatus(task.status || 'todo');
  };

  // Save Edited Task
  const handleSaveTaskEdit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (!editTitle.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setSavingTask(true);
      setError(null);

      const updatePayload = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        assignee_id: editAssigneeId || null,
        due_date: editDueDate || null,
        status: editStatus,
      };

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', selectedTask.id)
        .select('*, users!tasks_assignee_id_fkey(full_name)');

      if (updateError) throw updateError;

      const updated = data && data[0] ? data[0] : { ...selectedTask, ...updatePayload };

      // Update state locally
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? updated : t))
      );

      setSelectedTask(updated);
      setIsEditing(false);
      setSuccess('Task updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update task');
    } finally {
      setSavingTask(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      setDeletingTask(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (deleteError) throw deleteError;

      // Remove from state
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setSuccess(`Task "${selectedTask.title}" deleted successfully.`);
      setConfirmDeleteModal(false);
      setSelectedTask(null);
    } catch (err) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setDeletingTask(false);
    }
  };

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            Task Board
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Drag and drop tasks between columns or click to inspect and edit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTasks(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Tasks"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {canManage && (
            <Link
              to="/create-task"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>+</span> New Task
            </Link>
          )}
        </div>
      </header>

      <main className="p-8 flex-1 flex flex-col font-sans">
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

        {success && (
          <div className="mb-6 bg-emerald-950/25 border border-emerald-900/50 p-4 rounded-xl text-sm font-semibold text-emerald-300 flex items-center gap-2 animate-fade-in-up">
            <span>✓</span> {success}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-28">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-blue-500"></div>
            <p className="mt-4 text-sm font-medium text-slate-400">Loading task board...</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start overflow-x-auto pb-4">
              {Object.entries(COLUMNS).map(([columnId, columnInfo]) => {
                const columnTasks = tasks.filter(
                  (task) => (task.status || 'todo') === columnId
                );

                const columnBorderColor =
                  columnId === 'todo'
                    ? 'border-t-slate-500'
                    : columnId === 'in_progress'
                    ? 'border-t-blue-500'
                    : 'border-t-emerald-500';

                return (
                  <div
                    key={columnId}
                    className={`bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 border-t-4 ${columnBorderColor} flex flex-col min-h-[600px] min-w-[280px] shadow-xl`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
                      <h3 className="font-bold text-slate-200 text-sm m-0">
                        {columnInfo.title}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${columnInfo.badge}`}
                      >
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Column Droppable Area */}
                    <Droppable droppableId={columnId} isDropDisabled={isMember}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto space-y-3 rounded-xl p-1 transition-all duration-200 min-h-[480px] flex flex-col ${
                            snapshot.isDraggingOver ? 'bg-slate-950/40 ring-1 ring-blue-500/30' : ''
                          }`}
                        >
                          {columnTasks.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-800/60 rounded-xl my-auto">
                              <p className="text-xs text-slate-500 font-medium m-0">No tasks in this column</p>
                            </div>
                          ) : (
                            columnTasks.map((task, index) => (
                              <Draggable
                                key={task.id}
                                draggableId={String(task.id)}
                                index={index}
                                isDragDisabled={isMember}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => handleOpenTask(task)}
                                    className={`bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 transition-all select-none hover:border-blue-500/40 cursor-pointer group ${
                                      snapshot.isDragging
                                        ? 'shadow-2xl border-blue-500/50 scale-[1.02] bg-slate-900/90 ring-1 ring-blue-500/40'
                                        : 'shadow-md'
                                    }`}
                                  >
                                    {/* Task Header: Token & Priority */}
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                      <span className="font-mono text-[11px] font-semibold text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/40">
                                        {task.task_token || `TASK-${task.id}`}
                                      </span>
                                      {task.priority && (
                                        <span
                                          className={`text-[11px] px-2 py-0.5 rounded-full capitalize font-semibold border ${getPriorityBadgeStyle(
                                            task.priority
                                          )}`}
                                        >
                                          {task.priority}
                                        </span>
                                      )}
                                    </div>

                                    {/* Title */}
                                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors mb-2 leading-snug m-0 line-clamp-2">
                                      {task.title}
                                    </h4>

                                    {/* Description Preview */}
                                    {task.description && (
                                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Task Card Footer: Assignee & Due Date */}
                                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-slate-500 font-medium shrink-0">👤</span>
                                        <span className="font-medium text-slate-300 truncate">
                                          {task.users?.full_name || 'Unassigned'}
                                        </span>
                                      </div>

                                      {task.due_date && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                                          <span>📅</span>
                                          {new Date(task.due_date).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* TASK DETAIL & EDIT MODAL */}
        {selectedTask && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTask(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded border border-blue-900/40">
                    {selectedTask.task_token || `TASK-${selectedTask.id}`}
                  </span>
                  <h3 className="text-base font-bold text-white m-0">
                    {isEditing ? 'Edit Task' : 'Task Details'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {!isEditing ? (
                /* VIEW DETAILS MODE */
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                      Title
                    </span>
                    <h2 className="text-lg font-bold text-slate-100 m-0 leading-snug">
                      {selectedTask.title}
                    </h2>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                      Description
                    </span>
                    <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedTask.description || 'No description provided for this task.'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Status</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize bg-slate-800/80 text-slate-200 border-slate-700">
                        {selectedTask.status ? selectedTask.status.replace('_', ' ') : 'todo'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Priority</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getPriorityBadgeStyle(
                          selectedTask.priority
                        )}`}
                      >
                        {selectedTask.priority || 'medium'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Assignee</span>
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {selectedTask.users?.full_name || 'Unassigned'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Due Date</span>
                      <span className="text-xs font-semibold text-slate-200 block">
                        {selectedTask.due_date
                          ? new Date(selectedTask.due_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No deadline'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Project</span>
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {selectedTask.projects?.name || 'Workspace'}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Full Details link, Edit button, Delete button */}
                  <div className="flex items-center justify-between pt-5 border-t border-slate-800">
                    <Link
                      to={`/task/${selectedTask.id}`}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                    >
                      Open Discussion & Comments →
                    </Link>

                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmDeleteModal(true)}
                          className="px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 rounded-xl border border-rose-900/40 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                        >
                          Edit Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* EDIT MODE FORM */
                <form onSubmit={handleSaveTaskEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Task Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Task Title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Task Description..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="todo">To-Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Priority
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Assignee
                      </label>
                      <select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingTask}
                      className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                    >
                      {savingTask ? 'Saving...' : 'Save Task'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {confirmDeleteModal && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteModal(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl font-bold mb-4 border border-rose-500/20">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Task</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-200">"{selectedTask?.title}"</span>? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingTask}
                  onClick={handleDeleteTask}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {deletingTask ? 'Deleting...' : 'Yes, Delete Task'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}