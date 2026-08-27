import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserAndProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check login status
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/');
        return;
      }

      // Fetch owned projects
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedError) throw ownedError;

      // Fetch member project ids
      const { data: memberRows, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      let memberProjects = [];
      const memberProjectIds = (memberRows || []).map((row) => row.project_id);

      if (memberProjectIds.length > 0) {
        const { data: mProjects, error: mProjectsError } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds);

        if (mProjectsError) throw mProjectsError;
        memberProjects = mProjects || [];
      }

      // Combine and eliminate duplicates
      const allProjects = [...(ownedProjects || []), ...memberProjects];
      const uniqueProjects = Array.from(
        new Map(allProjects.map((p) => [p.id, p])).values()
      );

      setProjects(uniqueProjects);
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndProjects();
  }, [navigate]);

  const handleDeleteProject = async (projectId) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this project?'
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) throw deleteError;

      await fetchUserAndProjects();
    } catch (err) {
      setError(err.message || 'Failed to delete project');
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in progress':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'on_hold':
      case 'on hold':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 antialiased text-left w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0 leading-tight">
              Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium">Overview of your workspace projects</p>
          </div>
          <button
            onClick={() => navigate('/create-project')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
          >
            <span className="text-base leading-none font-bold">+</span> Create Project
          </button>
        </header>

        <main className="p-8 flex-1">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl text-sm font-semibold text-red-700 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col justify-center items-center py-28">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading your projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl max-w-xl mx-auto text-center mt-6 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold mb-4 border border-blue-100">
                📁
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No projects found</h3>
              <p className="text-sm text-slate-600 mb-6 max-w-sm">
                Get started by creating your first project to manage team tasks and track progress.
              </p>
              <button
                onClick={() => navigate('/create-project')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              >
                <span>+</span> Create Project
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 m-0">Your Projects</h2>
                <span className="text-xs font-semibold px-3 py-1 bg-slate-200/70 text-slate-700 border border-slate-300/60 rounded-full">
                  Total: {projects.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <h3 className="text-base font-bold text-slate-900 leading-snug m-0 line-clamp-1">
                          <Link
                            to={`/project/${project.id}`}
                            className="hover:text-blue-600 hover:underline transition-colors"
                          >
                            {project.name}
                          </Link>
                        </h3>
                        {project.status && (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize shrink-0 ${getStatusBadgeColor(
                              project.status
                            )}`}
                          >
                            {project.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-normal text-slate-600 line-clamp-3 leading-relaxed mb-4">
                        {project.description || 'No description provided for this project.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/create-project?edit=${project.id}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/project/${project.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}