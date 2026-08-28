import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { RoleGuard } from './components/RoleGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllProjects from './pages/AllProjects';
import CreateProject from './pages/CreateProject';
import CreateTask from './pages/CreateTask';
import KanbanBoard from './pages/KanbanBoard';
import AddMember from './pages/AddMember';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!isMounted) return;

      if (error || !data?.user) {
        navigate('/');
        return;
      }

      setUser(data.user);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#0B0F17] text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-blue-500 mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading TaskFlow...</p>
      </div>
    );
  }

  return user ? children : null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        
        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* All Projects */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <AllProjects />
            </ProtectedRoute>
          }
        />

        {/* Project Detail Routes */}
        <Route
          path="/project/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />

        {/* Task Detail Route */}
        <Route
          path="/task/:taskId"
          element={
            <ProtectedRoute>
              <TaskDetail />
            </ProtectedRoute>
          }
        />

        {/* Create / New Project */}
        <Route
          path="/create-project"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <CreateProject />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-project"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <CreateProject />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Create / New Task */}
        <Route
          path="/create-task"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <CreateTask />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-task"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <CreateTask />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Kanban / Task Board */}
        <Route
          path="/kanban"
          element={
            <ProtectedRoute>
              <KanbanBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-board"
          element={
            <ProtectedRoute>
              <KanbanBoard />
            </ProtectedRoute>
          }
        />

        {/* Team / Add Member */}
        <Route
          path="/add-member"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <AddMember />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <AddMember />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}