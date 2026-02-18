import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Expense from '@/models/Expense';
import Settlement from '@/models/Settlement';
import Friendship from '@/models/Friendship';
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

    // 1. Get all accepted friendships for this user
    const friendships = await Friendship.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    }).lean();

    const friendIds = friendships.map((f: any) => 
      f.requester.toString() === userId ? f.recipient.toString() : f.requester.toString()
    );

    // 2. Get all expenses where this user is involved to calculate balances
    // We calculate balances for ALL people we share expenses with, but we'll filter the display list
    const expenses = await Expense.find({
      isDeleted: false,
      $or: [
        { paidBy: userId },
        { 'splits.userId': userId }
      ]
    }).lean();

    const balances: Record<string, number> = {};
    for (const exp of expenses) {
      const paidById = (exp as any).paidBy.toString();
      const splits = (exp as any).splits || [];

      if (paidById === userId) {
        for (const s of splits) {
          const sUserId = (s.userId?._id || s.userId).toString();
          if (sUserId !== userId) {
            balances[sUserId] = (balances[sUserId] || 0) + s.amount;
          }
        }
      } else {
        const mySplit = splits.find((s: any) => (s.userId?._id || s.userId).toString() === userId);
        if (mySplit) {
          balances[paidById] = (balances[paidById] || 0) - mySplit.amount;
        }
      }
    }

    // 3. Get all settlements involving this user to refine balances
    const settlements = await Settlement.find({
      $or: [{ fromUser: userId }, { toUser: userId }]
    }).lean();

    for (const set of settlements) {
      const fromId = set.fromUser.toString();
      const toId = set.toUser.toString();
      const amt = set.amount;

      if (fromId === userId) {
        // I paid someone, so my debt to them decreases or they owe me more
        balances[toId] = (balances[toId] || 0) + amt;
      } else {
        // Someone paid me, so their debt to me decreases or I owe them more
        balances[fromId] = (balances[fromId] || 0) - amt;
      }
    }

    // 4. Get user details for only the accepted friends
    const friendsData = await User.find({ 
      _id: { $in: friendIds } 
    }).select('name email image').lean();
    
    const friends = friendsData.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      image: u.image,
      balance: balances[u._id.toString()] || 0,
      hasExpenses: Object.prototype.hasOwnProperty.call(balances, u._id.toString()),
    }));

    const overallBalance = friends.reduce((sum, f) => sum + f.balance, 0);

    return NextResponse.json({ friends, overallBalance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
