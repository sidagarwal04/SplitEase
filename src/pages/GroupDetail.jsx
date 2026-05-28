import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  HandCoins,
  UserPlus,
  LogOut,
  ChevronDown,
  Receipt,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

import PageTransition from '../components/PageTransition.jsx';
import Avatar from '../components/Avatar.jsx';
import ExpenseItem from '../components/ExpenseItem.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AddExpenseModal from '../components/AddExpenseModal.jsx';
import SettleUpModal from '../components/SettleUpModal.jsx';
import InviteMemberModal from '../components/InviteMemberModal.jsx';
import CountUp from '../components/CountUp.jsx';

import { useGroup, useLeaveGroup } from '../hooks/useGroups.js';
import { useExpenses, useGroupRealtime, useSettlements } from '../hooks/useExpenses.js';
import { useGroupBalances } from '../hooks/useBalances.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORIES, categoryEmoji, formatDate, formatMoney, fromNow } from '../utils/formatters.js';
import toast from 'react-hot-toast';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useGroupRealtime(groupId);

  const { data: group, isLoading: lG } = useGroup(groupId);
  const { data: expenses = [], isLoading: lE } = useExpenses(groupId);
  const { data: settlements = [] } = useSettlements(groupId);
  const { balances, transactions } = useGroupBalances(groupId);
  const leave = useLeaveGroup();

  const [tab, setTab] = useState('expenses');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleSuggestion, setSettleSuggestion] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [filterMember, setFilterMember] = useState('all');

  const members = group?.group_members ?? [];
  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m])), [members]);
  const userBalance = balances[user?.id] ?? 0;

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCat !== 'all' && e.category !== filterCat) return false;
      if (filterMember !== 'all' && e.paid_by !== filterMember) return false;
      return true;
    });
  }, [expenses, filterCat, filterMember]);

  const handleLeave = async () => {
    if (!confirm('Leave this group? Your balances should be settled first.')) return;
    try {
      await leave.mutateAsync(groupId);
      toast.success('You left the group');
      navigate('/');
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (lG) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="skeleton h-10 w-40 mb-4" />
        <div className="skeleton h-32 w-full mb-6 rounded-2xl" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <PageTransition className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <EmptyState
          title="Group not found"
          message="It might have been deleted or you're no longer a member."
          action={<Link to="/" className="btn-primary">Go home</Link>}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text text-sm transition mb-5">
        <ArrowLeft size={16} />
        All groups
      </Link>

      <div className="card p-6 mb-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-bg-subtle border border-border grid place-items-center text-3xl shrink-0">
            {group.emoji || '💸'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="heading text-2xl truncate">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-text-muted mt-0.5">{group.description}</p>
            )}
            <div className="flex items-center gap-2 mt-3 -space-x-2">
              {members.slice(0, 6).map((m) => (
                <Avatar
                  key={m.user_id}
                  name={m.profiles?.full_name}
                  url={m.profiles?.avatar_url}
                  size="sm"
                  className="ring-2 ring-bg-card"
                />
              ))}
              {members.length > 6 && (
                <div className="h-8 w-8 rounded-full bg-bg-subtle border border-border grid place-items-center text-[10px] text-text-muted ring-2 ring-bg-card">
                  +{members.length - 6}
                </div>
              )}
              <button
                onClick={() => setInviteOpen(true)}
                className="ml-3 chip hover:border-accent/40 hover:text-accent transition"
              >
                <UserPlus size={12} />
                Invite
              </button>
            </div>
          </div>
          <button
            onClick={handleLeave}
            className="p-2 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition shrink-0"
            title="Leave group"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="relative grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-border">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Your balance</p>
            <div
              className={`font-display font-bold text-2xl mt-1 ${
                Math.abs(userBalance) < 0.01
                  ? 'text-text-muted'
                  : userBalance > 0
                  ? 'text-accent'
                  : 'text-danger'
              }`}
            >
              <CountUp
                value={Math.abs(userBalance)}
                formatter={(n) =>
                  Math.abs(userBalance) < 0.01
                    ? 'All settled'
                    : `${userBalance > 0 ? 'Owed ' : 'Owe '}${formatMoney(n)}`
                }
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-end justify-end">
            <button
              onClick={() => {
                setSettleSuggestion(null);
                setSettleOpen(true);
              }}
              className="btn-secondary w-full sm:w-auto"
            >
              <HandCoins size={16} />
              Settle up
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setAddOpen(true);
              }}
              className="btn-primary w-full sm:w-auto"
            >
              <Plus size={16} />
              Add expense
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl border border-border bg-bg-subtle/60 mb-5 max-w-md">
        {[
          { id: 'expenses', label: 'Expenses' },
          { id: 'balances', label: 'Balances' },
          { id: 'activity', label: 'Activity' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-accent text-bg' : 'text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'expenses' && (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <ExpenseFilters
              category={filterCat}
              setCategory={setFilterCat}
              member={filterMember}
              setMember={setFilterMember}
              members={members}
            />
            {lE ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-16 w-full rounded-2xl" />
              ))
            ) : filteredExpenses.length === 0 ? (
              <EmptyState
                icon={<Receipt size={22} />}
                title={expenses.length === 0 ? 'No expenses yet' : 'No matches'}
                message={
                  expenses.length === 0
                    ? 'Add your first expense to start splitting.'
                    : 'Try adjusting your filters.'
                }
              />
            ) : (
              <AnimatePresence initial={false}>
                {filteredExpenses.map((e) => (
                  <ExpenseItem
                    key={e.id}
                    expense={e}
                    members={members}
                    onEdit={(exp) => {
                      setEditing(exp);
                      setAddOpen(true);
                    }}
                  />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {tab === 'balances' && (
          <motion.div
            key="balances"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="card p-5">
              <h3 className="heading text-base mb-3">Net balances</h3>
              <div className="space-y-2">
                {members.map((m) => {
                  const bal = balances[m.user_id] ?? 0;
                  const settled = Math.abs(bal) < 0.01;
                  return (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-subtle/40"
                    >
                      <Avatar name={m.profiles?.full_name} url={m.profiles?.avatar_url} size="sm" />
                      <span className="text-sm flex-1 truncate">
                        {m.user_id === user?.id ? 'You' : m.profiles?.full_name || m.profiles?.email}
                      </span>
                      <span
                        className={`font-display font-bold text-sm ${
                          settled ? 'text-text-muted' : bal > 0 ? 'text-accent' : 'text-danger'
                        }`}
                      >
                        {settled
                          ? 'settled'
                          : `${bal > 0 ? 'gets back ' : 'owes '}${formatMoney(Math.abs(bal))}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3 text-secondary">
                <Sparkles size={16} />
                <h3 className="heading text-base !text-text">Suggested settlements</h3>
              </div>
              {transactions.length === 0 ? (
                <p className="text-sm text-text-muted">Everything's squared away. ✨</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((t, i) => {
                    const from = memberMap[t.from];
                    const to = memberMap[t.to];
                    const involvesYou = t.from === user?.id || t.to === user?.id;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setSettleSuggestion(t);
                          setSettleOpen(true);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                          involvesYou
                            ? 'border-accent/30 bg-accent/5 hover:border-accent/60'
                            : 'border-border bg-bg-subtle/40 hover:border-border-strong'
                        }`}
                      >
                        <Avatar name={from?.profiles?.full_name} url={from?.profiles?.avatar_url} size="sm" />
                        <span className="text-sm truncate min-w-0">
                          {t.from === user?.id ? 'You' : from?.profiles?.full_name?.split(' ')[0]}
                        </span>
                        <ArrowRight size={14} className="text-accent shrink-0" />
                        <Avatar name={to?.profiles?.full_name} url={to?.profiles?.avatar_url} size="sm" />
                        <span className="text-sm truncate min-w-0 flex-1">
                          {t.to === user?.id ? 'You' : to?.profiles?.full_name?.split(' ')[0]}
                        </span>
                        <span className="font-display font-bold text-sm text-accent shrink-0">
                          {formatMoney(t.amount)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {[...expenses
              .map((e) => ({ kind: 'expense', at: e.created_at, data: e }))
              .concat(
                settlements.map((s) => ({ kind: 'settlement', at: s.settled_at, data: s }))
              )]
              .sort((a, b) => new Date(b.at) - new Date(a.at))
              .map((item, i) => (
                <ActivityRow key={i} item={item} members={members} />
              ))}

            {expenses.length === 0 && settlements.length === 0 && (
              <EmptyState
                title="Nothing here yet"
                message="Once expenses and settlements start happening, you'll see the timeline here."
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AddExpenseModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        group={group}
        members={members}
        expense={editing}
      />
      <SettleUpModal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        group={group}
        members={members}
        suggested={settleSuggestion}
      />
      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        group={group}
      />
    </PageTransition>
  );
}

function ExpenseFilters({ category, setCategory, member, setMember, members }) {
  const [open, setOpen] = useState(false);
  const active = category !== 'all' || member !== 'all';

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`btn-ghost !py-1.5 !px-3 text-xs ${active ? 'border-accent/30 text-accent' : ''}`}
      >
        <Filter size={12} />
        Filters {active && '•'}
        <ChevronDown size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <div>
            <label className="label">Category</label>
            <select className="input !py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryEmoji(c)} {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Paid by</label>
            <select className="input !py-2" value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="all">Anyone</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.full_name || m.profiles?.email}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ActivityRow({ item, members }) {
  const find = (uid) => members.find((m) => m.user_id === uid);
  if (item.kind === 'expense') {
    const e = item.data;
    const payer = find(e.paid_by);
    return (
      <div className="card p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-secondary/10 grid place-items-center text-base">
          {categoryEmoji(e.category)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="text-text-muted">
              {payer?.profiles?.full_name?.split(' ')[0] || 'Someone'} added
            </span>{' '}
            <span className="text-text font-medium">{e.title}</span>
          </p>
          <p className="text-[11px] text-text-subtle">{fromNow(e.created_at)}</p>
        </div>
        <span className="font-display font-bold text-sm">{formatMoney(e.amount, e.currency)}</span>
      </div>
    );
  }
  const s = item.data;
  const from = find(s.from_user_id);
  const to = find(s.to_user_id);
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-accent/10 grid place-items-center text-accent">
        <HandCoins size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="text-text font-medium">
            {from?.profiles?.full_name?.split(' ')[0] || 'Someone'}
          </span>{' '}
          <span className="text-text-muted">paid</span>{' '}
          <span className="text-text font-medium">
            {to?.profiles?.full_name?.split(' ')[0] || 'someone'}
          </span>
        </p>
        <p className="text-[11px] text-text-subtle">{fromNow(s.settled_at)}</p>
      </div>
      <span className="font-display font-bold text-sm text-accent">
        {formatMoney(s.amount)}
      </span>
    </div>
  );
}
