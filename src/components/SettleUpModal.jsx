import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useCreateSettlement } from '../hooks/useExpenses.js';
import { formatMoney } from '../utils/formatters.js';
import toast from 'react-hot-toast';

export default function SettleUpModal({ open, onClose, group, members = [], suggested = null }) {
  const { user } = useAuth();
  const [fromUser, setFromUser] = useState('');
  const [toUser, setToUser] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const create = useCreateSettlement(group?.id);

  useEffect(() => {
    if (!open) return;
    if (suggested) {
      setFromUser(suggested.from);
      setToUser(suggested.to);
      setAmount(String(suggested.amount.toFixed(2)));
    } else {
      setFromUser(user?.id ?? '');
      setToUser('');
      setAmount('');
    }
    setNote('');
  }, [open, suggested, user?.id]);

  const canSubmit = fromUser && toUser && fromUser !== toUser && Number(amount) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        from_user_id: fromUser,
        to_user_id: toUser,
        amount: Number(amount),
        note: note.trim() || null,
      });
      toast.success('Settlement recorded');
      onClose?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const find = (uid) => members.find((m) => m.user_id === uid);
  const from = find(fromUser);
  const to = find(toUser);

  return (
    <Modal open={open} onClose={onClose} title="Settle up">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <label className="label">From</label>
            <select className="input" value={fromUser} onChange={(e) => setFromUser(e.target.value)}>
              <option value="">Select…</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_id === user?.id ? 'You' : m.profiles?.full_name || m.profiles?.email}
                </option>
              ))}
            </select>
          </div>
          <ArrowRight size={18} className="text-accent mt-6" />
          <div>
            <label className="label">To</label>
            <select className="input" value={toUser} onChange={(e) => setToUser(e.target.value)}>
              <option value="">Select…</option>
              {members
                .filter((m) => m.user_id !== fromUser)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_id === user?.id ? 'You' : m.profiles?.full_name || m.profiles?.email}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {from && to && (
          <div className="flex items-center justify-center gap-3 py-2 px-3 rounded-xl bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2">
              <Avatar name={from.profiles?.full_name} url={from.profiles?.avatar_url} size="sm" />
              <span className="text-sm">{fromUser === user?.id ? 'You' : from.profiles?.full_name?.split(' ')[0]}</span>
            </div>
            <ArrowRight size={14} className="text-accent" />
            <div className="flex items-center gap-2">
              <Avatar name={to.profiles?.full_name} url={to.profiles?.avatar_url} size="sm" />
              <span className="text-sm">{toUser === user?.id ? 'You' : to.profiles?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
        )}

        <div>
          <label className="label">Amount</label>
          <input
            className="input font-display text-lg"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {amount && (
            <p className="text-xs text-text-muted mt-1.5">
              Recording {formatMoney(Number(amount), group?.currency || 'USD')}
            </p>
          )}
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input
            className="input"
            placeholder="Paid via Venmo"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit || create.isPending} className="btn-primary flex-1">
            {create.isPending ? 'Recording…' : 'Settle up'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
