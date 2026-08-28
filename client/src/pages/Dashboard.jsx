import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';

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
      case 'in_progress':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10';
      case 'on_hold':
      case 'on hold':
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/10';
      case 'completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <Layout>
      <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight m-0 leading-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Overview of your workspace projects</p>
        </div>
        <button
          onClick={() => navigate('/create-project')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span className="text-base leading-none font-bold">+</span> Create Project
        </button>
      </header>

      <main className="p-8 flex-1">
        {error && (
          <div className="mb-6 bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-sm font-semibold text-red-300 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          /* Premium Skeleton Loader Grid */
          <div>
            <div className="mb-6 h-6 w-32 bg-slate-800/50 rounded-md animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 h-[220px] flex flex-col justify-between animate-pulse"
                >
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <div className="h-5 w-1/2 bg-slate-800/60 rounded"></div>
                      <div className="h-5 w-16 bg-slate-800/60 rounded-full"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-800/40 rounded"></div>
                      <div className="h-3 w-5/6 bg-slate-800/40 rounded"></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="h-6 w-12 bg-slate-800/60 rounded"></div>
                      <div className="h-6 w-12 bg-slate-800/60 rounded"></div>
                    </div>
                    <div className="h-4 w-16 bg-slate-800/60 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 bg-slate-900/40 backdrop-blur-md border border-dashed border-slate-800 rounded-2xl max-w-xl mx-auto text-center mt-6 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl font-bold mb-4 border border-blue-500/20 shadow-lg shadow-blue-500/5">
              📁
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">No projects found</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm leading-relaxed">
              Get started by creating your first project to manage team tasks and track progress.
            </p>
            <button
              onClick={() => navigate('/create-project')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 m-0">Your Projects</h2>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-800/60 text-slate-300 border border-slate-700/50 rounded-full">
                Total: {projects.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => (
                <div
                  key={project.id}
                  style={{ animationDelay: `${idx * 75}ms` }}
                  className="opacity-0 animate-fade-in-up bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <h3 className="text-base font-bold text-slate-100 leading-snug m-0 line-clamp-1">
                        <Link
                          to={`/project/${project.id}`}
                          className="hover:text-blue-400 transition-colors"
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
                    <p className="text-sm font-normal text-slate-400 line-clamp-3 leading-relaxed mb-6">
                      {project.description || 'No description provided for this project.'}
                    </p>
                  </div>

                  <div>
                    {/* Visual progress track representing completed actions/tasks */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Project Progress</span>
                        <span>{project.status?.toLowerCase() === 'completed' ? '100%' : 'In Progress'}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            project.status?.toLowerCase() === 'completed'
                              ? 'w-full bg-blue-500'
                              : project.status?.toLowerCase() === 'on_hold' || project.status?.toLowerCase() === 'on hold'
                              ? 'w-1/3 bg-amber-500'
                              : 'w-2/3 bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/create-project?edit=${project.id}`)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700/60 hover:border-slate-600 transition-all duration-200 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-900/30 rounded-lg border border-red-900/40 hover:border-red-800 transition-all duration-200 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex items-center">
                        <Link
                          to={`/project/${project.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 transition-all group cursor-pointer"
                        >
                          Details <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}