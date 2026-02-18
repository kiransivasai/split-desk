// Migration script: Update all expenses and settlements to use INR
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) envVars[key.trim()] = val.join('=').trim();
});

const MONGODB_URI = envVars.MONGODB_URI;

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;

  // Update all expenses to INR
  const expenseResult = await db.collection('expenses').updateMany(
    {},
    { $set: { currency: 'INR' } }
  );
  console.log(`Updated ${expenseResult.modifiedCount} expenses to INR`);

  // Update all settlements to INR
  const settlementResult = await db.collection('settlements').updateMany(
    {},
    { $set: { currency: 'INR' } }
  );
  console.log(`Updated ${settlementResult.modifiedCount} settlements to INR`);

  // Update all users default currency to INR
  const userResult = await db.collection('users').updateMany(
    {},
    { $set: { defaultCurrency: 'INR' } }
  );
  console.log(`Updated ${userResult.modifiedCount} users to INR`);

  // Update all group currency to INR
  const groupResult = await db.collection('groups').updateMany(
    {},
    { $set: { 'totals.currency': 'INR' } }
  );
  console.log(`Updated ${groupResult.modifiedCount} groups to INR`);

  console.log('\nMigration complete! All data now uses INR.');
  await mongoose.disconnect();
}

migrate().catch(err => { console.error(err); process.exit(1); });
