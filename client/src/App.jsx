import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import CreateTask from './pages/CreateTask';
import KanbanBoard from './pages/KanbanBoard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/create-task" element={<CreateTask />} />
        <Route path="/kanban" element={<KanbanBoard />} />
      </Routes>
    </BrowserRouter>
  );
}