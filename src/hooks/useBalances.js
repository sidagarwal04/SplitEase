import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useExpenses, useSettlements } from './useExpenses.js';
import { computeNetBalances, simplifyDebts } from '../utils/debtSimplifier.js';
import { useAuth } from '../lib/auth.jsx';
import { useGroups } from './useGroups.js';
import { supabase } from '../lib/supabase.js';

// Per-group net balances and simplified suggested settlements.
export function useGroupBalances(groupId) {
  const { data: expenses = [], isLoading: lE } = useExpenses(groupId);
  const { data: settlements = [], isLoading: lS } = useSettlements(groupId);

  return useMemo(() => {
    const balances = computeNetBalances(expenses, settlements);
    const transactions = simplifyDebts(balances);
    return { balances, transactions, isLoading: lE || lS };
  }, [expenses, settlements, lE, lS]);
}

// Dashboard: total owed to you, total you owe across all groups.
export function useOverallBalance() {
  const { user } = useAuth();
  const { data: groups = [] } = useGroups();

  return useQuery({
    queryKey: ['overall-balance', user?.id, groups.map((g) => g.id).join(',')],
    enabled: !!user?.id && groups.length > 0,
    queryFn: async () => {
      const groupIds = groups.map((g) => g.id);

      const [{ data: expenses = [], error: eErr }, { data: settlements = [], error: sErr }] =
        await Promise.all([
          supabase
            .from('expenses')
            .select('id, group_id, paid_by, amount, currency, expense_splits ( user_id, amount )')
            .in('group_id', groupIds),
          supabase
            .from('settlements')
            .select('group_id, from_user_id, to_user_id, amount')
            .in('group_id', groupIds),
        ]);

      if (eErr) throw eErr;
      if (sErr) throw sErr;

      const perGroup = {};
      let owed = 0;
      let owing = 0;

      for (const id of groupIds) {
        const ge = expenses.filter((e) => e.group_id === id);
        const gs = settlements.filter((s) => s.group_id === id);
        const balances = computeNetBalances(ge, gs);
        const userNet = balances[user.id] ?? 0;
        perGroup[id] = userNet;
        if (userNet > 0) owed += userNet;
        else if (userNet < 0) owing += -userNet;
      }

      return { owed, owing, net: owed - owing, perGroup };
    },
  });
}
