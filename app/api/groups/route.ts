import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import ActivityLog from '@/models/ActivityLog';
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

    const groups = await Group.find({ 'members.userId': userId })
      .populate('createdBy', 'name email image')
      .populate('members.userId', 'name email image')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const data = await req.json();

    const group = await Group.create({
      ...data,
      members: [
        { userId: data.createdBy, role: 'admin' },
        ...(data.memberIds || []).map((id: string) => ({ userId: id, role: 'member' })),
      ],
    });

    await ActivityLog.create({
      groupId: group._id,
      actor: data.createdBy,
      action: 'group.created',
      resourceType: 'Group',
      resourceId: group._id,
      meta: { name: data.name },
    });

    const populated = await Group.findById(group._id)
      .populate('createdBy', 'name email image')
      .populate('members.userId', 'name email image')
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
