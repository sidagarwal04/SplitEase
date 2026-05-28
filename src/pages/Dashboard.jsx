import { useState } from 'react';
import { Plus, Sparkles, Users } from 'lucide-react';
import PageTransition from '../components/PageTransition.jsx';
import BalanceBar from '../components/BalanceBar.jsx';
import GroupCard from '../components/GroupCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CreateGroupModal from '../components/CreateGroupModal.jsx';
import { useGroups } from '../hooks/useGroups.js';
import { useOverallBalance } from '../hooks/useBalances.js';
import { useAuth } from '../lib/auth.jsx';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { data: groups = [], isLoading } = useGroups();
  const { data: overall } = useOverallBalance();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <PageTransition className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-text-muted text-sm">
              {greeting()},{' '}
              <span className="text-text">
                {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'friend'}
              </span>
            </p>
            <h1 className="heading text-3xl sm:text-4xl mt-1">Your money, in balance.</h1>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary hidden sm:inline-flex">
            <Plus size={16} />
            New group
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-8">
        <BalanceBar owed={overall?.owed ?? 0} owing={overall?.owing ?? 0} />
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-secondary mb-3">
              <Sparkles size={16} />
              <p className="text-xs uppercase tracking-wider font-semibold">Tip</p>
            </div>
            <h3 className="heading text-lg mb-1">Make life easier.</h3>
            <p className="text-sm text-text-muted">
              Add a group for each shared context — trip, flatmates, lunch crew — and OweNow keeps every receipt, share and IOU tidy.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-xl">Your groups</h2>
          <span className="chip">
            <Users size={12} />
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title="No groups yet"
            message="Create your first group to start splitting expenses."
            action={
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus size={16} />
                Create your first group
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                balance={overall?.perGroup?.[g.id] ?? 0}
                memberCount={g.members?.length ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageTransition>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
