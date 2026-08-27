import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Sidebar from '../components/Sidebar';

export default function AddMember() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [roleInProject, setRoleInProject] = useState('member');

  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setFetchingProjects(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          navigate('/');
          return;
        }

        const { data, error: projectsError } = await supabase
          .from('projects')
          .select('id, name');

        if (projectsError) throw projectsError;

        setProjects(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load projects.');
      } finally {
        setFetchingProjects(false);
      }
    };

    fetchProjects();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedProjectId) {
      setError('Please select a project.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!memberEmail || !emailRegex.test(memberEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        navigate('/');
        return;
      }

      // 1. Check if user with memberEmail exists in users table
      const { data: usersData, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', memberEmail);

      if (userFetchError) throw userFetchError;

      const foundUser = usersData && usersData.length > 0 ? usersData[0] : null;

      if (foundUser) {
        // Check if member already exists in project
        const { data: existingMember, error: existingError } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', selectedProjectId)
          .eq('user_id', foundUser.id);

        if (existingError) throw existingError;

        if (existingMember && existingMember.length > 0) {
          setError('This member is already added to the project.');
          return;
        }

        // Insert into project_members
        const { error: insertMemberError } = await supabase
          .from('project_members')
          .insert([
            {
              project_id: selectedProjectId,
              user_id: foundUser.id,
              role_in_project: roleInProject,
            },
          ]);

        if (insertMemberError) throw insertMemberError;

        setSuccess(`User ${memberEmail} successfully added to project!`);
      } else {
        // User does not exist, insert into invites table
        const { error: insertInviteError } = await supabase
          .from('invites')
          .insert([
            {
              project_id: selectedProjectId,
              invited_email: memberEmail,
              status: 'pending',
              invited_by: currentUser.id,
            },
          ]);

        if (insertInviteError) throw insertInviteError;

        setSuccess(`Invite sent to ${memberEmail}!`);
      }

      // Reset form fields
      setMemberEmail('');
      setRoleInProject('member');
    } catch (err) {
      setError(err.message || 'An error occurred while adding member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 antialiased text-left w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0 leading-tight">
              Add Project Member
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Invite or assign members to existing projects
            </p>
          </div>
        </header>

        <main className="p-8 flex-1 flex justify-center items-start">
          {fetchingProjects ? (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading projects...</p>
            </div>
          ) : (
            <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 m-0 border-b border-slate-100 pb-4">
                Member Details
              </h2>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-3">
                  <span className="text-red-600 font-bold text-base leading-none">!</span>
                  <div className="text-sm font-medium text-red-800 leading-tight">
                    {error}
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-3">
                  <span className="text-emerald-600 font-bold text-base leading-none">✓</span>
                  <div className="text-sm font-medium text-emerald-800 leading-tight">
                    {success}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="project" className="block text-sm font-semibold text-slate-900 mb-2">
                    Select Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="memberEmail" className="block text-sm font-semibold text-slate-900 mb-2">
                    Member Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="memberEmail"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="roleInProject" className="block text-sm font-semibold text-slate-900 mb-2">
                    Role in Project
                  </label>
                  <select
                    id="roleInProject"
                    value={roleInProject}
                    onChange={(e) => setRoleInProject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Adding Member...</span>
                      </div>
                    ) : (
                      'Add Member'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
