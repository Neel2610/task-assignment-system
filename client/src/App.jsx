import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import CreateTask from './pages/CreateTask';
import KanbanBoard from './pages/KanbanBoard';
import AddMember from './pages/AddMember';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<ProjectDetail />} />
        <Route path="/task/:taskId" element={<TaskDetail />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/create-task" element={<CreateTask />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/add-member" element={<AddMember />} />
      </Routes>
    </BrowserRouter>
  );
}