const mongoose = require('mongoose');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.+)/);
const uri = match[1].trim();

async function debug() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Find all users
  const users = await db.collection('users').find({}).project({name:1,email:1}).toArray();
  const lines = [];
  lines.push('=== USERS ===');
  users.forEach(u => lines.push(u._id + ' | ' + u.name + ' | ' + u.email));

  // Find Alex (look for name containing Alex)
  const alex = users.find(u => u.name && u.name.toLowerCase().includes('alex'));
  if (!alex) { lines.push('Alex not found'); fs.writeFileSync('scripts/debug-output.txt', lines.join('\n')); process.exit(1); }
  const userId = alex._id.toString();
  lines.push('\nAlex: ' + userId + ' | ' + alex.name + ' | ' + alex.email);

  const expenses = await db.collection('expenses').find({ isDeleted: false }).toArray();
  const settlements = await db.collection('settlements').find({}).toArray();
  lines.push('Total expenses: ' + expenses.length);
  lines.push('Total settlements: ' + settlements.length);

  // Net balances per person
  const netByPerson = {};
  for (const expense of expenses) {
    const payerId = expense.paidBy?.toString();
    for (const split of expense.splits || []) {
      const splitUserId = split.userId?.toString();
      if (splitUserId && splitUserId !== payerId) {
        if (payerId === userId) {
          netByPerson[splitUserId] = (netByPerson[splitUserId] || 0) + (split.amount || 0);
        } else if (splitUserId === userId) {
          netByPerson[payerId] = (netByPerson[payerId] || 0) - (split.amount || 0);
        }
      }
    }
  }

  lines.push('\n--- Net balances BEFORE settlements ---');
  for (const [personId, net] of Object.entries(netByPerson)) {
    const user = users.find(u => u._id.toString() === personId);
    lines.push('  ' + (user?.name || personId) + ': ' + net.toFixed(2));
  }

  for (const s of settlements) {
    const fromId = s.fromUser?.toString();
    const toId = s.toUser?.toString();
    if (fromId === userId) {
      netByPerson[toId] = (netByPerson[toId] || 0) + (s.amount || 0);
    } else if (toId === userId) {
      netByPerson[fromId] = (netByPerson[fromId] || 0) - (s.amount || 0);
    }
  }

  lines.push('\n--- Net balances AFTER settlements ---');
  let youreOwed = 0, youOwe = 0;
  for (const [personId, net] of Object.entries(netByPerson)) {
    const user = users.find(u => u._id.toString() === personId);
    lines.push('  ' + (user?.name || personId) + ': ' + net.toFixed(2));
    if (net > 0.005) youreOwed += net;
    else if (net < -0.005) youOwe += Math.abs(net);
  }

  lines.push('\n=== EXPECTED DASHBOARD ===');
  lines.push('Owed:    ' + youreOwed.toFixed(2));
  lines.push('Owe:     ' + youOwe.toFixed(2));
  lines.push('Net:     ' + (youreOwed - youOwe).toFixed(2));

  // Per-group
  lines.push('\n=== PER-GROUP ===');
  const groups = await db.collection('groups').find({ 'members.userId': alex._id }).toArray();
  for (const group of groups) {
    const ge = expenses.filter(e => e.groupId?.toString() === group._id.toString());
    const gs = settlements.filter(s => s.groupId?.toString() === group._id.toString());
    const gb = {};
    for (const expense of ge) {
      const payerId = expense.paidBy?.toString();
      for (const split of expense.splits || []) {
        const sid = split.userId?.toString();
        if (sid && sid !== payerId) {
          gb[payerId] = (gb[payerId] || 0) + (split.amount || 0);
          gb[sid] = (gb[sid] || 0) - (split.amount || 0);
        }
      }
    }
    for (const s of gs) {
      gb[s.fromUser?.toString()] = (gb[s.fromUser?.toString()] || 0) + (s.amount || 0);
      gb[s.toUser?.toString()] = (gb[s.toUser?.toString()] || 0) - (s.amount || 0);
    }
    const myBal = gb[userId] || 0;
    lines.push('  ' + group.name + ': ' + (myBal >= 0 ? 'owed ' : 'owes ') + Math.abs(myBal).toFixed(2));
  }

  fs.writeFileSync('scripts/debug-output.txt', lines.join('\n'));
  console.log('Done. Output in scripts/debug-output.txt');
  await mongoose.disconnect();
}

debug().catch(console.error);
