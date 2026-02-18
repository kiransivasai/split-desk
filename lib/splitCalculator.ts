export function calculateSplits(
  amount: number,
  method: 'equal' | 'percentage' | 'exact' | 'shares',
  participants: { userId: string; percentage?: number; exactAmount?: number; shares?: number }[]
) {
  if (method === 'equal') {
    const totalPennies = Math.round(amount * 100);
    const count = participants.length;
    const basePennies = Math.floor(totalPennies / count);
    const remainder = totalPennies % count;

    return participants.map((p, i) => ({
      userId: p.userId,
      amount: (basePennies + (i < remainder ? 1 : 0)) / 100,
    }));
  }

  if (method === 'percentage') {
    return participants.map(p => ({
      userId: p.userId,
      amount: Number((amount * (p.percentage || 0) / 100).toFixed(2)),
      percentage: p.percentage,
    }));
  }

  if (method === 'exact') {
    return participants.map(p => ({
      userId: p.userId,
      amount: p.exactAmount || 0,
    }));
  }

  if (method === 'shares') {
    const totalShares = participants.reduce((s, p) => s + (p.shares || 0), 0);
    if (totalShares === 0) return participants.map(p => ({ userId: p.userId, amount: 0 }));
    return participants.map(p => ({
      userId: p.userId,
      amount: Number((amount * (p.shares || 0) / totalShares).toFixed(2)),
      shares: p.shares,
    }));
  }

  return [];
}

export function computeGroupBalances(
  expenses: Array<{
    paidBy: string;
    amount: number;
    splits: Array<{ userId: string; amount: number; isPaid: boolean }>;
  }>,
  settlements: Array<{ fromUser: string; toUser: string; amount: number }>
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Process expenses
  for (const expense of expenses) {
    const payerId = typeof expense.paidBy === 'string' ? expense.paidBy : (expense.paidBy as any)._id?.toString();
    for (const split of expense.splits) {
      const splitUserId = typeof split.userId === 'string' ? split.userId : (split.userId as any)._id?.toString();
      if (splitUserId !== payerId) {
        // This person owes the payer
        balances[payerId] = (balances[payerId] || 0) + split.amount;
        balances[splitUserId] = (balances[splitUserId] || 0) - split.amount;
      }
    }
  }

  // Process settlements
  for (const s of settlements) {
    const fromId = typeof s.fromUser === 'string' ? s.fromUser : (s.fromUser as any)._id?.toString();
    const toId = typeof s.toUser === 'string' ? s.toUser : (s.toUser as any)._id?.toString();
    balances[fromId] = (balances[fromId] || 0) + s.amount;
    balances[toId] = (balances[toId] || 0) - s.amount;
  }

  return balances;
}

export function minimizeTransactions(balances: Record<string, number>) {
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0.01)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ id: k, amount: v }));
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -0.01)
    .sort((a, b) => a[1] - b[1])
    .map(([k, v]) => ({ id: k, amount: Math.abs(v) }));

  const transactions: Array<{ from: string; to: string; amount: number }> = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].amount, debtors[j].amount);
    transactions.push({
      from: debtors[j].id,
      to: creditors[i].id,
      amount: Number(amount.toFixed(2)),
    });
    creditors[i].amount -= amount;
    debtors[j].amount -= amount;
    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01) j++;
  }

  return transactions;
}
