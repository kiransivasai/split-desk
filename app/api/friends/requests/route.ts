import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Friendship from '@/models/Friendship';
import Group from '@/models/Group';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'incoming';

    const filter: any = { status: 'pending' };
    if (type === 'outgoing') {
      filter.requester = userId;
    } else {
      filter.recipient = userId;
    }

    const requests = await Friendship.find(filter)
      .populate(type === 'outgoing' ? 'recipient' : 'requester', 'name email image')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { recipientId } = await req.json();
    if (!recipientId) return NextResponse.json({ error: 'Recipient ID required' }, { status: 400 });

    if (userId === recipientId) {
      return NextResponse.json({ error: 'You cannot add yourself as a friend' }, { status: 400 });
    }

    // 1. Verify they share at least one group
    const commonGroup = await Group.findOne({
      'members.userId': { $all: [userId, recipientId] }
    }).select('_id').lean();

    if (!commonGroup) {
      return NextResponse.json({ error: 'You can only add friends from shared groups' }, { status: 403 });
    }

    // 2. Check for existing friendship/request
    const existing = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: recipientId },
        { requester: recipientId, recipient: userId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ error: 'You are already friends' }, { status: 409 });
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'Request already pending' }, { status: 409 });
      }
      // If rejected, we allow re-requesting
    }

    const friendship = await Friendship.create({
      requester: userId,
      recipient: recipientId,
      status: 'pending'
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
