import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';
import Settlement from '@/models/Settlement';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Group from '@/models/Group';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30');

    // Get all groups user is in to filter activity by group membership as well
    const userGroups = await Group.find({ 'members.userId': userId }).select('_id').lean();
    const groupIds = userGroups.map(g => g._id);

    // Get recent expenses involving this user
    const expenseFilter: any = { 
      isDeleted: false,
      groupId: { $in: groupIds }
    };

    const expenses = await Expense.find(expenseFilter)
      .populate('paidBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('splits.userId', 'name email')
      .populate('groupId', 'name emoji')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const settlementFilter: any = {
      groupId: { $in: groupIds }
    };
    if (userId) {
      settlementFilter.$or = [{ fromUser: userId }, { toUser: userId }];
    }

    const settlements = await Settlement.find(settlementFilter)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('groupId', 'name emoji')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const activities: any[] = [];

    for (const exp of expenses) {
      const e = exp as any;
      const mySplit = userId ? (e.splits || []).find((s: any) => (s.userId?._id || s.userId)?.toString() === userId) : null;
      const iPaid = e.paidBy?._id?.toString() === userId;
      let statusText = '';
      let statusColor = '';
      if (userId) {
        if (iPaid) {
          const lent = e.amount - (mySplit?.amount || 0);
          statusText = lent > 0 ? `You get back ₹${lent.toFixed(2)}` : '';
          statusColor = 'green';
        } else if (mySplit) {
          statusText = `You owe ₹${mySplit.amount.toFixed(2)}`;
          statusColor = 'red';
        }
      }

      const isCreator = e.createdBy?._id?.toString() === userId;
      // Check if updated at least 1 second after creation to count as an edit
      const createdTime = new Date(e.createdAt).getTime();
      const updatedTime = new Date(e.updatedAt).getTime();
      const wasUpdated = updatedTime > createdTime + 1000; 
      const actor = isCreator ? 'You' : (e.createdBy?.name || e.paidBy?.name || 'Someone');
      const action = wasUpdated ? 'updated' : 'added';

      activities.push({
        type: 'expense',
        date: e.updatedAt || e.createdAt,
        title: `${actor} ${action} "${e.description}"${e.groupId ? ` in "${e.groupId.name}"` : ''}.`,
        status: statusText,
        statusColor,
        category: e.category,
        amount: e.amount,
        id: e._id,
      });
    }

    for (const s of settlements) {
      const st = s as any;
      const iAmFrom = st.fromUser?._id?.toString() === userId;
      const iAmTo = st.toUser?._id?.toString() === userId;
      const fromName = iAmFrom ? 'You' : (st.fromUser?.name || 'Someone');
      const toName = iAmTo ? 'You' : (st.toUser?.name || 'Someone');

      activities.push({
        type: 'settlement',
        date: st.createdAt,
        title: `${fromName} paid ${toName}${st.groupId ? ` in "${st.groupId.name}"` : ''}.`,
        status: iAmFrom ? `You paid ₹${st.amount.toFixed(2)}` : `You received ₹${st.amount.toFixed(2)}`,
        statusColor: iAmFrom ? 'red' : 'green',
        category: 'settlement',
        amount: st.amount,
        id: st._id,
      });
    }

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(activities.slice(0, limit));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
