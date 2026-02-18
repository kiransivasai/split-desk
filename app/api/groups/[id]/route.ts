import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import Expense from '@/models/Expense';
import Settlement from '@/models/Settlement';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const group: any = await Group.findById(params.id)
      .populate('createdBy', 'name email image')
      .populate('members.userId', 'name email image')
      .lean();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member
    const isMember = group.members.some((m: any) => 
      (m.userId?._id || m.userId)?.toString() === userId
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const expenses = await Expense.find({ groupId: params.id, isDeleted: false })
      .populate('paidBy', 'name email image')
      .populate('splits.userId', 'name email image')
      .sort({ date: -1 })
      .lean();

    const settlements = await Settlement.find({ groupId: params.id })
      .populate('fromUser', 'name email image')
      .populate('toUser', 'name email image')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ group, expenses, settlements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const data = await req.json();
    const group = await Group.findByIdAndUpdate(params.id, data, { new: true })
      .populate('createdBy', 'name email image')
      .populate('members.userId', 'name email image')
      .lean();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const group = await Group.findByIdAndDelete(params.id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    // Also soft-delete all expenses in this group
    await Expense.updateMany({ groupId: params.id }, { isDeleted: true });
    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

