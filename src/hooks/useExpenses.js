import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, RECEIPTS_BUCKET } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';

export function useExpenses(groupId) {
  return useQuery({
    queryKey: ['expenses', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          `
          *,
          expense_splits ( id, user_id, amount, split_type )
        `
        )
        .eq('group_id', groupId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSettlements(groupId) {
  return useQuery({
    queryKey: ['settlements', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('settled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Combined activity feed (expenses + settlements) ordered by recency.
export function useActivity(groupId) {
  const { data: expenses = [] } = useExpenses(groupId);
  const { data: settlements = [] } = useSettlements(groupId);
  return [
    ...expenses.map((e) => ({ kind: 'expense', at: e.created_at, data: e })),
    ...settlements.map((s) => ({ kind: 'settlement', at: s.settled_at, data: s })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
}

async function uploadReceipt(file, userId) {
  if (!file) return null;
  const ext = file.name.split('.').pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return path;
}

export function useCreateExpense(groupId) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ title, amount, currency, paid_by, date, category, notes, splits, receipt }) => {
      const receipt_url = await uploadReceipt(receipt, user.id);

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          paid_by,
          title,
          amount,
          currency,
          category,
          date,
          notes,
          receipt_url,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: splitErr } = await supabase.from('expense_splits').insert(
        splits.map((s) => ({
          expense_id: expense.id,
          user_id: s.user_id,
          amount: s.amount,
          split_type: s.split_type,
        }))
      );
      if (splitErr) throw splitErr;

      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useUpdateExpense(groupId) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, title, amount, currency, paid_by, date, category, notes, splits, receipt }) => {
      let receipt_url;
      if (receipt instanceof File) {
        receipt_url = await uploadReceipt(receipt, user.id);
      }

      const updatePayload = {
        title,
        amount,
        currency,
        paid_by,
        date,
        category,
        notes,
      };
      if (receipt_url) updatePayload.receipt_url = receipt_url;

      const { error } = await supabase.from('expenses').update(updatePayload).eq('id', id);
      if (error) throw error;

      const { error: delErr } = await supabase.from('expense_splits').delete().eq('expense_id', id);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase.from('expense_splits').insert(
        splits.map((s) => ({
          expense_id: id,
          user_id: s.user_id,
          amount: s.amount,
          split_type: s.split_type,
        }))
      );
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });
}

export function useDeleteExpense(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });
}

export function useCreateSettlement(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ from_user_id, to_user_id, amount, note }) => {
      const { data, error } = await supabase
        .from('settlements')
        .insert({ group_id: groupId, from_user_id, to_user_id, amount, note })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements', groupId] });
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });
}

// Subscribe to realtime changes for a group's expenses + settlements.
export function useGroupRealtime(groupId) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_splits' },
        () => qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ['settlements', groupId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, qc]);
}
