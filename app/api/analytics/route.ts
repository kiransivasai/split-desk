import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';
import Settlement from '@/models/Settlement';
import Group from '@/models/Group';
import { computeGroupBalances } from '@/lib/splitCalculator';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // ── Fetch all groups where user is a member ──
    const userGroups: any[] = await Group.find({ 'members.userId': userId }).select('_id').lean();
    const groupIds = userGroups.map(g => g._id);

    // ── Fetch all expenses & settlements for those groups ──
    const [allExpenses, allSettlements] = await Promise.all([
      Expense.find({ isDeleted: false, groupId: { $in: groupIds } })
        .populate('paidBy', 'name email')
        .populate('splits.userId', 'name email')
        .lean(),
      Settlement.find({ groupId: { $in: groupIds } })
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email')
        .lean(),
    ]);

    // ── Compute per-group balances using the same function as group pages ──
    let youreOwed = 0;
    let youOwe = 0;
    let totalPaid = 0;

    for (const group of userGroups) {
      const gid = group._id.toString();
      const groupExpenses = allExpenses.filter(e => (e as any).groupId?.toString() === gid);
      const groupSettlements = allSettlements.filter(s => (s as any).groupId?.toString() === gid);

      // Use the exact same computeGroupBalances function as the group detail page
      const balances = computeGroupBalances(groupExpenses as any, groupSettlements as any);
      const myBalance = balances[userId] || 0;

      if (myBalance > 0.005) youreOwed += myBalance;
      else if (myBalance < -0.005) youOwe += Math.abs(myBalance);
    }

    // Total paid by user (expenses where user is payer)
    for (const expense of allExpenses) {
      const payerId = (expense as any).paidBy?._id?.toString() || (expense as any).paidBy?.toString();
      if (payerId === userId) {
        totalPaid += (expense as any).amount || 0;
      }
    }

    const netBalance = youreOwed - youOwe;

    // ── Monthly spend trend (last 6 months) — user's share ──
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Expense.aggregate([
      { $match: { isDeleted: false, date: { $gte: sixMonthsAgo } } },
      { $unwind: '$splits' },
      { $addFields: { splitUserStr: { $toString: '$splits.userId' } } },
      { $match: { splitUserStr: userId } },
      { $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$splits.amount' },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // ── Category breakdown — user's share only ──
    const categoryBreakdown = await Expense.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$splits' },
      { $addFields: { splitUserStr: { $toString: '$splits.userId' } } },
      { $match: { splitUserStr: userId } },
      { $group: {
        _id: '$category',
        total: { $sum: '$splits.amount' },
        count: { $sum: 1 },
      }},
      { $sort: { total: -1 } },
    ]);

    return NextResponse.json({
      totalPaid,
      youreOwed,
      youOwe,
      netBalance,
      monthlyTrend,
      categoryBreakdown,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
