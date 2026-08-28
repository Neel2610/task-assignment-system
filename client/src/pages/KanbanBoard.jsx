import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

const COLUMNS = {
  todo: {
    id: 'todo',
    title: 'To-Do',
    color: 'border-t-slate-500',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-sm shadow-slate-500/5',
  },
  in_progress: {
    id: 'in_progress',
    title: 'In Progress',
    color: 'border-t-blue-500',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/5',
  },
  done: {
    id: 'done',
    title: 'Done',
    color: 'border-t-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5',
  },
};

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*, users!assignee_id(full_name)');

      if (fetchError) throw fetchError;

      setTasks(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const onDragEnd = async (result) => {
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

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 font-sans">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            Kanban Board
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Drag and drop tasks between columns to update status
          </p>
        </div>
      </header>

      <main className="p-8 flex-1 flex flex-col font-sans">
        {error && (
          <div className="mb-6 bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-sm font-semibold text-red-300 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-28">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-850 border-t-blue-500"></div>
            <p className="mt-4 text-sm font-medium text-slate-400">Loading task board...</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start overflow-x-auto pb-4">
              {Object.entries(COLUMNS).map(([columnId, columnInfo]) => {
                const columnTasks = tasks.filter(
                  (task) => (task.status || 'todo') === columnId
                );

                return (
                  <div
                    key={columnId}
                    className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 border-t-4 flex flex-col min-h-[600px] min-w-[280px] shadow-xl hover:border-slate-700/50 transition-colors"
                    style={{ borderColor: columnId === 'todo' ? 'rgb(100 116 139)' : columnId === 'in_progress' ? 'rgb(59 130 246)' : 'rgb(16 185 129)' }}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
                      <h3 className="font-bold text-slate-200 text-base m-0">
                        {columnInfo.title}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${columnInfo.badge}`}
                      >
                        {columnTasks.length}
                      </span>
                    </div>

                    <Droppable droppableId={columnId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto space-y-3 rounded-xl p-1 transition-all duration-200 ${
                            snapshot.isDraggingOver ? 'bg-slate-950/30 ring-1 ring-slate-800/60' : ''
                          }`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={String(task.id)}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 transition-all select-none hover:border-blue-500/30 ${
                                    snapshot.isDragging ? 'shadow-2xl border-blue-500/50 scale-[1.02] bg-slate-900/80' : 'shadow-md'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="font-mono text-xs font-semibold text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/40">
                                      {task.task_token || `TASK-${task.id}`}
                                    </span>
                                    {task.priority && (
                                      <span
                                        className={`text-xs px-2.5 py-0.5 rounded-full capitalize font-semibold ${getPriorityBadgeStyle(
                                          task.priority
                                        )}`}
                                      >
                                        {task.priority}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm font-bold text-slate-100 mb-2 leading-snug m-0">
                                    <Link
                                      to={`/task/${task.id}`}
                                      className="hover:text-blue-400 transition-colors"
                                    >
                                      {task.title}
                                    </Link>
                                  </h4>

                                  {task.description && (
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                                    <span className="font-medium text-slate-500">Assignee</span>
                                    <span className="font-semibold text-slate-300 truncate max-w-[140px]">
                                      {task.users?.full_name || 'Unassigned'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
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
      </main>
    </Layout>
  );
}