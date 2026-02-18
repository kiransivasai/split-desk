import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Group from '@/models/Group';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const myUserId = (session.user as any).id;

    const expense: any = await Expense.findById(params.id)
      .populate('paidBy', 'name email image')
      .populate('splits.userId', 'name email image')
      .populate('groupId', 'name emoji')
      .lean();

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Verify membership in the group this expense belongs to
    if (expense.groupId) {
      const gid = expense.groupId._id || expense.groupId;
      const groupCount = await Group.countDocuments({ _id: gid, 'members.userId': myUserId });
      if (groupCount === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const myUserId = (session.user as any).id;

    const data = await req.json();

    // First find the existing expense to check its group
    const existingExpense: any = await Expense.findById(params.id).lean();
    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Verify membership in the group
    if (existingExpense.groupId) {
      const groupCount = await Group.countDocuments({ _id: existingExpense.groupId, 'members.userId': myUserId });
      if (groupCount === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const expense = await Expense.findByIdAndUpdate(params.id, data, { new: true })
      .populate('paidBy', 'name email image')
      .populate('splits.userId', 'name email image')
      .populate('groupId', 'name emoji')
      .lean();

    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const myUserId = (session.user as any).id;

    // First find the existing expense to check its group
    const existingExpense: any = await Expense.findById(params.id).lean();
    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Verify membership in the group
    if (existingExpense.groupId) {
      const groupCount = await Group.countDocuments({ _id: existingExpense.groupId, 'members.userId': myUserId });
      if (groupCount === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await Expense.findByIdAndUpdate(
      params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    return NextResponse.json({ message: 'Expense deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
