import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setLoading(false);
          return;
        }
        if (isMounted) {
          setUserId(user.id);
        }
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (isMounted) {
          setRole(data?.role || 'member');
        }
      } catch (err) {
        console.error('Error in useUserRole:', err);
        if (isMounted) {
          setRole('member');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, []);

  return { 
    role, 
    userId, 
    loading,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin',
    isMember: role === 'member',
    canManage: role === 'super_admin' || role === 'admin'
  };
}
