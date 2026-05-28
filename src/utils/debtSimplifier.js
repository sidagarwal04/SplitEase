// Greedy min/max debt simplification.
// Given a list of net balances per user (positive = owed money, negative = owes money),
// produce a minimal-ish list of transactions that settles every balance.
//
// Input:  balances = { userId: netAmount, ... }
// Output: [{ from, to, amount }]

export function simplifyDebts(balances, { precision = 2 } = {}) {
  const factor = 10 ** precision;
  const round = (n) => Math.round(n * factor) / factor;

  const creditors = []; // people owed money (positive)
  const debtors = []; // people who owe money (negative)

  for (const [userId, raw] of Object.entries(balances)) {
    const amount = round(raw);
    if (amount > 0) creditors.push({ userId, amount });
    else if (amount < 0) debtors.push({ userId, amount: -amount });
  }

  // Use sorted arrays as poor-man's heaps; works well for typical group sizes.
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  while (creditors.length && debtors.length) {
    const c = creditors[0];
    const d = debtors[0];
    const pay = round(Math.min(c.amount, d.amount));

    if (pay > 0) {
      transactions.push({ from: d.userId, to: c.userId, amount: pay });
    }

    c.amount = round(c.amount - pay);
    d.amount = round(d.amount - pay);

    if (c.amount <= 0) creditors.shift();
    if (d.amount <= 0) debtors.shift();

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
  }

  return transactions;
}

// Compute net balances from a list of expenses (with splits) and settlements.
// Each expense: { paid_by, amount, expense_splits: [{ user_id, amount }] }
// Each settlement: { from_user_id, to_user_id, amount }
export function computeNetBalances(expenses = [], settlements = []) {
  const balances = {};
  const bump = (uid, delta) => {
    if (!uid) return;
    balances[uid] = (balances[uid] ?? 0) + delta;
  };

  for (const e of expenses) {
    const amount = Number(e.amount) || 0;
    bump(e.paid_by, amount);
    for (const s of e.expense_splits ?? []) {
      bump(s.user_id, -Number(s.amount || 0));
    }
  }

  for (const s of settlements) {
    const amount = Number(s.amount) || 0;
    bump(s.from_user_id, amount); // they paid, so reduce their debt
    bump(s.to_user_id, -amount); // creditor received money, reduce their credit
  }

  return balances;
}
