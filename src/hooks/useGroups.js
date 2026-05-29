import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';

// All groups the current user belongs to (with member counts).
export function useGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['groups', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(
          `
          role,
          joined_at,
          group:groups (
            id, name, emoji, description, created_by, created_at,
            group_members ( user_id, role, profiles ( id, full_name, avatar_url, email ) )
          )
        `
        )
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? [])
        .map((row) => ({
          ...row.group,
          your_role: row.role,
          members: row.group?.group_members ?? [],
        }))
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
  });
}

export function useGroup(groupId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['group', groupId],
    enabled: !!groupId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(
          `
          *,
          group_members (
            id, role, joined_at, user_id,
            profiles ( id, full_name, avatar_url, email )
          )
        `
        )
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name, emoji, description }) => {
      const { data: group, error } = await supabase
        .from('groups')
        .insert({ name, emoji, description, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' });
      if (memberErr) throw memberErr;

      return group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (groupId) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useInviteMember(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, groupName }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You are signed out. Please sign in again and retry.');
      }
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, groupId, groupName }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to invite');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
