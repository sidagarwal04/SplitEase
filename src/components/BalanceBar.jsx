import { motion } from 'framer-motion';
import { formatMoney } from '../utils/formatters.js';
import CountUp from './CountUp.jsx';

export default function BalanceBar({ owed = 0, owing = 0, currency = 'INR' }) {
  const net = owed - owing;
  const positive = net >= 0;

  return (
    <div className="card p-6 relative overflow-hidden">
      <div
        className={`absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-30 ${
          positive ? 'bg-accent' : 'bg-danger'
        }`}
      />
      <div className="relative">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          {positive ? 'Net balance — you are owed' : 'Net balance — you owe'}
        </p>
        <motion.div
          key={net.toFixed(2)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-1.5 font-display font-extrabold text-4xl tracking-tight ${
            positive ? 'text-accent' : 'text-danger'
          }`}
        >
          <CountUp
            value={Math.abs(net)}
            formatter={(n) => formatMoney(n, currency)}
          />
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="rounded-xl border border-border bg-bg-subtle/60 p-3">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">You're owed</p>
            <p className="font-display font-bold text-lg text-accent mt-1">
              <CountUp value={owed} formatter={(n) => formatMoney(n, currency)} />
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-subtle/60 p-3">
            <p className="text-[11px] uppercase tracking-wider text-text-muted">You owe</p>
            <p className="font-display font-bold text-lg text-danger mt-1">
              <CountUp value={owing} formatter={(n) => formatMoney(n, currency)} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
