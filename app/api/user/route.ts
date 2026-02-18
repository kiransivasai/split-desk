import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, defaultCurrency, timezone, notifications } = await req.json();

    await connectDB();
    
    // Build update object dynamically to allow partial updates
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (defaultCurrency !== undefined) updateData.defaultCurrency = defaultCurrency;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (notifications !== undefined) updateData.notifications = notifications;

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
