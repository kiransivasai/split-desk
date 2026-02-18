// Migration: add invite codes to existing groups that don't have one
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) envVars[key.trim()] = val.join('=').trim();
});

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function migrate() {
  await mongoose.connect(envVars.MONGODB_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db!;
  const groups = await db.collection('groups').find({ inviteCode: { $exists: false } }).toArray();
  console.log(`Found ${groups.length} groups without invite codes`);
  
  for (const group of groups) {
    const code = generateInviteCode();
    await db.collection('groups').updateOne({ _id: group._id }, { $set: { inviteCode: code, simplifyDebts: true } });
    console.log(`  ${group.name} → ${code}`);
  }
  
  console.log('Done!');
  await mongoose.disconnect();
}

migrate().catch(err => { console.error(err); process.exit(1); });
