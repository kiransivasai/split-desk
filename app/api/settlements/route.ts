import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Settlement from '@/models/Settlement';
import Expense from '@/models/Expense';
import ActivityLog from '@/models/ActivityLog';
import Group from '@/models/Group';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const groupId = searchParams.get('groupId');

    // Get all groups user is in
    const userGroups = await Group.find({ 'members.userId': currentUserId }).select('_id').lean();
    const myGroupIds = userGroups.map(g => (g._id as any).toString());

    const filter: any = {};
    if (groupId) {
      if (!myGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      filter.groupId = groupId;
    } else {
      filter.groupId = { $in: myGroupIds };
    }

    if (userId) {
      filter.$or = [{ fromUser: userId }, { toUser: userId }];
    }

    const settlements = await Settlement.find(filter)
      .populate('fromUser', 'name email image')
      .populate('toUser', 'name email image')
      .populate('groupId', 'name emoji')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(settlements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const myUserId = (session.user as any).id;

    const data = await req.json();
    
    // Verify membership
    if (data.groupId) {
      const groupCount = await Group.countDocuments({ _id: data.groupId, 'members.userId': myUserId });
      if (groupCount === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const settlement = await Settlement.create(data);

    // Mark related splits as paid
    if (data.coveredSplits?.length) {
      for (const cs of data.coveredSplits) {
        await Expense.updateOne(
          { _id: cs.expenseId, 'splits.userId': data.fromUser },
          { $set: { 'splits.$.isPaid': true, 'splits.$.paidAt': new Date() } }
        );
      }
    }

    // Log activity
    await ActivityLog.create({
      groupId: data.groupId,
      actor: data.fromUser,
      action: 'settlement.created',
      resourceType: 'Settlement',
      resourceId: settlement._id,
      meta: { amount: data.amount, toUser: data.toUser },
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('fromUser', 'name email image')
      .populate('toUser', 'name email image')
      .populate('groupId', 'name emoji')
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
