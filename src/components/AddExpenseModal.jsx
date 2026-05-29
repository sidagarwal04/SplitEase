import { useEffect, useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useCreateExpense, useUpdateExpense } from '../hooks/useExpenses.js';
import { CATEGORIES, categoryEmoji } from '../utils/formatters.js';
import { CURRENCIES, DEFAULT_CURRENCY } from '../utils/currency.js';
import toast from 'react-hot-toast';

const SPLIT_TYPES = [
  { id: 'equal', label: 'Equal' },
  { id: 'exact', label: 'Exact' },
  { id: 'percent', label: 'Percent' },
  { id: 'share', label: 'Shares' },
];

export default function AddExpenseModal({ open, onClose, group, members = [], expense = null }) {
  const { user } = useAuth();
  const isEditing = !!expense;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(group?.currency || DEFAULT_CURRENCY);
  const [paidBy, setPaidBy] = useState(user?.id ?? '');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('general');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [participants, setParticipants] = useState(() => new Set());
  const [splitValues, setSplitValues] = useState({});
  const [receiptFile, setReceiptFile] = useState(null);

  const create = useCreateExpense(group?.id);
  const update = useUpdateExpense(group?.id);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setTitle(expense.title);
      setAmount(String(expense.amount));
      setCurrency(expense.currency || group?.currency || DEFAULT_CURRENCY);
      setPaidBy(expense.paid_by);
      setDate(expense.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
      setCategory(expense.category || 'general');
      setNotes(expense.notes || '');
      setSplitType(expense.expense_splits?.[0]?.split_type || 'equal');
      const p = new Set(expense.expense_splits?.map((s) => s.user_id) ?? []);
      setParticipants(p);
      const sv = {};
      for (const s of expense.expense_splits ?? []) sv[s.user_id] = String(s.amount);
      setSplitValues(sv);
    } else {
      setTitle('');
      setAmount('');
      setCurrency(group?.currency || DEFAULT_CURRENCY);
      setPaidBy(user?.id ?? '');
      setDate(new Date().toISOString().slice(0, 10));
      setCategory('general');
      setNotes('');
      setSplitType('equal');
      setParticipants(new Set(members.map((m) => m.user_id)));
      setSplitValues({});
      setReceiptFile(null);
    }
  }, [open, expense, members, user?.id]);

  const numAmount = Number(amount) || 0;
  const partList = useMemo(() => members.filter((m) => participants.has(m.user_id)), [members, participants]);

  const computedSplits = useMemo(() => {
    if (!numAmount || partList.length === 0) return {};
    const result = {};

    if (splitType === 'equal') {
      const per = numAmount / partList.length;
      for (const m of partList) result[m.user_id] = round2(per);
      // distribute rounding remainder to first
      const sum = Object.values(result).reduce((a, b) => a + b, 0);
      const diff = round2(numAmount - sum);
      if (Math.abs(diff) > 0 && partList[0]) result[partList[0].user_id] = round2(result[partList[0].user_id] + diff);
    } else if (splitType === 'exact') {
      for (const m of partList) result[m.user_id] = round2(Number(splitValues[m.user_id]) || 0);
    } else if (splitType === 'percent') {
      for (const m of partList) {
        const pct = Number(splitValues[m.user_id]) || 0;
        result[m.user_id] = round2((numAmount * pct) / 100);
      }
    } else if (splitType === 'share') {
      const totalShares = partList.reduce((sum, m) => sum + (Number(splitValues[m.user_id]) || 0), 0);
      if (totalShares > 0) {
        for (const m of partList) {
          const sh = Number(splitValues[m.user_id]) || 0;
          result[m.user_id] = round2((numAmount * sh) / totalShares);
        }
      }
    }
    return result;
  }, [numAmount, partList, splitType, splitValues]);

  const splitSum = Object.values(computedSplits).reduce((a, b) => a + b, 0);
  const splitsValid = numAmount > 0 && Math.abs(splitSum - numAmount) < 0.05;
  const canSubmit = title.trim() && numAmount > 0 && paidBy && partList.length > 0 && splitsValid;

  const toggleParticipant = (uid) => {
    const next = new Set(participants);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setParticipants(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {
      title: title.trim(),
      amount: numAmount,
      currency,
      paid_by: paidBy,
      date,
      category,
      notes: notes.trim() || null,
      splits: Object.entries(computedSplits).map(([user_id, amt]) => ({
        user_id,
        amount: amt,
        split_type: splitType,
      })),
      receipt: receiptFile,
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: expense.id, ...payload });
        toast.success('Expense updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Expense added');
      }
      onClose?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit expense' : 'Add expense'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <div>
            <label className="label">What for?</label>
            <input
              autoFocus
              className="input"
              placeholder="Dinner at Spice Garden"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_110px] gap-3">
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
          </div>
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Paid by</label>
            <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_id === user?.id ? 'You' : m.profiles?.full_name || m.profiles?.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryEmoji(c)} {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Split method</label>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl border border-border bg-bg-subtle/60">
            {SPLIT_TYPES.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setSplitType(s.id)}
                className={`py-2 rounded-lg text-xs font-medium transition ${
                  splitType === s.id
                    ? 'bg-accent text-bg'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Split between</label>
            <span
              className={`text-xs ${
                splitsValid ? 'text-accent' : numAmount > 0 ? 'text-warning' : 'text-text-muted'
              }`}
            >
              {numAmount > 0
                ? `${splitSum.toFixed(2)} / ${numAmount.toFixed(2)}`
                : 'Enter an amount'}
            </span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {members.map((m) => {
              const checked = participants.has(m.user_id);
              const isYou = m.user_id === user?.id;
              return (
                <div
                  key={m.user_id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                    checked ? 'border-border-strong bg-bg-subtle/60' : 'border-border bg-bg-subtle/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(m.user_id)}
                    className="h-4 w-4 accent-[#00D4AA] shrink-0"
                  />
                  <Avatar name={m.profiles?.full_name} url={m.profiles?.avatar_url} size="sm" />
                  <span className="text-sm flex-1 truncate">
                    {isYou ? 'You' : m.profiles?.full_name || m.profiles?.email}
                  </span>
                  <div className="text-right text-sm">
                    {checked && splitType === 'equal' && (
                      <span className="text-text-muted">{(computedSplits[m.user_id] ?? 0).toFixed(2)}</span>
                    )}
                    {checked && splitType !== 'equal' && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input !w-20 !py-1.5 text-right"
                        placeholder={splitType === 'percent' ? '%' : splitType === 'share' ? 'sh' : '0'}
                        value={splitValues[m.user_id] ?? ''}
                        onChange={(e) =>
                          setSplitValues({ ...splitValues, [m.user_id]: e.target.value })
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Receipt (optional)</label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-border-strong cursor-pointer transition">
            <Upload size={16} className="text-text-muted" />
            <span className="text-sm text-text-muted flex-1 truncate">
              {receiptFile ? receiptFile.name : 'Upload an image'}
            </span>
            {receiptFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setReceiptFile(null);
                }}
                className="p-1 rounded-md hover:bg-white/5"
              >
                <X size={14} />
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input min-h-[60px]"
            placeholder="Anything else…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={400}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || create.isPending || update.isPending}
            className="btn-primary flex-1"
          >
            {create.isPending || update.isPending ? 'Saving…' : isEditing ? 'Update expense' : 'Add expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
