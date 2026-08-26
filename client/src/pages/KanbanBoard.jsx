import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';

const COLUMNS = {
  todo: {
    id: 'todo',
    title: 'To-Do',
    color: 'border-t-amber-500',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  in_progress: {
    id: 'in_progress',
    title: 'In Progress',
    color: 'border-t-blue-500',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  done: {
    id: 'done',
    title: 'Done',
    color: 'border-t-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
};

export default function KanbanBoard() {
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

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*');

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
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;

    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        String(task.id) === String(draggableId)
          ? { ...task, status: newStatus }
          : task
      )
    );

    // Update status in Supabase
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', draggableId);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err.message || 'Failed to update task status');
      setTasks(previousTasks); // Revert on failure
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
              Kanban Board
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Drag and drop tasks between columns to update status
            </p>
          </div>
        </header>

        {/* Board Main Body */}
        <main className="p-8 flex-1 flex flex-col">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col justify-center items-center py-28">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading task board...</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
                {Object.entries(COLUMNS).map(([columnId, columnInfo]) => {
                  const columnTasks = tasks.filter(
                    (task) => (task.status || 'todo') === columnId
                  );

                  return (
                    <div
                      key={columnId}
                      className={`bg-slate-100/90 rounded-2xl p-4 border-t-4 ${columnInfo.color} flex flex-col min-h-[550px] shadow-xs`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900 text-base m-0">
                          {columnInfo.title}
                        </h3>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${columnInfo.badge}`}
                        >
                          {columnTasks.length}
                        </span>
                      </div>

                      {/* Droppable Task List */}
                      <Droppable droppableId={columnId}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto space-y-3 rounded-xl p-1 transition-colors ${
                              snapshot.isDraggingOver ? 'bg-slate-200/60' : ''
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
                                    className={`bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow select-none ${
                                      snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50' : ''
                                    }`}
                                  >
                                    {/* Task Header: Token & Priority Badge */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                      <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {task.task_token || `TASK-${task.id}`}
                                      </span>
                                      {task.priority && (
                                        <span
                                          className={`text-xs px-2.5 py-0.5 rounded-full border capitalize font-semibold ${getPriorityBadgeStyle(
                                            task.priority
                                          )}`}
                                        >
                                          {task.priority}
                                        </span>
                                      )}
                                    </div>

                                    {/* Task Title */}
                                    <h4 className="text-sm font-bold text-slate-900 mb-2 leading-snug m-0">
                                      {task.title}
                                    </h4>

                                    {/* Task Description snippet if available */}
                                    {task.description && (
                                      <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Task Footer: Assignee */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                                      <span className="font-medium text-slate-400">Assignee</span>
                                      <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                                        {task.assignee || task.assigned_to || 'Unassigned'}
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
      </div>
    </div>
  );
}