import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';
import ActivityLog from '@/models/ActivityLog';
import Group from '@/models/Group';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const myUserId = (session.user as any).id;

    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const paidBy = searchParams.get('paidBy');

    // Get all groups user is a member of
    const userGroups = await Group.find({ 'members.userId': myUserId }).select('_id').lean();
    const myGroupIds = userGroups.map(g => (g._id as any).toString());

    const filter: any = { isDeleted: false };
    
    if (groupId) {
      if (!myGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      filter.groupId = groupId;
    } else {
      // Default to showing expenses from all my groups
      filter.groupId = { $in: myGroupIds };
    }

    if (userId) filter['splits.userId'] = userId;
    if (paidBy) filter.paidBy = paidBy;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name email image')
      .populate('splits.userId', 'name email image')
      .populate('groupId', 'name emoji')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      expenses,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const expense = await Expense.create({
      ...data,
      createdBy: data.paidBy || myUserId,
    });

    // Update group total
    if (data.groupId) {
      await Group.findByIdAndUpdate(data.groupId, {
        $inc: { 'totals.totalSpent': data.amount },
      });
    }

    // Log activity
    await ActivityLog.create({
      groupId: data.groupId,
      actor: data.paidBy,
      action: 'expense.created',
      resourceType: 'Expense',
      resourceId: expense._id,
      meta: { description: data.description, amount: data.amount },
    });

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email image')
      .populate('splits.userId', 'name email image')
      .populate('groupId', 'name emoji')
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
