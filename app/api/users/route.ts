import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Group from '@/models/Group';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: 'member',
    });

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const myUserId = (session.user as any).id;

    // To prevent leaking all users, only show users who share a group with me
    // or allow searching by email/name (if implemented later)
    const myGroups = await Group.find({ 'members.userId': myUserId }).select('members.userId').lean();
    const fellowMemberIds = new Set();
    myGroups.forEach((g: any) => {
      g.members.forEach((m: any) => fellowMemberIds.add((m.userId?._id || m.userId).toString()));
    });
    
    // Also include myself
    fellowMemberIds.add(myUserId);

    const users = await User.find({ 
      _id: { $in: Array.from(fellowMemberIds) },
      isActive: true 
    }).select('-password').lean();
    
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
