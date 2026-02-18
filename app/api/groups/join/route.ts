import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { inviteCode } = await req.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) {
      return NextResponse.json({ error: 'Invalid invite code. No group found.' }, { status: 404 });
    }

    // Check if user is already a member
    const alreadyMember = group.members.some(
      (m: any) => m.userId.toString() === userId && m.isActive
    );
    if (alreadyMember) {
      return NextResponse.json({ error: 'You are already a member of this group', groupId: group._id }, { status: 409 });
    }

    // Add user to group
    group.members.push({ userId, role: 'member', joinedAt: new Date(), isActive: true });
    await group.save();

    return NextResponse.json({ 
      message: 'Successfully joined the group!', 
      groupId: group._id,
      groupName: group.name 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
