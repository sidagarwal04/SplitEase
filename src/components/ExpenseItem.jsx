import { motion } from 'framer-motion';
import { Receipt, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { categoryEmoji, formatDate, formatMoney } from '../utils/formatters.js';
import Avatar from './Avatar.jsx';
import { useDeleteExpense } from '../hooks/useExpenses.js';
import toast from 'react-hot-toast';

export default function ExpenseItem({ expense, members = [], onEdit }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const del = useDeleteExpense(expense.group_id);

  const payer = members.find((m) => m.user_id === expense.paid_by);
  const youPaid = expense.paid_by === user?.id;
  const yourSplit = expense.expense_splits?.find((s) => s.user_id === user?.id);
  const youOwe = yourSplit && !youPaid ? Number(yourSplit.amount) : 0;
  const youAreOwed =
    youPaid && expense.expense_splits
      ? expense.expense_splits
          .filter((s) => s.user_id !== user?.id)
          .reduce((sum, s) => sum + Number(s.amount), 0)
      : 0;

  const canEdit = expense.paid_by === user?.id;

  const handleDelete = async () => {
    if (!confirm('Delete this expense?')) return;
    setBusy(true);
    try {
      await del.mutateAsync(expense.id);
      toast.success('Expense deleted');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="card p-4 flex items-center gap-4 group"
    >
      <div className="h-11 w-11 rounded-xl bg-bg-subtle border border-border grid place-items-center text-xl shrink-0">
        {categoryEmoji(expense.category)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{expense.title}</h4>
          {expense.receipt_url && (
            <Receipt size={12} className="text-text-subtle" title="Receipt attached" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
          <Avatar
            name={payer?.profiles?.full_name || 'Unknown'}
            url={payer?.profiles?.avatar_url}
            size="xs"
          />
          <span>
            {youPaid ? 'You' : payer?.profiles?.full_name?.split(' ')[0] || 'Someone'} paid •{' '}
            {formatDate(expense.date || expense.created_at)}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-display font-bold text-sm">
          {formatMoney(expense.amount, expense.currency)}
        </div>
        {youPaid ? (
          <div className="text-[11px] text-accent">
            You lent {formatMoney(youAreOwed, expense.currency)}
          </div>
        ) : youOwe > 0 ? (
          <div className="text-[11px] text-danger">
            You owe {formatMoney(youOwe, expense.currency)}
          </div>
        ) : (
          <div className="text-[11px] text-text-subtle">Not involved</div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onEdit?.(expense)}
            className="p-1.5 rounded-md hover:bg-white/5 text-text-muted hover:text-secondary"
            aria-label="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-white/5 text-text-muted hover:text-danger"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
