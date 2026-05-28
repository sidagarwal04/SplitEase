import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowUpRight } from 'lucide-react';
import { formatMoney } from '../utils/formatters.js';
import CountUp from './CountUp.jsx';

export default function GroupCard({ group, balance = 0, memberCount = 0, currency = 'USD' }) {
  const youAreOwed = balance > 0;
  const youOwe = balance < 0;
  const settled = Math.abs(balance) < 0.01;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Link
        to={`/groups/${group.id}`}
        className="card card-hover block p-5 group relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-bg-subtle to-bg-card border border-border grid place-items-center text-2xl shrink-0">
            {group.emoji || '💸'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="heading text-base truncate">{group.name}</h3>
              <ArrowUpRight
                size={16}
                className="text-text-subtle group-hover:text-accent transition opacity-0 group-hover:opacity-100 shrink-0"
              />
            </div>
            {group.description && (
              <p className="text-xs text-text-muted truncate mt-0.5">{group.description}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-text-subtle">
              <span className="flex items-center gap-1">
                <Users size={12} />
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {settled ? 'All settled' : youAreOwed ? 'You are owed' : 'You owe'}
          </span>
          <span
            className={`font-display font-bold text-base ${
              settled
                ? 'text-text-muted'
                : youAreOwed
                ? 'text-accent'
                : 'text-danger'
            }`}
          >
            <CountUp
              value={Math.abs(balance)}
              formatter={(n) => formatMoney(n, currency)}
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
